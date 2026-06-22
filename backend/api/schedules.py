from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from models.database import get_db
from models.models import User, Candidate, Job, InterviewSchedule, EmailLog
from api.auth import get_current_user
from services.email_service import get_email_service
import uuid

router = APIRouter(prefix="/api/schedules", tags=["Schedules"])

def generate_ics(schedule_id: int, dt: datetime, duration: int, candidate_name: str, meeting_link: str) -> str:
    start_str = dt.strftime("%Y%m%dT%H%M%SZ")
    end_dt = dt + timedelta(minutes=duration)
    end_str = end_dt.strftime("%Y%m%dT%H%M%SZ")
    uid = f"ai-hiring-schedule-{schedule_id}-{uuid.uuid4()}@aihiring.local"
    link_str = f"LOCATION:{meeting_link}\n" if meeting_link else ""
    return f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//AI Hiring Assistant//EN
BEGIN:VEVENT
UID:{uid}
DTSTAMP:{start_str}
DTSTART:{start_str}
DTEND:{end_str}
SUMMARY:Interview for {candidate_name}
{link_str}DESCRIPTION:AI Hiring Assistant Interview Scheduled. Please join on time.
END:VEVENT
END:VCALENDAR"""

# Pydantic Schemas
class ScheduleCreate(BaseModel):
    candidate_id: int
    job_id: Optional[int] = None
    scheduled_time: datetime
    duration_minutes: int = 60
    meeting_link: Optional[str] = None

class ScheduleUpdate(BaseModel):
    scheduled_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    meeting_link: Optional[str] = None
    
class ScheduleStatusUpdate(BaseModel):
    status: str

class CandidateInfo(BaseModel):
    id: int
    user_id: int
    full_name: str
    email: str

class JobInfo(BaseModel):
    id: int
    title: str

class ScheduleResponse(BaseModel):
    id: int
    candidate_id: int
    job_id: Optional[int]
    scheduled_time: datetime
    duration_minutes: int
    meeting_link: Optional[str]
    status: str
    created_at: datetime
    candidate: Optional[CandidateInfo] = None
    job: Optional[JobInfo] = None

    class Config:
        from_attributes = True


@router.post("/", response_model=ScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_schedule(
    data: ScheduleCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new interview schedule."""
    if current_user.role != "hr":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only HR can schedule interviews.")

    # Verify Candidate
    cand_stmt = select(Candidate).options(selectinload(Candidate.user)).where(Candidate.id == data.candidate_id)
    cand_res = await db.execute(cand_stmt)
    candidate = cand_res.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found.")

    # Verify Job if provided
    if data.job_id:
        job_stmt = select(Job).where(Job.id == data.job_id)
        job_res = await db.execute(job_stmt)
        if not job_res.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")

    new_schedule = InterviewSchedule(
        candidate_id=data.candidate_id,
        job_id=data.job_id,
        scheduled_time=data.scheduled_time,
        duration_minutes=data.duration_minutes,
        meeting_link=data.meeting_link,
        status="scheduled"
    )
    db.add(new_schedule)
    await db.commit()
    await db.refresh(new_schedule)
    
    # Send Email Notification
    cand_user_stmt = select(User).where(User.id == candidate.user_id)
    cand_user_res = await db.execute(cand_user_stmt)
    cand_user = cand_user_res.scalar_one_or_none()
    
    if cand_user:
        ics = generate_ics(
            new_schedule.id, new_schedule.scheduled_time, new_schedule.duration_minutes, 
            cand_user.full_name, new_schedule.meeting_link
        )
        body = f"<p>Dear {cand_user.full_name},</p><p>Your interview has been scheduled for {new_schedule.scheduled_time}.</p>"
        if new_schedule.meeting_link:
            body += f"<p>Meeting Link: <a href='{new_schedule.meeting_link}'>{new_schedule.meeting_link}</a></p>"
        
        email_service = get_email_service()
        success = await email_service.send_email(
            recipient=cand_user.email,
            subject="Interview Scheduled",
            html_body=body,
            ics_content=ics
        )
        
        log = EmailLog(
            candidate_id=candidate.id,
            job_id=data.job_id,
            email_type="interview_scheduled",
            recipient_email=cand_user.email,
            subject="Interview Scheduled",
            body=body,
            status="sent" if success else "failed",
            sent_at=datetime.utcnow() if success else None
        )
        db.add(log)
        await db.commit()

    # Convert to response
    return ScheduleResponse(
        id=new_schedule.id,
        candidate_id=new_schedule.candidate_id,
        job_id=new_schedule.job_id,
        scheduled_time=new_schedule.scheduled_time,
        duration_minutes=new_schedule.duration_minutes,
        meeting_link=new_schedule.meeting_link,
        status=new_schedule.status,
        created_at=new_schedule.created_at,
        candidate=CandidateInfo(
            id=candidate.id,
            user_id=candidate.user_id,
            full_name=candidate.user.full_name,
            email=candidate.user.email
        ),
        job=JobInfo(id=data.job_id, title="Job Title") if data.job_id else None  # Simplify for response
    )


