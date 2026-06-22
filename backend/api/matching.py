"""
Matching API Endpoints

Calculates compatibility scores between candidates and active job openings,
saves or updates ranking statistics, and fetches sorted candidate matches.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from models.database import get_db
from models.models import User, Candidate, Job, Ranking, CandidateSkill, Resume
from utils.auth import get_current_user, get_current_hr_user
from services.matching_engine import MatchingEngine
from services.ranking_service import RankingService

router = APIRouter(prefix="/api/matching", tags=["matching"])

matching_engine = MatchingEngine()
ranking_service = RankingService()

@router.post("/candidate/{candidate_id}")
async def match_candidate(
    candidate_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Match candidate against all active jobs.
    Computes scores, updates the rankings table, and returns matches.
    """
    # 1. Fetch Candidate and check auth
    cand_query = await db.execute(select(Candidate).where(Candidate.id == candidate_id))
    candidate = cand_query.scalar_one_or_none()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate profile not found."
        )

    # Candidate can only match for themselves
    if current_user.role == "candidate" and candidate.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Cannot match other profiles."
        )

    # 2. Get candidate's skills from candidate_skills table
    skills_query = await db.execute(
        select(CandidateSkill)
        .options(selectinload(CandidateSkill.skill))
        .where(CandidateSkill.candidate_id == candidate_id)
    )
    candidate_skills = [cs.skill.name for cs in skills_query.scalars().all()]

    # 3. Get candidate's parsed resume for resume_score
    resume_query = await db.execute(
        select(Resume)
        .where(Resume.candidate_id == candidate_id)
        .order_by(Resume.uploaded_at.desc())
        .limit(1)
    )
    latest_resume = resume_query.scalar_one_or_none()
    parsed_resume = latest_resume.parsed_data if latest_resume else {}

    # 4. Fetch all active jobs
    jobs_query = await db.execute(select(Job).where(Job.status == "active"))
    active_jobs = jobs_query.scalars().all()

    if not active_jobs:
        return []

    # 5. Compute matches
    match_results = []
    for job in active_jobs:
        # Convert job object to dict for matching engine
        job_dict = {
            "id": job.id,
            "title": job.title,
            "company": job.company,
            "description": job.description,
            "required_skills": job.required_skills,
            "min_experience": job.min_experience
        }
        
        # Calculate matching scores
        match = matching_engine.match_candidate_to_job(
            candidate_skills=candidate_skills,
            candidate_experience=candidate.years_experience,
            candidate_education=candidate.education or "",
            job=job_dict
        )

        # 6. Calculate details via ranking service
        resume_score = ranking_service.calculate_resume_score(parsed_resume)
        skill_score = match["skills_score"]
        exp_score = match["experience_score"]
        
        # If there's an existing ranking, retrieve its interview score
        exist_query = await db.execute(
            select(Ranking).where(Ranking.candidate_id == candidate_id, Ranking.job_id == job.id)
        )
        existing_ranking = exist_query.scalar_one_or_none()
        interview_score = existing_ranking.interview_score if existing_ranking else 0.0  # default baseline

        overall_score = ranking_service.calculate_overall_score(
            resume_score=resume_score,
            skill_score=skill_score,
            experience_score=exp_score,
            interview_score=interview_score
        )
        
        recommendation = ranking_service.get_recommendation(overall_score)

        # 7. Upsert Ranking entry
        if existing_ranking:
            existing_ranking.resume_score = resume_score
            existing_ranking.skill_match_score = skill_score
            existing_ranking.experience_score = exp_score
            existing_ranking.overall_score = overall_score
            existing_ranking.recommendation = recommendation
        else:
            new_ranking = Ranking(
                candidate_id=candidate_id,
                job_id=job.id,
                resume_score=resume_score,
                skill_match_score=skill_score,
                experience_score=exp_score,
                interview_score=interview_score,
                overall_score=overall_score,
                recommendation=recommendation
            )
            db.add(new_ranking)

        # Add overall details to returned payload
        match["overall_score"] = overall_score
        match["resume_score"] = resume_score
        match["interview_score"] = interview_score
        match_results.append(match)

    await db.commit()
    
    # Sort results by overall score descending
    match_results.sort(key=lambda x: x["overall_score"], reverse=True)
    return match_results

@router.get("/candidate/{candidate_id}/jobs")
async def get_candidate_matches(
    candidate_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve saved job matches for a specific candidate sorted by overall score."""
    # Auth check
    if current_user.role == "candidate":
        cand_query = await db.execute(select(Candidate).where(Candidate.user_id == current_user.id))
        candidate = cand_query.scalar_one_or_none()
        if not candidate or candidate.id != candidate_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied."
            )

    result = await db.execute(
        select(Ranking)
        .options(selectinload(Ranking.job))
        .where(Ranking.candidate_id == candidate_id)
        .order_by(Ranking.overall_score.desc())
    )
    rankings = result.scalars().all()
    
    return [{
        "job_id": r.job_id,
        "job_title": r.job.title,
        "company": r.job.company,
        "location": r.job.location,
        "salary_range": r.job.salary_range,
        "overall_score": r.overall_score,
        "resume_score": r.resume_score,
        "skill_match_score": r.skill_match_score,
        "experience_score": r.experience_score,
        "interview_score": r.interview_score,
        "recommendation": r.recommendation,
        "ranked_at": r.ranked_at
    } for r in rankings]

@router.get("/job/{job_id}/candidates")
async def get_job_candidates(
    job_id: int,
    current_hr: User = Depends(get_current_hr_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve all candidates matched to a specific job posting (HR only)."""
    # Fetch all rankings for the job, loading candidate user info
    result = await db.execute(
        select(Ranking)
        .options(
            selectinload(Ranking.candidate).selectinload(Candidate.user)
        )
        .where(Ranking.job_id == job_id)
        .order_by(Ranking.overall_score.desc())
    )
    rankings = result.scalars().all()

    response_data = []
    for r in rankings:
        response_data.append({
            "candidate_id": r.candidate_id,
            "candidate_name": r.candidate.user.full_name,
            "candidate_email": r.candidate.user.email,
            "current_title": r.candidate.current_title,
            "years_experience": r.candidate.years_experience,
            "overall_score": r.overall_score,
            "resume_score": r.resume_score,
            "skill_match_score": r.skill_match_score,
            "experience_score": r.experience_score,
            "interview_score": r.interview_score,
            "recommendation": r.recommendation,
            "ranked_at": r.ranked_at
        })

    return response_data
