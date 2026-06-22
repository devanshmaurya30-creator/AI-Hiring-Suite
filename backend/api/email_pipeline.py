from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.database import get_db
from models.models import User, Candidate, EmailLog, Job
from api.auth import get_current_user
from services.email_service import get_email_service
import datetime

router = APIRouter(prefix="/api/emails", tags=["emails"])

class EmailSendRequest(BaseModel):
    candidate_id: int
    job_id: Optional[int] = None
    email_type: str

class EmailBulkSendRequest(BaseModel):
    candidate_ids: List[int]
    job_id: Optional[int] = None
    email_type: str

@router.post("/send")
async def send_email(req: EmailSendRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "hr":
        raise HTTPException(status_code=403, detail="Only HR can send emails")
        
    cand_res = await db.execute(select(Candidate).where(Candidate.id == req.candidate_id))
    candidate = cand_res.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    user_res = await db.execute(select(User).where(User.id == candidate.user_id))
    cand_user = user_res.scalar_one_or_none()
    
    subject = f"Update regarding your application - {req.email_type.replace('_', ' ').title()}"
    body_html = f"<p>Dear {cand_user.full_name},</p><p>This is a {req.email_type.replace('_', ' ')} regarding your recent application.</p><p>Best,<br>HR Team</p>"
    
    email_service = get_email_service()
    success = await email_service.send_email(cand_user.email, subject, body_html)
    
    log = EmailLog(
        candidate_id=candidate.id,
        job_id=req.job_id,
        email_type=req.email_type,
        recipient_email=cand_user.email,
        subject=subject,
        body=body_html,
        status="sent" if success else "failed",
        sent_at=datetime.datetime.utcnow() if success else None
    )
    db.add(log)
    await db.commit()
    return {"status": "sent" if success else "failed"}

@router.get("/logs")
async def get_email_logs(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "hr":
        raise HTTPException(status_code=403, detail="Only HR can view email logs")
    
    result = await db.execute(select(EmailLog).order_by(EmailLog.created_at.desc()))
    return result.scalars().all()

@router.post("/template-preview")
async def preview_template(req: EmailSendRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "hr":
        raise HTTPException(status_code=403, detail="Only HR can preview templates")
    
    subject = f"Preview: {req.email_type.replace('_', ' ').title()}"
    body_html = f"<p>Dear [Candidate Name],</p><p>This is a {req.email_type.replace('_', ' ')} regarding your recent application.</p><p>Best,<br>HR Team</p>"
    return {"subject": subject, "body_html": body_html}

@router.post("/bulk-send")
async def bulk_send(req: EmailBulkSendRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "hr":
        raise HTTPException(status_code=403, detail="Only HR can send emails")
    
    sent_count = 0
    for cand_id in req.candidate_ids:
        cand_res = await db.execute(select(Candidate).where(Candidate.id == cand_id))
        candidate = cand_res.scalar_one_or_none()
        if not candidate: continue
        user_res = await db.execute(select(User).where(User.id == candidate.user_id))
        cand_user = user_res.scalar_one_or_none()
        if not cand_user: continue
        
        subject = f"Update regarding your application - {req.email_type.replace('_', ' ').title()}"
        body_html = f"<p>Dear {cand_user.full_name},</p><p>This is a {req.email_type.replace('_', ' ')} regarding your recent application.</p><p>Best,<br>HR Team</p>"
        
        email_service = get_email_service()
        success = await email_service.send_email(cand_user.email, subject, body_html)
        log = EmailLog(
            candidate_id=candidate.id, job_id=req.job_id, email_type=req.email_type,
            recipient_email=cand_user.email, subject=subject, body=body_html,
            status="sent" if success else "failed", sent_at=datetime.datetime.utcnow() if success else None
        )
        db.add(log)
        if success: sent_count += 1
    
    await db.commit()
    return {"sent_count": sent_count}
