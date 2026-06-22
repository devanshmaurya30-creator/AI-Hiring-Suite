from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from models.database import get_db
from models.models import User, Candidate, FraudReport, FraudAlert, CandidateSimilarity
from utils.auth import get_current_user, get_current_hr_user
from services.fraud_service import get_fraud_service

router = APIRouter(prefix="/api/fraud", tags=["fraud"])
fraud_service = get_fraud_service()

class FraudDetectionRequest(BaseModel):
    candidate_id: int

@router.post("/fraud-detection", response_model=None)
async def trigger_fraud_detection(
    req: FraudDetectionRequest,
    current_hr: User = Depends(get_current_hr_user),
    db: AsyncSession = Depends(get_db)
):
    """Trigger a fresh fraud analysis report for a candidate."""
    try:
        report = await fraud_service.calculate_aggregate_fraud_report(req.candidate_id, db)
        return {
            "status": "success",
            "candidate_id": report.candidate_id,
            "fraud_score": report.fraud_score,
            "risk_level": report.risk_level,
            "explanation": report.explanation,
            "recommended_action": report.recommended_action,
            "created_at": report.created_at
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Fraud detection failed: {str(e)}")

@router.get("/fraud-report", response_model=None)
async def get_candidate_fraud_report(
    candidate_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve the fraud report for a specific candidate. Runs analysis if not present."""
    # Auth check - candidates can only view their own
    if current_user.role == "candidate":
        cand_stmt = select(Candidate).where(Candidate.user_id == current_user.id)
        cand_res = await db.execute(cand_stmt)
        candidate = cand_res.scalar_one_or_none()
        if not candidate or candidate.id != candidate_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    report_stmt = select(FraudReport).where(FraudReport.candidate_id == candidate_id)
    report_res = await db.execute(report_stmt)
    report = report_res.scalar_one_or_none()

    if not report:
        try:
            report = await fraud_service.calculate_aggregate_fraud_report(candidate_id, db)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Fraud generation failed: {str(e)}")

    return {
        "candidate_id": report.candidate_id,
        "fraud_score": report.fraud_score,
        "risk_level": report.risk_level,
        "explanation": report.explanation,
        "recommended_action": report.recommended_action,
        "identity_fraud_alerts": report.identity_fraud_alerts,
        "keyword_stuffing_alerts": report.keyword_stuffing_alerts,
        "ai_authenticity_alerts": report.ai_authenticity_alerts,
        "interview_fraud_alerts": report.interview_fraud_alerts,
        "created_at": report.created_at
    }

@router.get("/fraud-alerts", response_model=None)
async def get_fraud_alerts(
    current_hr: User = Depends(get_current_hr_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve all active fraud alerts for the recruiter dashboard."""
    stmt = (
        select(FraudAlert)
        .options(selectinload(FraudAlert.candidate).selectinload(Candidate.user))
        .where(FraudAlert.status == "active")
        .order_by(FraudAlert.created_at.desc())
    )
    res = await db.execute(stmt)
    alerts = res.scalars().all()
    
    return [
        {
            "id": alert.id,
            "candidate_id": alert.candidate_id,
            "candidate_name": alert.candidate.user.full_name,
            "alert_type": alert.alert_type,
            "severity": alert.severity,
            "message": alert.message,
            "created_at": alert.created_at
        }
        for alert in alerts
    ]

@router.get("/candidate-similarity", response_model=None)
async def get_candidate_similarity(
    candidate_id: Optional[int] = None,
    current_hr: User = Depends(get_current_hr_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve similarity records, optionally filtered by candidate_id."""
    if candidate_id:
        stmt = (
            select(CandidateSimilarity)
            .options(
                selectinload(CandidateSimilarity.candidate1).selectinload(Candidate.user),
                selectinload(CandidateSimilarity.candidate2).selectinload(Candidate.user)
            )
            .where((CandidateSimilarity.candidate_id_1 == candidate_id) | (CandidateSimilarity.candidate_id_2 == candidate_id))
            .order_by(CandidateSimilarity.similarity_score.desc())
        )
    else:
        stmt = (
            select(CandidateSimilarity)
            .options(
                selectinload(CandidateSimilarity.candidate1).selectinload(Candidate.user),
                selectinload(CandidateSimilarity.candidate2).selectinload(Candidate.user)
            )
            .order_by(CandidateSimilarity.similarity_score.desc())
        )

    res = await db.execute(stmt)
    pairs = res.scalars().all()

    return [
        {
            "id": p.id,
            "candidate_id_1": p.candidate_id_1,
            "candidate_name_1": p.candidate1.user.full_name,
            "candidate_id_2": p.candidate_id_2,
            "candidate_name_2": p.candidate2.user.full_name,
            "similarity_score": p.similarity_score,
            "match_type": p.match_type,
            "created_at": p.created_at
        }
        for p in pairs
    ]
