"""
Rankings API Endpoints

Handles retrieving ranked candidates for specific jobs, fetching top-scoring candidates
across all jobs, and triggering manual recalculation of candidate ranks (HR only).
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func

from models.database import get_db
from models.models import User, Candidate, Job, Ranking, CandidateSkill, Resume
from utils.auth import get_current_hr_user
from services.ranking_service import RankingService

router = APIRouter(prefix="/api/rankings", tags=["rankings"])
ranking_service = RankingService()

@router.get("/job/{job_id}")
async def get_job_rankings(
    job_id: int,
    current_hr: User = Depends(get_current_hr_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve the ranked list of candidates for a specific job (HR only)."""
    # Verify job exists
    job_check = await db.execute(select(Job).where(Job.id == job_id))
    if not job_check.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job posting not found."
        )

    result = await db.execute(
        select(Ranking)
        .options(selectinload(Ranking.candidate).selectinload(Candidate.user))
        .where(Ranking.job_id == job_id)
        .order_by(Ranking.overall_score.desc())
    )
    rankings = result.scalars().all()

    return [{
        "rank_id": r.id,
        "candidate_id": r.candidate_id,
        "candidate_name": r.candidate.user.full_name,
        "current_title": r.candidate.current_title,
        "resume_score": r.resume_score,
        "skill_match_score": r.skill_match_score,
        "experience_score": r.experience_score,
        "interview_score": r.interview_score,
        "overall_score": r.overall_score,
        "recommendation": r.recommendation,
        "ranked_at": r.ranked_at
    } for r in rankings]

@router.get("/top")
async def get_top_candidates(
    limit: int = 10,
    current_hr: User = Depends(get_current_hr_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve top candidate profiles across all job postings,
    filtered by their highest overall score (HR only).
    """
    # Subquery to find the maximum overall score per candidate
    subq = (
        select(
            Ranking.candidate_id,
            func.max(Ranking.overall_score).label("max_score")
        )
        .group_by(Ranking.candidate_id)
        .subquery()
    )

    # Query the rankings matching those maximum scores, joining Candidate and User info
    result = await db.execute(
        select(Ranking)
        .join(subq, (Ranking.candidate_id == subq.c.candidate_id) & (Ranking.overall_score == subq.c.max_score))
        .options(
            selectinload(Ranking.candidate).selectinload(Candidate.user),
            selectinload(Ranking.job)
        )
        .order_by(Ranking.overall_score.desc())
        .limit(limit)
    )
    top_rankings = result.scalars().all()

    # Deduplicate in case a candidate has the same max score for multiple jobs
    seen_candidates = set()
    response = []
    
    for r in top_rankings:
        if r.candidate_id in seen_candidates:
            continue
        seen_candidates.add(r.candidate_id)
        
        response.append({
            "candidate_id": r.candidate_id,
            "candidate_name": r.candidate.user.full_name,
            "current_title": r.candidate.current_title,
            "best_job_match": r.job.title,
            "best_job_company": r.job.company,
            "resume_score": r.resume_score,
            "skill_match_score": r.skill_match_score,
            "experience_score": r.experience_score,
            "interview_score": r.interview_score,
            "overall_score": r.overall_score,
            "recommendation": r.recommendation
        })
        
    return response

@router.post("/calculate/{job_id}")
async def recalculate_job_rankings(
    job_id: int,
    current_hr: User = Depends(get_current_hr_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Recalculate match and ranking scores for all candidates matched to this job (HR only).
    Useful after skills, resumes, or interview scores have updated.
    """
    # 1. Fetch Job
    job_query = await db.execute(select(Job).where(Job.id == job_id))
    job = job_query.scalar_one_or_none()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job posting not found."
        )

    # 2. Fetch all candidates
    candidates_query = await db.execute(select(Candidate).options(selectinload(Candidate.user)))
    all_candidates = candidates_query.scalars().all()
    
    # 3. Import backend matching endpoint functionality locally to reuse the calculation logic
    # and update/re-save database entries
    from services.matching_engine import MatchingEngine
    matching_engine = MatchingEngine()

    recalculated = []
    for cand in all_candidates:
        # Fetch their skills
        skills_query = await db.execute(
            select(CandidateSkill)
            .options(selectinload(CandidateSkill.skill))
            .where(CandidateSkill.candidate_id == cand.id)
        )
        cand_skills = [cs.skill.name for cs in skills_query.scalars().all()]
        if not cand_skills:
            continue  # skip if no resume/skills uploaded yet

        # Fetch latest resume
        resume_query = await db.execute(
            select(Resume)
            .where(Resume.candidate_id == cand.id)
            .order_by(Resume.uploaded_at.desc())
            .limit(1)
        )
        latest_resume = resume_query.scalar_one_or_none()
        parsed_resume = latest_resume.parsed_data if latest_resume else {}

        # Run match calculations
        job_dict = {
            "id": job.id,
            "title": job.title,
            "company": job.company,
            "description": job.description,
            "required_skills": job.required_skills,
            "min_experience": job.min_experience
        }
        
        match = matching_engine.match_candidate_to_job(
            candidate_skills=cand_skills,
            candidate_experience=cand.years_experience,
            candidate_education=cand.education or "",
            job=job_dict
        )

        resume_score = ranking_service.calculate_resume_score(parsed_resume)
        skill_score = match["skills_score"]
        exp_score = match["experience_score"]

        # Fetch existing interview score
        exist_query = await db.execute(
            select(Ranking).where(Ranking.candidate_id == cand.id, Ranking.job_id == job_id)
        )
        existing_ranking = exist_query.scalar_one_or_none()
        interview_score = existing_ranking.interview_score if existing_ranking else 0.0

        overall_score = ranking_service.calculate_overall_score(
            resume_score=resume_score,
            skill_score=skill_score,
            experience_score=exp_score,
            interview_score=interview_score
        )
        
        recommendation = ranking_service.get_recommendation(overall_score)

        if existing_ranking:
            existing_ranking.resume_score = resume_score
            existing_ranking.skill_match_score = skill_score
            existing_ranking.experience_score = exp_score
            existing_ranking.overall_score = overall_score
            existing_ranking.recommendation = recommendation
        else:
            new_ranking = Ranking(
                candidate_id=cand.id,
                job_id=job_id,
                resume_score=resume_score,
                skill_match_score=skill_score,
                experience_score=exp_score,
                interview_score=interview_score,
                overall_score=overall_score,
                recommendation=recommendation
            )
            db.add(new_ranking)

        recalculated.append({
            "candidate_id": cand.id,
            "candidate_name": cand.user.full_name,
            "overall_score": overall_score,
            "recommendation": recommendation
        })

    await db.commit()
    
    # Sort recalculated by overall score descending
    recalculated.sort(key=lambda x: x["overall_score"], reverse=True)
    return recalculated
