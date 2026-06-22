"""
Interviews API Endpoints

Handles generating interview sessions, evaluating candidate answers using Gemini,
retrieving details of past interviews, and final scoring on interview completion.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from config.settings import get_settings
from models.database import get_db
from models.models import User, Candidate, Job, Interview, InterviewResult, CandidateSkill, Ranking, Resume
from utils.auth import get_current_user
from services.interview_service import InterviewService
from services.gemini_service import get_gemini_service
from services.ranking_service import RankingService
from services.ml_service import get_ml_service
import os
import uuid

settings = get_settings()

router = APIRouter(prefix="/api/interviews", tags=["interviews"])
interview_service = InterviewService()
gemini_service = get_gemini_service()
ranking_service = RankingService()

# ---------------------------------------------------------------------------
# Request / Response Schemas
# ---------------------------------------------------------------------------

class InterviewGenerateRequest(BaseModel):
    candidate_id: int
    job_id: int
    interview_type: str   # 'technical' | 'hr'
    category: str
    difficulty: str       # 'easy' | 'medium' | 'hard'


class AnswerSubmitRequest(BaseModel):
    interview_id: int
    question_number: int
    candidate_answer: str


# ---------------------------------------------------------------------------
# Route Handlers
# ---------------------------------------------------------------------------

@router.get("/categories")
async def get_interview_categories():
    """Retrieve all available categories for tech interviews."""
    return interview_service.get_categories()


@router.post("/generate")
async def generate_interview(
    req: InterviewGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate an interview session.
    Creates 5 questions and stores them in the database.

    Returns interview_id (not id) so the frontend can unambiguously identify
    the session when submitting answers to /evaluate.
    """
    # 1. Fetch Candidate
    cand_result = await db.execute(select(Candidate).where(Candidate.id == req.candidate_id))
    candidate = cand_result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate profile not found.")

    # Candidates can only start their own interviews
    if current_user.role == "candidate" and candidate.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    # 2. Fetch candidate skills to personalise questions
    skills_result = await db.execute(
        select(CandidateSkill)
        .options(selectinload(CandidateSkill.skill))
        .where(CandidateSkill.candidate_id == req.candidate_id)
    )
    candidate_skills = [cs.skill.name for cs in skills_result.scalars().all()]

    # 3. Create Interview record
    new_interview = Interview(
        candidate_id=req.candidate_id,
        job_id=req.job_id,
        interview_type=req.interview_type,
        status="in_progress",
        started_at=datetime.utcnow(),
    )
    db.add(new_interview)
    await db.flush()  # Populates new_interview.id

    # 4. Generate 5 questions
    if req.interview_type == "hr":
        questions_list = await gemini_service.generate_interview_questions(
            category="Behavioral & Situational",
            difficulty=req.difficulty,
            count=5,
            skills=candidate_skills,
        )
    else:
        questions_list = await interview_service.get_questions_for_interview(
            category=req.category,
            difficulty=req.difficulty,
            count=5,
            candidate_skills=candidate_skills,
        )

    # 5. Persist InterviewResult rows
    results_response = []
    for idx, q in enumerate(questions_list):
        q_num = idx + 1
        db.add(InterviewResult(
            interview_id=new_interview.id,
            question_text=q["question"],
            expected_answer=q["expected_answer"],
            question_number=q_num,
        ))
        results_response.append({
            "question_number": q_num,
            "question": q["question"],
            "expected_answer": q["expected_answer"],
        })

    await db.commit()
    await db.refresh(new_interview)

    return {
        "interview_id": new_interview.id,
        "interview_type": new_interview.interview_type,
        "status": new_interview.status,
        "questions": results_response,
    }


