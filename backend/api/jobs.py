"""
Jobs API Endpoints

Handles posting new jobs, retrieving active listings, analyzing job description texts,
and importing pre-populated job listings from the training dataset.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from models.database import get_db
from models.models import User, Job
from utils.auth import get_current_hr_user
from utils.dataset_loader import load_jobs_dataset
from services.job_analyzer import JobAnalyzer

router = APIRouter(prefix="/api/jobs", tags=["jobs"])
job_analyzer = JobAnalyzer()

# --- Request / Response Schemas ---
class JobCreate(BaseModel):
    title: str
    company: Optional[str] = "AI hiring Inc."
    description: str
    required_skills: Optional[str] = ""
    min_experience: Optional[float] = 0.0
    max_experience: Optional[float] = None
    responsibilities: Optional[str] = ""
    location: Optional[str] = "Remote"
    salary_range: Optional[str] = "Negotiable"

class JobAnalyzeRequest(BaseModel):
    description: str

# --- Route Handlers ---

@router.post("/", response_model=JobCreate, status_code=status.HTTP_201_CREATED)
async def create_job(
    job_in: JobCreate,
    current_hr: User = Depends(get_current_hr_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new job posting (HR only)."""
    new_job = Job(
        title=job_in.title,
        company=job_in.company,
        description=job_in.description,
        required_skills=job_in.required_skills,
        min_experience=job_in.min_experience,
        max_experience=job_in.max_experience,
        responsibilities=job_in.responsibilities,
        location=job_in.location,
        salary_range=job_in.salary_range,
        status="active",
        created_by=current_hr.id
    )
    db.add(new_job)
    await db.commit()
    await db.refresh(new_job)
    return new_job

@router.get("/")
async def list_jobs(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """List all active jobs with pagination."""
    result = await db.execute(
        select(Job)
        .where(Job.status == "active")
        .offset(skip)
        .limit(limit)
    )
    jobs = result.scalars().all()
    return jobs

@router.get("/{job_id}")
async def get_job_details(job_id: int, db: AsyncSession = Depends(get_db)):
    """Retrieve details for a specific job posting."""
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job posting not found."
        )
    return job

@router.post("/analyze")
async def analyze_job_description(
    req: JobAnalyzeRequest,
    current_hr: User = Depends(get_current_hr_user)
):
    """
    Extract structured fields (required skills, experience, responsibilities)
    from a job description string (HR only).
    """
    analysis = job_analyzer.analyze(req.description)
    return analysis

@router.post("/import-dataset")
async def import_jobs_from_dataset(
    current_hr: User = Depends(get_current_hr_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Import job postings from training_data.csv into the database (HR only).
    Imports the first 50 jobs.
    """
    # Load dataset
    try:
        jobs_df = load_jobs_dataset()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load jobs dataset CSV: {e}"
        )

    # Check if we already have jobs in the database
    check_query = await db.execute(select(Job).limit(1))
    if check_query.scalars().first():
        return {"message": "Jobs already exist in database. Skipping import.", "imported_count": 0}

    imported_count = 0
    # Process first 50 jobs
    subset_df = jobs_df.head(50)
    for _, row in subset_df.iterrows():
        job_row = {
            "company_name": row.get("company_name", "AI Hiring Inc."),
            "job_description": row.get("job_description", ""),
            "position_title": row.get("position_title", "Software Engineer")
        }
        
        # Structure the CSV row
        structured_job = job_analyzer.analyze_from_dataset(job_row)
        
        new_job = Job(
            title=structured_job["title"],
            company=structured_job["company"],
            description=structured_job["description"],
            required_skills=structured_job["required_skills"],
            min_experience=structured_job["min_experience"],
            responsibilities=structured_job["responsibilities"],
            location=structured_job["location"],
            salary_range=structured_job["salary_range"],
            status="active",
            created_by=current_hr.id
        )
        db.add(new_job)
        imported_count += 1

    await db.commit()
    return {"message": "Successfully imported job postings.", "imported_count": imported_count}
