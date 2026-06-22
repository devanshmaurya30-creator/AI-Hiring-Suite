"""
Skills API Endpoints

Handles extracting skills from uploaded resumes, listing all skills in the taxonomy,
and fetching skills associated with a specific candidate profile.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from models.database import get_db
from models.models import User, Candidate, Resume, Skill, CandidateSkill
from utils.auth import get_current_user
from services.skill_extractor import SkillExtractor

router = APIRouter(prefix="/api/skills", tags=["skills"])

# Instantiate SkillExtractor
skill_extractor = SkillExtractor()

@router.post("/extract/{resume_id}")
async def extract_skills_from_resume(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Extract skills from the resume text and associate them with
    the candidate's profile in the database.
    """
    # 1. Fetch Resume
    result = await db.execute(select(Resume).where(Resume.id == resume_id))
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found."
        )

    # 2. Authorization checks
    if current_user.role == "candidate":
        cand_res = await db.execute(select(Candidate).where(Candidate.user_id == current_user.id))
        candidate = cand_res.scalar_one_or_none()
        if not candidate or resume.candidate_id != candidate.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied."
            )
    else:
        # HR user
        cand_res = await db.execute(select(Candidate).where(Candidate.id == resume.candidate_id))
        candidate = cand_res.scalar_one_or_none()

    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate profile not found."
        )

    text_to_extract = resume.raw_text or ""
    # If raw_text is empty but we have parsed_data, use the skills listed in parsed_data
    if not text_to_extract and resume.parsed_data:
        skills_list = resume.parsed_data.get("skills", [])
        text_to_extract = " ".join(skills_list)

    if not text_to_extract:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No content found in resume to extract skills."
        )

    # 3. Extract skills from text
    extracted_skills = skill_extractor.extract_skills(text_to_extract)

    saved_skills = []
    for skill_info in extracted_skills:
        skill_name = skill_info["skill_name"]
        
        # Check if skill exists in the master skills taxonomy
        skill_query = await db.execute(select(Skill).where(Skill.name == skill_name))
        skill = skill_query.scalar_one_or_none()
        
        if not skill:
            # Create master skill entry
            skill = Skill(name=skill_name, category="Technical")
            db.add(skill)
            await db.flush()  # Populates skill.id

        # Check if already associated with candidate
        association_query = await db.execute(
            select(CandidateSkill).where(
                CandidateSkill.candidate_id == candidate.id,
                CandidateSkill.skill_id == skill.id
            )
        )
        association = association_query.scalar_one_or_none()
        
        if not association:
            # Create association
            proficiency = "intermediate"
            # Map confidence scores to proficiency levels as heuristic
            conf = skill_info.get("confidence", 0.8)
            if conf >= 1.0:
                proficiency = "advanced"
            elif conf <= 0.6:
                proficiency = "beginner"
                
            association = CandidateSkill(
                candidate_id=candidate.id,
                skill_id=skill.id,
                proficiency_level=proficiency,
                source="resume"
            )
            db.add(association)
            
        saved_skills.append({
            "skill_id": skill.id,
            "name": skill_name,
            "proficiency_level": association.proficiency_level
        })

    await db.commit()
    return saved_skills

@router.get("/")
async def list_skills_taxonomy(db: AsyncSession = Depends(get_db)):
    """Get all unique skills in the master taxonomy."""
    result = await db.execute(select(Skill))
    skills = result.scalars().all()
    return [{"id": s.id, "name": s.name, "category": s.category} for s in skills]

@router.get("/candidate/{candidate_id}")
async def get_candidate_skills(candidate_id: int, db: AsyncSession = Depends(get_db)):
    """Retrieve all skills associated with a specific candidate profile."""
    # Find candidate
    cand_query = await db.execute(select(Candidate).where(Candidate.id == candidate_id))
    candidate = cand_query.scalar_one_or_none()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate profile not found."
        )

    # Fetch associated skills
    result = await db.execute(
        select(CandidateSkill)
        .options(selectinload(CandidateSkill.skill))
        .where(CandidateSkill.candidate_id == candidate_id)
    )
    candidate_skills = result.scalars().all()
    
    return [{
        "skill_id": cs.skill_id,
        "name": cs.skill.name,
        "proficiency_level": cs.proficiency_level,
        "source": cs.source
    } for cs in candidate_skills]
