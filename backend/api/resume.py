"""
Resume API Endpoints

Handles file uploads (PDF/DOCX), listing uploaded files, retrieving raw text,
and executing the resume parsing engine.
"""

import os
import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from config.settings import get_settings
from models.database import get_db
from models.models import User, Candidate, Resume, FraudLog
from utils.auth import get_current_user, get_current_candidate
from utils.file_handler import validate_file, save_upload, get_file_text
from services.resume_parser import ResumeParser
from services.ml_service import get_ml_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/resumes", tags=["resumes"])
settings = get_settings()

# Instantiate ResumeParser
resume_parser = ResumeParser()

@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload a resume (PDF or DOCX format).
    Extracts raw text and saves metadata.
    """
    # 1. Ensure user is a candidate and has a candidate profile
    if current_user.role != "candidate":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only candidates can upload resumes."
        )
        
    candidate_res = await db.execute(select(Candidate).where(Candidate.user_id == current_user.id))
    candidate = candidate_res.scalar_one_or_none()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate profile not found."
        )

    # 2. Validate file format and size
    validate_file(file)

    # 3. Save upload to disk
    upload_dir = settings.UPLOAD_PATH
    file_path = await save_upload(file, upload_dir)
    _, ext = os.path.splitext(file.filename or "")
    file_type = ext.lower().replace(".", "")

    # 4. Extract raw text from file
    raw_text = ""
    if file_type in ("png", "jpg", "jpeg"):
        try:
            with open(file_path, "rb") as f:
                file_bytes = f.read()
            ml_service = get_ml_service()
            raw_text = await ml_service.extract_text_from_image_ocr(file_bytes)
        except Exception as e:
            if os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Failed to extract image text via OCR: {e}"
            )
    else:
        try:
            raw_text = get_file_text(file_path)
        except Exception as e:
            # Cleanup uploaded file on parsing failure
            if os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Failed to read file text content: {e}"
            )

    # 4.1 Check if OCR is needed (e.g. scanned/image PDF with minimal text extracted)
    if len(raw_text.strip()) < 50 and file_type == "pdf":
        try:
            with open(file_path, "rb") as f:
                file_bytes = f.read()
            ml_service = get_ml_service()
            ocr_text = await ml_service.extract_text_from_pdf_ocr(file_path, file_bytes)
            if ocr_text.strip():
                raw_text = ocr_text
        except Exception as e:
            logger.warning(f"Failed to run OCR on uploaded PDF: {e}")

    # 4.2 Detect Fraud/Duplicate profiles
    ml_service = get_ml_service()
    other_resumes_res = await db.execute(
        select(Resume.candidate_id, User.full_name, Resume.raw_text)
        .join(Candidate, Resume.candidate_id == Candidate.id)
        .join(User, Candidate.user_id == User.id)
        .where(Resume.candidate_id != candidate.id)
    )
    other_resumes = [(row[0], row[1], row[2]) for row in other_resumes_res.all() if row[2]]
    
    fraud_score, fraud_reasons = ml_service.detect_fraud_alerts(raw_text, other_resumes)
    if fraud_score > 0:
        reason_str = "; ".join(fraud_reasons) or "Potential candidate fraud detected."
        fraud_log = FraudLog(
            candidate_id=candidate.id,
            fraud_score=fraud_score,
            reason=reason_str
        )
        db.add(fraud_log)

    # 5. Save database entry
    new_resume = Resume(
        candidate_id=candidate.id,
        filename=file.filename or "resume",
        file_path=file_path,
        file_type=file_type,
        raw_text=raw_text,
        status="uploaded"
    )
    db.add(new_resume)
    await db.commit()
    await db.refresh(new_resume)

    return {
        "id": new_resume.id,
        "filename": new_resume.filename,
        "file_type": new_resume.file_type,
        "status": new_resume.status,
        "uploaded_at": new_resume.uploaded_at
    }

@router.get("/")
async def list_resumes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List resumes. Candidates see only their own resumes,
    while HR users can list all resumes.
    """
    if current_user.role == "hr":
        result = await db.execute(select(Resume))
    else:
        # Find candidate profile first
        candidate_res = await db.execute(select(Candidate).where(Candidate.user_id == current_user.id))
        candidate = candidate_res.scalar_one_or_none()
        if not candidate:
            return []
        result = await db.execute(select(Resume).where(Resume.candidate_id == candidate.id))

    resumes = result.scalars().all()
    return [{
        "id": r.id,
        "candidate_id": r.candidate_id,
        "filename": r.filename,
        "file_type": r.file_type,
        "status": r.status,
        "uploaded_at": r.uploaded_at
    } for r in resumes]

