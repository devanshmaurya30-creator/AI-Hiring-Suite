from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, Optional
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.database import get_db
from models.models import User, Candidate, MLPrediction, Job, Ranking
from api.auth import get_current_user
from services.ml_service import get_ml_service

router = APIRouter(prefix="/api/predictions", tags=["predictions"])

class SalaryPredictionRequest(BaseModel):
    candidate_id: int
    job_id: Optional[int] = None

class OfferPredictionRequest(BaseModel):
    candidate_id: int
    job_id: int
    salary_offered: float

class AttritionPredictionRequest(BaseModel):
    candidate_id: int
    job_id: int

@router.post("/salary")
async def predict_salary(req: SalaryPredictionRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    cand_res = await db.execute(select(Candidate).where(Candidate.id == req.candidate_id))
    candidate = cand_res.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    ml_service = get_ml_service()
    
    # Calculate base USD prediction
    # In a real app we'd fetch actual skill count and degree level from candidate parsing
    skills_count = 5 
    edu_level = 1.0 
    predicted_usd, min_sal_usd, max_sal_usd, conf = ml_service.predict_salary(candidate.years_experience, skills_count, edu_level)
    
    # Convert to INR
    usd_to_inr = 83.5
    predicted_inr = predicted_usd * usd_to_inr
    min_sal_inr = min_sal_usd * usd_to_inr
    max_sal_inr = max_sal_usd * usd_to_inr
    
    # Format properly
    annual_salary = predicted_inr
    monthly_salary = annual_salary / 12.0
    salary_range = f"₹{int(min_sal_inr):,} - ₹{int(max_sal_inr):,}"
    market_average = annual_salary * 0.92  # Mocking a market average slightly lower
    
    # Determine LPA Band
    lpa = annual_salary / 100000.0
    if lpa <= 3:
        band = "0-3 LPA"
    elif lpa <= 6:
        band = "3-6 LPA"
    elif lpa <= 10:
        band = "6-10 LPA"
    elif lpa <= 20:
        band = "10-20 LPA"
    else:
        band = "20+ LPA"
        
    features = {
        "monthly_salary": monthly_salary,
        "annual_salary": annual_salary,
        "salary_range": salary_range,
        "market_average": market_average,
        "lpa_band": band,
        "currency": "INR"
    }
    
    pred = MLPrediction(
        candidate_id=candidate.id, 
        job_id=req.job_id, 
        prediction_type="salary", 
        predicted_value=str(annual_salary), 
        confidence=conf,
        features_json=features
    )
    db.add(pred)
    await db.commit()
    
    return {
        "predicted_salary": predicted_usd, 
        "min_salary": min_sal_usd, 
        "max_salary": max_sal_usd, 
        "confidence": conf,
        "monthly_salary": monthly_salary,
        "annual_salary": annual_salary,
        "salary_range": salary_range,
        "market_average": market_average,
        "lpa_band": band
    }

@router.post("/offer-acceptance")
async def predict_offer(req: OfferPredictionRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    ml_service = get_ml_service()
    rank_res = await db.execute(select(Ranking).where(Ranking.candidate_id == req.candidate_id, Ranking.job_id == req.job_id))
    ranking = rank_res.scalar_one_or_none()
    match_score = ranking.overall_score if ranking else 75.0
    
    salary_ratio = req.salary_offered / 60000.0
    prob, factors, conf = ml_service.predict_offer_acceptance(salary_ratio, match_score)
    
    pred = MLPrediction(candidate_id=req.candidate_id, job_id=req.job_id, prediction_type="offer_acceptance", predicted_value=str(prob), confidence=conf, features_json=factors)
    db.add(pred)
    await db.commit()
    
    return {"probability": prob, "factors": factors, "confidence": conf}

@router.post("/attrition")
async def predict_attrition(req: AttritionPredictionRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    cand_res = await db.execute(select(Candidate).where(Candidate.id == req.candidate_id))
    candidate = cand_res.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    ml_service = get_ml_service()
    risk, level, factors, conf = ml_service.predict_attrition_risk(candidate.years_experience, 2)
    
    pred = MLPrediction(candidate_id=req.candidate_id, job_id=req.job_id, prediction_type="attrition", predicted_value=level, confidence=conf, features_json=factors)
    db.add(pred)
    await db.commit()
    
    return {"risk_score": risk, "risk_level": level, "factors": factors, "confidence": conf}

@router.get("/candidate/{candidate_id}")
async def get_candidate_predictions(candidate_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "hr":
        raise HTTPException(status_code=403, detail="Only HR can view predictions")
        
    res = await db.execute(select(MLPrediction).where(MLPrediction.candidate_id == candidate_id).order_by(MLPrediction.created_at.desc()))
    return res.scalars().all()
