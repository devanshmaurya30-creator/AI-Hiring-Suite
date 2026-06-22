from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from models.database import get_db
from models.models import User, Candidate, Job, Offer
from utils.auth import get_current_user, get_current_hr_user

router = APIRouter(prefix="/api/offers", tags=["offers"])

# --- Request / Response Schemas ---
class OfferCreate(BaseModel):
    candidate_id: int
    job_id: int
    salary_offered: str

class OfferResponseUpdate(BaseModel):
    status: str # 'accepted' | 'declined'


# --- Route Handlers ---

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_offer(
    req: OfferCreate,
    current_hr: User = Depends(get_current_hr_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new job offer for a candidate (HR only)."""
    # 1. Verify candidate profile exists
    cand_stmt = select(Candidate).where(Candidate.id == req.candidate_id)
    cand_res = await db.execute(cand_stmt)
    candidate = cand_res.scalar_one_or_none()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate profile not found."
        )

    # 2. Verify job posting exists
    job_stmt = select(Job).where(Job.id == req.job_id)
    job_res = await db.execute(job_stmt)
    job = job_res.scalar_one_or_none()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job posting not found."
        )

    # 3. Create offer
    new_offer = Offer(
        candidate_id=req.candidate_id,
        job_id=req.job_id,
        salary_offered=req.salary_offered,
        status="pending_approval",
        sent_at=datetime.utcnow()
    )
    db.add(new_offer)
    await db.commit()
    await db.refresh(new_offer)
    return new_offer


@router.get("/candidate/{candidate_id}")
async def get_candidate_offers(
    candidate_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve offers received by a candidate."""
    # Auth constraint: candidates can only fetch their own offers
    if current_user.role == "candidate":
        cand_stmt = select(Candidate).where(Candidate.user_id == current_user.id)
        cand_res = await db.execute(cand_stmt)
        candidate = cand_res.scalar_one_or_none()
        if not candidate or candidate.id != candidate_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied."
            )

    offers_stmt = select(Offer).where(Offer.candidate_id == candidate_id)
    offers_res = await db.execute(offers_stmt)
    offers = offers_res.scalars().all()
    
    # Format response
    response = []
    for o in offers:
        job_stmt = select(Job).where(Job.id == o.job_id)
        job_res = await db.execute(job_stmt)
        job = job_res.scalar_one_or_none()
        response.append({
            "id": o.id,
            "candidate_id": o.candidate_id,
            "job_id": o.job_id,
            "job_title": job.title if job else "Unknown Role",
            "company": job.company if job else "AI Hiring Inc.",
            "salary_offered": o.salary_offered,
            "status": o.status,
            "sent_at": o.sent_at,
            "responded_at": o.responded_at
        })
    return response


@router.post("/{offer_id}/respond")
async def respond_to_offer(
    offer_id: int,
    req: OfferResponseUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Accept or decline an offer (Candidate only)."""
    if req.status not in ("accepted", "declined"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status must be either 'accepted' or 'declined'."
        )

    # 1. Fetch offer
    offer_stmt = select(Offer).where(Offer.id == offer_id)
    offer_res = await db.execute(offer_stmt)
    offer = offer_res.scalar_one_or_none()
    if not offer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job offer not found."
        )

    # 2. Verify candidate owner
    cand_stmt = select(Candidate).where(Candidate.id == offer.candidate_id)
    cand_res = await db.execute(cand_stmt)
    candidate = cand_res.scalar_one_or_none()
    if current_user.role == "candidate" and (not candidate or candidate.user_id != current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied."
        )

    # 3. Update status
    offer.status = req.status
    offer.responded_at = datetime.utcnow()
    await db.commit()
    await db.refresh(offer)
    return offer

@router.get("/analytics")
async def get_offer_analytics(
    current_hr: User = Depends(get_current_hr_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve offer conversion rate and metrics (HR only)."""
    from sqlalchemy import func
    total_stmt = await db.execute(select(func.count(Offer.id)))
    total = total_stmt.scalar_one() or 0
    
    accepted_stmt = await db.execute(select(func.count(Offer.id)).where(Offer.status == "accepted"))
    accepted = accepted_stmt.scalar_one() or 0
    
    declined_stmt = await db.execute(select(func.count(Offer.id)).where(Offer.status == "declined"))
    declined = declined_stmt.scalar_one() or 0
    
    pending_stmt = await db.execute(select(func.count(Offer.id)).where(Offer.status.in_(["pending", "pending_approval"])))
    pending = pending_stmt.scalar_one() or 0
    
    conversion_rate = round((accepted / total) * 100.0, 2) if total > 0 else 0.0
    
    return {
        "total_offers": total,
        "accepted_offers": accepted,
        "declined_offers": declined,
        "pending_offers": pending,
        "conversion_rate": conversion_rate
    }

@router.post("/{offer_id}/approve")
async def approve_offer(
    offer_id: int,
    current_hr: User = Depends(get_current_hr_user),
    db: AsyncSession = Depends(get_db)
):
    """Approve a job offer (HR only)."""
    offer_stmt = select(Offer).where(Offer.id == offer_id)
    offer_res = await db.execute(offer_stmt)
    offer = offer_res.scalar_one_or_none()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
        
    offer.status = "approved"
    await db.commit()
    await db.refresh(offer)
    return offer

@router.post("/{offer_id}/reject-approval")
async def reject_approval(
    offer_id: int,
    current_hr: User = Depends(get_current_hr_user),
    db: AsyncSession = Depends(get_db)
):
    """Reject approval for a job offer (HR only)."""
    offer_stmt = select(Offer).where(Offer.id == offer_id)
    offer_res = await db.execute(offer_stmt)
    offer = offer_res.scalar_one_or_none()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
        
    offer.status = "rejected_approval"
    await db.commit()
    await db.refresh(offer)
    return offer
