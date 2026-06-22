import os
import pandas as pd
import logging
from datetime import datetime
from typing import Dict, List, Tuple, Any
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import AsyncSessionLocal
from models.models import Candidate, Resume, Skill, CandidateSkill, Job, InterviewResult
from utils.auth import hash_password
from models.models import User

logger = logging.getLogger(__name__)

# Paths to CSV datasets relative to project root
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RESUME_CSV_PATH = os.path.join(PROJECT_ROOT, "datasets", "resumes", "raw", "ml_resume_dataset_4500.csv")
JOBS_CSV_PATH = os.path.join(PROJECT_ROOT, "datasets", "jobs", "raw", "training_data.csv")
QUESTIONS_CSV_PATH = os.path.join(PROJECT_ROOT, "datasets", "interviews", "raw", "Software Questions.csv")
SKILLS_CSV_PATH = os.path.join(PROJECT_ROOT, "datasets", "skills", "raw", "skills.csv")


async def ingest_all_datasets(db: AsyncSession) -> Dict[str, int]:
    """
    Main entry point to ingest and seed all datasets.
    """
    stats = {}
    stats["skills"] = await ingest_skills(db)
    stats["jobs"] = await ingest_jobs(db)
    stats["candidates"] = await ingest_candidates_and_resumes(db)
    return stats


async def ingest_skills(db: AsyncSession) -> int:
    """Ingest global skills list from skills.csv."""
    if not os.path.exists(SKILLS_CSV_PATH):
        logger.warning(f"Skills CSV not found at: {SKILLS_CSV_PATH}")
        return 0

    try:
        df = pd.read_csv(SKILLS_CSV_PATH)
        imported = 0
        for _, row in df.iterrows():
            skill_name = str(row.get("skill", "")).strip()
            if not skill_name:
                continue

            # Check if skill exists
            stmt = select(Skill).where(Skill.name.ilike(skill_name))
            res = await db.execute(stmt)
            if not res.scalar_one_or_none():
                db.add(Skill(name=skill_name, category="General Technical"))
                imported += 1

        await db.commit()
        logger.info(f"Ingested {imported} skills from skills.csv.")
        return imported
    except Exception as e:
        logger.error(f"Error ingesting skills dataset: {e}")
        return 0


async def ingest_jobs(db: AsyncSession) -> int:
    """Ingest jobs from training_data.csv if none exist."""
    # Check if jobs already exist
    check_query = await db.execute(select(Job).limit(1))
    if check_query.scalars().first():
        logger.info("Jobs already exist. Skipping jobs CSV ingestion.")
        return 0

    if not os.path.exists(JOBS_CSV_PATH):
        logger.warning(f"Jobs CSV not found at: {JOBS_CSV_PATH}")
        return 0

    try:
        df = pd.read_csv(JOBS_CSV_PATH)
        # Get or create an HR user as creator
        stmt = select(User).where(User.role == "hr")
        res = await db.execute(stmt)
        hr_user = res.scalars().first()
        if not hr_user:
            # Create a default HR user
            hr_user = User(
                email="hr@demo.com",
                password_hash=hash_password("password123"),
                full_name="HR Manager",
                role="hr"
            )
            db.add(hr_user)
            await db.flush()

        imported = 0
        # Import first 15 jobs
        for _, row in df.head(15).iterrows():
            title = row.get("position_title", "Software Engineer")
            company = row.get("company_name", "AI Hiring Inc.")
            desc = row.get("job_description", "")
            
            # Simple heuristic cleaning
            req_skills = "Python, SQL, REST APIs" if "python" in desc.lower() else "Java, JavaScript, React"
            
            new_job = Job(
                title=title,
                company=company,
                description=desc,
                required_skills=req_skills,
                min_experience=2.0 if "2 years" in desc.lower() or "two years" in desc.lower() else 0.0,
                status="active",
                created_by=hr_user.id
            )
            db.add(new_job)
            imported += 1

        await db.commit()
        logger.info(f"Ingested {imported} jobs from training_data.csv.")
        return imported
    except Exception as e:
        logger.error(f"Error ingesting jobs dataset: {e}")
        return 0


async def ingest_candidates_and_resumes(db: AsyncSession) -> int:
    """Ingest historical candidate/resume profiles from ml_resume_dataset_4500.csv."""
    # Check if candidates exist
    check_query = await db.execute(select(Candidate).limit(1))
    if check_query.scalars().first():
        logger.info("Candidates already exist. Skipping candidate CSV ingestion.")
        return 0

    if not os.path.exists(RESUME_CSV_PATH):
        logger.warning(f"Resume CSV not found at: {RESUME_CSV_PATH}")
        return 0

    try:
        df = pd.read_csv(RESUME_CSV_PATH)
        imported = 0
        # Import first 10 candidate profiles
        for idx, row in df.head(10).iterrows():
            name = row.get("name", f"Candidate {idx}")
            email = f"candidate_{idx}@example.com"
            years_exp = float(row.get("years_experience", 0.0) or 0.0)
            degree = str(row.get("highest_degree", "Bachelors"))
            skills_str = str(row.get("skills", ""))
            raw_text = str(row.get("raw_text", ""))
            current_title = str(row.get("current_title", "Software Developer"))

            # Create User
            new_user = User(
                email=email,
                password_hash=hash_password("password123"),
                full_name=name,
                role="candidate"
            )
            db.add(new_user)
            await db.flush()

            # Create Candidate
            new_candidate = Candidate(
                user_id=new_user.id,
                years_experience=years_exp,
                education=f"{degree} Degree",
                current_title=current_title,
                summary=raw_text[:200]
            )
            db.add(new_candidate)
            await db.flush()

            # Create Resume
            new_resume = Resume(
                candidate_id=new_candidate.id,
                filename="historical_resume.pdf",
                file_path="/uploads/historical_resume.pdf",
                file_type="pdf",
                parsed_data={
                    "name": name,
                    "email": email,
                    "phone": "",
                    "skills": [s.strip() for s in skills_str.split(",") if s.strip()],
                    "education": [{"degree": degree, "institution": "University", "year": ""}],
                    "experience": [{"title": current_title, "company": "Company", "duration": "", "description": ""}]
                },
                raw_text=raw_text,
                status="parsed"
            )
            db.add(new_resume)

            # Link candidate skills
            skills_list = [s.strip() for s in skills_str.split(",") if s.strip()]
            for sname in skills_list[:5]:
                # Find or create skill
                stmt = select(Skill).where(Skill.name.ilike(sname))
                res = await db.execute(stmt)
                sk = res.scalar_one_or_none()
                if not sk:
                    sk = Skill(name=sname, category="General Technical")
                    db.add(sk)
                    await db.flush()

                db.add(CandidateSkill(
                    candidate_id=new_candidate.id,
                    skill_id=sk.id,
                    proficiency_level="intermediate",
                    source="resume"
                ))

            imported += 1

        await db.commit()
        logger.info(f"Ingested {imported} candidate records from resume dataset.")
        return imported
    except Exception as e:
        logger.error(f"Error ingesting candidate dataset: {e}")
        return 0