@router.get("/", response_model=List[ScheduleResponse])
async def list_schedules(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all schedules. If HR, see all. If Candidate, see own."""
    stmt = select(InterviewSchedule).options(
        selectinload(InterviewSchedule.candidate).selectinload(Candidate.user),
        selectinload(InterviewSchedule.job)
    ).order_by(InterviewSchedule.scheduled_time.asc())

    if current_user.role == "candidate":
        cand_stmt = select(Candidate).where(Candidate.user_id == current_user.id)
        cand_res = await db.execute(cand_stmt)
        candidate = cand_res.scalar_one_or_none()
        if not candidate:
            return []
        stmt = stmt.where(InterviewSchedule.candidate_id == candidate.id)

    res = await db.execute(stmt)
    schedules = res.scalars().all()

    responses = []
    for s in schedules:
        c_info = None
        if s.candidate and s.candidate.user:
            c_info = CandidateInfo(
                id=s.candidate.id,
                user_id=s.candidate.user.id,
                full_name=s.candidate.user.full_name,
                email=s.candidate.user.email
            )
        j_info = None
        if s.job:
            j_info = JobInfo(id=s.job.id, title=s.job.title)

        responses.append(ScheduleResponse(
            id=s.id,
            candidate_id=s.candidate_id,
            job_id=s.job_id,
            scheduled_time=s.scheduled_time,
            duration_minutes=s.duration_minutes,
            meeting_link=s.meeting_link,
            status=s.status,
            created_at=s.created_at,
            candidate=c_info,
            job=j_info
        ))
    return responses


@router.put("/{schedule_id}/status", response_model=ScheduleResponse)
async def update_status(
    schedule_id: int,
    data: ScheduleStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update status of a schedule (e.g., canceled, completed)."""
    if current_user.role != "hr":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only HR can update status.")

    stmt = select(InterviewSchedule).options(
        selectinload(InterviewSchedule.candidate).selectinload(Candidate.user),
        selectinload(InterviewSchedule.job)
    ).where(InterviewSchedule.id == schedule_id)
    
    res = await db.execute(stmt)
    schedule = res.scalar_one_or_none()
    
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found.")

    schedule.status = data.status
    await db.commit()
    await db.refresh(schedule)

    c_info = None
    if schedule.candidate and schedule.candidate.user:
        c_info = CandidateInfo(
            id=schedule.candidate.id,
            user_id=schedule.candidate.user.id,
            full_name=schedule.candidate.user.full_name,
            email=schedule.candidate.user.email
        )
    j_info = None
    if schedule.job:
        j_info = JobInfo(id=schedule.job.id, title=schedule.job.title)

    return ScheduleResponse(
        id=schedule.id,
        candidate_id=schedule.candidate_id,
        job_id=schedule.job_id,
        scheduled_time=schedule.scheduled_time,
        duration_minutes=schedule.duration_minutes,
        meeting_link=schedule.meeting_link,
        status=schedule.status,
        created_at=schedule.created_at,
        candidate=c_info,
        job=j_info
    )

@router.put("/{schedule_id}", response_model=ScheduleResponse)
async def update_schedule(
    schedule_id: int,
    data: ScheduleUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Edit or Reschedule an interview."""
    if current_user.role != "hr":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only HR can edit schedules.")

    stmt = select(InterviewSchedule).options(
        selectinload(InterviewSchedule.candidate).selectinload(Candidate.user),
        selectinload(InterviewSchedule.job)
    ).where(InterviewSchedule.id == schedule_id)
    
    res = await db.execute(stmt)
    schedule = res.scalar_one_or_none()
    
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found.")

    rescheduled = False
    if data.scheduled_time and data.scheduled_time != schedule.scheduled_time:
        schedule.scheduled_time = data.scheduled_time
        rescheduled = True
    
    if data.duration_minutes:
        schedule.duration_minutes = data.duration_minutes
    if data.meeting_link is not None:
        schedule.meeting_link = data.meeting_link
        
    if rescheduled:
        schedule.status = "rescheduled"
        
    await db.commit()
    await db.refresh(schedule)
    
    c_info = None
    if schedule.candidate and schedule.candidate.user:
        c_info = CandidateInfo(
            id=schedule.candidate.id,
            user_id=schedule.candidate.user.id,
            full_name=schedule.candidate.user.full_name,
            email=schedule.candidate.user.email
        )
        
        # Send update email
        if rescheduled:
            ics = generate_ics(schedule.id, schedule.scheduled_time, schedule.duration_minutes, c_info.full_name, schedule.meeting_link)
            body = f"<p>Dear {c_info.full_name},</p><p>Your interview has been rescheduled to {schedule.scheduled_time}.</p>"
            email_service = get_email_service()
            success = await email_service.send_email(c_info.email, "Interview Rescheduled", body, ics)
            log = EmailLog(candidate_id=c_info.id, job_id=schedule.job_id, email_type="interview_rescheduled", recipient_email=c_info.email, subject="Interview Rescheduled", body=body, status="sent" if success else "failed", sent_at=datetime.utcnow() if success else None)
            db.add(log)
            await db.commit()

    j_info = None
    if schedule.job:
        j_info = JobInfo(id=schedule.job.id, title=schedule.job.title)

    return ScheduleResponse(
        id=schedule.id, candidate_id=schedule.candidate_id, job_id=schedule.job_id,
        scheduled_time=schedule.scheduled_time, duration_minutes=schedule.duration_minutes,
        meeting_link=schedule.meeting_link, status=schedule.status, created_at=schedule.created_at,
        candidate=c_info, job=j_info
    )

@router.post("/{schedule_id}/cancel", response_model=ScheduleResponse)
async def cancel_schedule(
    schedule_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Cancel an interview schedule."""
    if current_user.role != "hr":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only HR can cancel schedules.")

    stmt = select(InterviewSchedule).options(
        selectinload(InterviewSchedule.candidate).selectinload(Candidate.user),
        selectinload(InterviewSchedule.job)
    ).where(InterviewSchedule.id == schedule_id)
    
    res = await db.execute(stmt)
    schedule = res.scalar_one_or_none()
    
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found.")

    schedule.status = "canceled"
    await db.commit()
    await db.refresh(schedule)
    
    c_info = None
    if schedule.candidate and schedule.candidate.user:
        c_info = CandidateInfo(
            id=schedule.candidate.id,
            user_id=schedule.candidate.user.id,
            full_name=schedule.candidate.user.full_name,
            email=schedule.candidate.user.email
        )
        
        body = f"<p>Dear {c_info.full_name},</p><p>Your interview scheduled for {schedule.scheduled_time} has been canceled.</p>"
        email_service = get_email_service()
        success = await email_service.send_email(c_info.email, "Interview Canceled", body)
        log = EmailLog(candidate_id=c_info.id, job_id=schedule.job_id, email_type="interview_canceled", recipient_email=c_info.email, subject="Interview Canceled", body=body, status="sent" if success else "failed", sent_at=datetime.utcnow() if success else None)
        db.add(log)
        await db.commit()

    j_info = None
    if schedule.job:
        j_info = JobInfo(id=schedule.job.id, title=schedule.job.title)

    return ScheduleResponse(
        id=schedule.id, candidate_id=schedule.candidate_id, job_id=schedule.job_id,
        scheduled_time=schedule.scheduled_time, duration_minutes=schedule.duration_minutes,
        meeting_link=schedule.meeting_link, status=schedule.status, created_at=schedule.created_at,
        candidate=c_info, job=j_info
    )