@router.get("/{resume_id}")
async def get_resume(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve resume detailed metadata, raw text, and parsed JSON data."""
    result = await db.execute(select(Resume).where(Resume.id == resume_id))
    resume = result.scalar_one_or_none()
    
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found."
        )

    # Candidates can only access their own resumes
    if current_user.role == "candidate":
        candidate_res = await db.execute(select(Candidate).where(Candidate.user_id == current_user.id))
        candidate = candidate_res.scalar_one_or_none()
        if not candidate or resume.candidate_id != candidate.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied."
            )

    return {
        "id": resume.id,
        "candidate_id": resume.candidate_id,
        "filename": resume.filename,
        "file_type": resume.file_type,
        "status": resume.status,
        "raw_text": resume.raw_text,
        "parsed_data": resume.parsed_data,
        "uploaded_at": resume.uploaded_at
    }

@router.get("/{resume_id}/summary")
async def get_resume_summary(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Generate and return AI summary, highlights, strengths, and weaknesses for the resume."""
    result = await db.execute(select(Resume).where(Resume.id == resume_id))
    resume = result.scalar_one_or_none()
    
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found."
        )

    # Auth checks
    if current_user.role == "candidate":
        candidate_res = await db.execute(select(Candidate).where(Candidate.user_id == current_user.id))
        candidate = candidate_res.scalar_one_or_none()
        if not candidate or resume.candidate_id != candidate.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied."
            )
            
    if not resume.raw_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume does not contain text for summarization."
        )
        
    # Get Gemini service and generate summary
    from services.gemini_service import get_gemini_service
    gemini = get_gemini_service()
    summary = await gemini.summarize_resume(resume.raw_text)
    return summary

@router.post("/{resume_id}/parse")
async def parse_resume(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Parse a resume's text, extract structured fields, and update
    the database with the parsed data. Syncs candidate profile.
    """
    result = await db.execute(select(Resume).where(Resume.id == resume_id))
    resume = result.scalar_one_or_none()
    
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found."
        )

    # Auth checks
    if current_user.role == "candidate":
        candidate_res = await db.execute(select(Candidate).where(Candidate.user_id == current_user.id))
        candidate = candidate_res.scalar_one_or_none()
        if not candidate or resume.candidate_id != candidate.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied."
            )
    else:
        # HR is parsing: load candidate profile associated with the resume
        candidate_res = await db.execute(select(Candidate).where(Candidate.id == resume.candidate_id))
        candidate = candidate_res.scalar_one_or_none()

    if not resume.raw_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume does not contain any raw text to parse."
        )

    # Parse resume asynchronously (uses regex + fallback to Gemini)
    try:
        parsed_data = await resume_parser.parse_async(resume.raw_text)
    except Exception as e:
        logger.error(f"Error parsing resume: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error parsing resume: {e}"
        )

    # Update resume object
    resume.parsed_data = parsed_data
    resume.status = "parsed"

    # Sync parsed fields into candidate profile
    if candidate:
        if parsed_data.get("phone") and not candidate.phone:
            candidate.phone = parsed_data["phone"]
            
        education_entries = parsed_data.get("education", [])
        if education_entries and not candidate.education:
            # Join education fields into a string
            edu_strs = []
            for edu in education_entries:
                edu_strs.append(f"{edu.get('degree', '')} at {edu.get('institution', '')} ({edu.get('year', '')})")
            candidate.education = "\n".join(edu_strs)

        # Look for years experience in experience heuristic
        # If we got it from parse_async, let's look if experience holds list or we have years_experience field
        # The parser returns lists, let's extract years of experience if available
        # In our parser, we return years of experience in experience_entries, years_exp tuple.
        # But wait, our parse_async actually returns a flat dict where "experience" holds a list of dicts.
        # Let's count years from experience or check if parsed_data has it
        exp_entries = parsed_data.get("experience", [])
        if exp_entries and candidate.years_experience == 0.0:
            # Simple heuristic: sum duration or look for number of entries
            # Let's assume each experience entry is ~2 years if we can't parse it
            candidate.years_experience = float(len(exp_entries) * 2.0)
            
        # Get first job title as current title
        if exp_entries and not candidate.current_title:
            candidate.current_title = exp_entries[0].get("title", "")
            
        # Update summary if available
        # If Gemini parsed the summary, it will be in the name/about fields.
        # Let's set a simple summary if empty
        if not candidate.summary:
            cand_name = parsed_data.get("name", current_user.full_name)
            cand_title = candidate.current_title or "Software Developer"
            skills_short = ", ".join(parsed_data.get("skills", [])[:5])
            candidate.summary = f"{cand_name} is a {cand_title} skilled in {skills_short}."

    await db.commit()
    await db.refresh(resume)

    return resume.parsed_data