@router.post("/evaluate")
async def evaluate_answer(
    req: AnswerSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submit and evaluate a candidate's answer to a specific interview question.
    Saves candidate answer, score, and feedback using Gemini.

    The question text and expected answer are fetched from the DB — the client
    only needs to supply interview_id, question_number, and candidate_answer.
    """
    # 1. Fetch Interview
    int_result = await db.execute(select(Interview).where(Interview.id == req.interview_id))
    interview = int_result.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found.")
    if interview.status != "in_progress":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Interview is not in progress.")

    # 2. Auth — candidates may only answer their own interviews
    cand_result = await db.execute(select(Candidate).where(Candidate.id == interview.candidate_id))
    candidate = cand_result.scalar_one_or_none()
    if current_user.role == "candidate" and (not candidate or candidate.user_id != current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    # 3. Fetch the specific question row
    q_result = await db.execute(
        select(InterviewResult).where(
            InterviewResult.interview_id == req.interview_id,
            InterviewResult.question_number == req.question_number,
        )
    )
    question = q_result.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found.")

    # 4. Evaluate via Gemini (or local TF-IDF fallback)
    evaluation = await gemini_service.evaluate_candidate_answer(
        question=question.question_text,
        expected_answer=question.expected_answer or "",
        candidate_answer=req.candidate_answer,
    )

    # 5. Persist
    question.candidate_answer = req.candidate_answer
    question.score = float(evaluation.get("score", 5.0))
    question.feedback = evaluation.get("feedback", "")
    await db.commit()

    return {
        "question_number": req.question_number,
        "score": question.score,
        "feedback": question.feedback,
        "strengths": evaluation.get("strengths", []),
        "weaknesses": evaluation.get("weaknesses", []),
        "status": evaluation.get("status", "success"),
        "message": evaluation.get("message", "Evaluation completed successfully.")
    }


@router.get("/{interview_id}")
async def get_interview_details(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve full details of an interview, including questions and scores."""
    result = await db.execute(
        select(Interview)
        .options(selectinload(Interview.results))
        .where(Interview.id == interview_id)
    )
    interview = result.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found.")

    if current_user.role == "candidate":
        cand_result = await db.execute(select(Candidate).where(Candidate.id == interview.candidate_id))
        candidate = cand_result.scalar_one_or_none()
        if not candidate or candidate.user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    # Sort results by question_number in Python (avoids the broken ORM order_by)
    results_sorted = sorted(interview.results, key=lambda r: r.question_number or 0)

    return {
        "id": interview.id,
        "candidate_id": interview.candidate_id,
        "job_id": interview.job_id,
        "interview_type": interview.interview_type,
        "status": interview.status,
        "total_score": interview.total_score,
        "feedback": interview.feedback,
        "started_at": interview.started_at,
        "completed_at": interview.completed_at,
        "results": [
            {
                "question_number": r.question_number,
                "question_text": r.question_text,
                "candidate_answer": r.candidate_answer,
                "score": r.score,
                "feedback": r.feedback,
            }
            for r in results_sorted
        ],
    }


@router.post("/{interview_id}/complete")
async def complete_interview(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Mark an interview as completed.
    Calculates overall score, generates summary feedback via Gemini,
    and upserts the candidate's ranking for the target job.
    """
    # 1. Fetch interview with all results eagerly loaded
    result = await db.execute(
        select(Interview)
        .options(selectinload(Interview.results))
        .where(Interview.id == interview_id)
    )
    interview = result.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found.")

    # Idempotent — already completed
    if interview.status != "in_progress":
        return {
            "id": interview.id,
            "status": interview.status,
            "total_score": interview.total_score,
            "feedback": interview.feedback,
            "completed_at": interview.completed_at,
        }

    # 2. Auth
    candidate: Optional[Candidate] = None
    if current_user.role == "candidate":
        cand_result = await db.execute(select(Candidate).where(Candidate.id == interview.candidate_id))
        candidate = cand_result.scalar_one_or_none()
        if not candidate or candidate.user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    else:
        cand_result = await db.execute(select(Candidate).where(Candidate.id == interview.candidate_id))
        candidate = cand_result.scalar_one_or_none()

    # 3. Require at least one evaluated answer before completing
    #    interview.results is now guaranteed List[InterviewResult] (not a scalar)
    all_results: List[InterviewResult] = list(interview.results)
    scores = [r.score for r in all_results if r.score is not None]
    if not scores:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot complete interview. No questions have been answered or evaluated yet.",
        )

    # 4. Compute overall score (average, 0–10 scale)
    total_score = round(sum(scores) / len(scores), 2)
    interview.total_score = total_score
    interview.status = "completed"
    interview.completed_at = datetime.utcnow()

    # 5. Generate Gemini summary feedback
    q_summary = "\n".join(
        f"Q: {r.question_text}\nScore: {r.score}/10\nFeedback: {r.feedback or 'N/A'}"
        for r in all_results
    )
    feedback_prompt = (
        f"The candidate completed an interview with an overall score of {total_score}/10.\n"
        f"Summary of questions and evaluations:\n{q_summary}\n\n"
        "Provide a professional, constructive 2-3 sentence overall hiring summary for the HR recruiter."
    )
    summary_text = await gemini_service.generate_summary_feedback(feedback_prompt)
    interview.feedback = summary_text if summary_text else f"Interview completed. Score: {total_score}/10."

    # 6. Upsert candidate ranking for this job
    if interview.job_id and candidate:
        rank_result = await db.execute(
            select(Ranking).where(
                Ranking.candidate_id == candidate.id,
                Ranking.job_id == interview.job_id,
            )
        )
        ranking = rank_result.scalar_one_or_none()

        scaled_interview_score = total_score * 10.0  # convert to 0-100 scale

        # Latest resume
        resume_result = await db.execute(
            select(Resume)
            .where(Resume.candidate_id == candidate.id)
            .order_by(Resume.uploaded_at.desc())
            .limit(1)
        )
        latest_resume = resume_result.scalar_one_or_none()
        parsed_resume = latest_resume.parsed_data if latest_resume else {}

        # Job details
        job_result = await db.execute(select(Job).where(Job.id == interview.job_id))
        job = job_result.scalar_one_or_none()

        if job:
            skills_result = await db.execute(
                select(CandidateSkill)
                .options(selectinload(CandidateSkill.skill))
                .where(CandidateSkill.candidate_id == candidate.id)
            )
            candidate_skill_names = [cs.skill.name for cs in skills_result.scalars().all()]

            resume_score = ranking_service.calculate_resume_score(parsed_resume)
            skill_score = ranking_service.calculate_skill_score(candidate_skill_names, job.required_skills or "")
            exp_score = ranking_service.calculate_experience_score(candidate.years_experience, job.min_experience)
            overall_score = ranking_service.calculate_overall_score(
                resume_score=resume_score,
                skill_score=skill_score,
                experience_score=exp_score,
                interview_score=scaled_interview_score,
            )
            recommendation = ranking_service.get_recommendation(overall_score)

            if ranking:
                ranking.interview_score = round(scaled_interview_score, 2)
                ranking.overall_score = overall_score
                ranking.recommendation = recommendation
            else:
                db.add(Ranking(
                    candidate_id=candidate.id,
                    job_id=interview.job_id,
                    resume_score=resume_score,
                    skill_match_score=skill_score,
                    experience_score=exp_score,
                    interview_score=round(scaled_interview_score, 2),
                    overall_score=overall_score,
                    recommendation=recommendation,
                ))

    await db.commit()

    return {
        "id": interview.id,
        "status": interview.status,
        "total_score": interview.total_score,
        "feedback": interview.feedback,
        "completed_at": interview.completed_at,
    }


@router.post("/{interview_id}/voice-interview")
async def voice_interview(
    interview_id: int,
    question_number: int = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Submit a voice recording answer for an interview question.
    Transcribes the audio (via Whisper / Gemini) and runs evaluation.
    """
    # 1. Fetch Interview & Candidate
    int_stmt = select(Interview).where(Interview.id == interview_id)
    int_res = await db.execute(int_stmt)
    interview = int_res.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found.")
    if interview.status != "in_progress":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Interview is not in progress.")

    cand_stmt = select(Candidate).where(Candidate.id == interview.candidate_id)
    cand_res = await db.execute(cand_stmt)
    candidate = cand_res.scalar_one_or_none()
    if current_user.role == "candidate" and (not candidate or candidate.user_id != current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    # 2. Fetch specific question row
    q_stmt = select(InterviewResult).where(
        InterviewResult.interview_id == interview_id,
        InterviewResult.question_number == question_number
    )
    q_res = await db.execute(q_stmt)
    question = q_res.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found.")

    # 3. Save audio file locally
    audio_bytes = await file.read()
    upload_dir = settings.UPLOAD_PATH
    os.makedirs(upload_dir, exist_ok=True)
    file_ext = os.path.splitext(file.filename)[1] or ".wav"
    unique_filename = f"voice_interview_{interview_id}_{question_number}_{uuid.uuid4().hex}{file_ext}"
    file_path = os.path.join(upload_dir, unique_filename)
    
    with open(file_path, "wb") as f:
        f.write(audio_bytes)

    # 4. Transcribe audio using ML Service (Whisper standalone)
    ml_service = get_ml_service()
    transcript = await ml_service.transcribe_audio_whisper(audio_bytes)
    if not transcript or "Failed to transcribe" in transcript:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Speech-to-text transcription failed.")

    # 4.5 Speech emotion analysis
    speech_emotion = await ml_service.analyze_speech_emotion(audio_bytes)

    # 4.6 Extract voice fraud metrics
    audio_hash = ml_service.hash_audio_bytes(audio_bytes)
    is_synthetic = "synthetic" in speech_emotion.get("tone", "").lower() or speech_emotion.get("stress_level") == 0.0

    # 5. Evaluate answer via Gemini (or local TF-IDF fallback)
    evaluation = await gemini_service.evaluate_candidate_answer(
        question=question.question_text,
        expected_answer=question.expected_answer or "",
        candidate_answer=transcript,
    )

    # 6. Save results
    question.candidate_answer = transcript
    question.audio_path = file_path
    question.score = float(evaluation.get("score", 5.0))
    question.feedback = evaluation.get("feedback", "")
    
    # Save voice verification findings in emotion_analytics
    existing_analytics = question.emotion_analytics or {}
    existing_analytics.update({
        "audio_hash": audio_hash,
        "synthetic_voice_indicator": is_synthetic,
        "tone": speech_emotion.get("tone"),
        "pace": speech_emotion.get("pace"),
        "confidence": speech_emotion.get("confidence"),
        "stress_level": speech_emotion.get("stress_level")
    })
    question.emotion_analytics = existing_analytics
    
    await db.commit()

    return {
        "question_number": question_number,
        "transcript": transcript,
        "score": question.score,
        "feedback": question.feedback,
        "strengths": evaluation.get("strengths", []),
        "weaknesses": evaluation.get("weaknesses", []),
        "audio_path": file_path,
        "status": evaluation.get("status", "success"),
        "message": evaluation.get("message", "Voice evaluation completed successfully.")
    }


@router.post("/{interview_id}/emotion-analysis")
async def emotion_analysis(
    interview_id: int,
    question_number: int = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Analyze candidate facial expressions from webcam snapshot during the interview.
    Detects emotional state (Confidence, Neutral, Happy, Nervous, Stressed) and stores metrics.
    """
    # 1. Fetch Interview & Candidate
    int_stmt = select(Interview).where(Interview.id == interview_id)
    int_res = await db.execute(int_stmt)
    interview = int_res.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found.")

    cand_stmt = select(Candidate).where(Candidate.id == interview.candidate_id)
    cand_res = await db.execute(cand_stmt)
    candidate = cand_res.scalar_one_or_none()
    if current_user.role == "candidate" and (not candidate or candidate.user_id != current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    # 2. Fetch specific question row
    q_stmt = select(InterviewResult).where(
        InterviewResult.interview_id == interview_id,
        InterviewResult.question_number == question_number
    )
    q_res = await db.execute(q_stmt)
    question = q_res.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found.")

    # 3. Analyze emotion from frame
    image_bytes = await file.read()
    ml_service = get_ml_service()
    analytics = await ml_service.analyze_emotion_image(image_bytes)

    # 4. Save to database
    question.emotion = analytics.get("emotion", "Neutral")
    question.emotion_analytics = analytics
    await db.commit()

    return {
        "question_number": question_number,
        "emotion": question.emotion,
        "analytics": analytics
    }

@router.post("/{interview_id}/video-assessment")
async def video_assessment(
    interview_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    int_stmt = select(Interview).where(Interview.id == interview_id)
    int_res = await db.execute(int_stmt)
    interview = int_res.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found.")

    image_bytes = await file.read()
    ml_service = get_ml_service()
    analysis = await ml_service.analyze_video_posture(image_bytes)
    return {"analysis": analysis}

@router.get("/reports/all")
async def get_all_reports(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "hr":
        raise HTTPException(status_code=403, detail="Only HR can view all reports")
    res = await db.execute(select(Interview).where(Interview.status == "completed").order_by(Interview.completed_at.desc()))
    return res.scalars().all()

@router.get("/reports/{interview_id}")
async def get_report_details(interview_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Interview).options(selectinload(Interview.results)).where(Interview.id == interview_id)
    )
    interview = result.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=404, detail="Report not found")
    results_sorted = sorted(interview.results, key=lambda r: r.question_number or 0)
    return {
        "id": interview.id,
        "candidate_id": interview.candidate_id,
        "job_id": interview.job_id,
        "interview_type": interview.interview_type,
        "total_score": interview.total_score,
        "feedback": interview.feedback,
        "completed_at": interview.completed_at,
        "results": [{"question_number": r.question_number, "question_text": r.question_text, "candidate_answer": r.candidate_answer, "score": r.score, "feedback": r.feedback, "emotion": r.emotion, "emotion_analytics": r.emotion_analytics} for r in results_sorted]
    }

