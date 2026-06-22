from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from models.database import get_db
from models.models import User, Candidate, ChatMessage
from api.auth import get_current_user
from services.chatbot_service import get_chatbot_service
from sqlalchemy import select

router = APIRouter(prefix="/api/chatbot", tags=["chatbot"])

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    message: str

from fastapi.responses import StreamingResponse
from models.database import AsyncSessionLocal
import json

@router.post("")
async def send_message(req: ChatRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "candidate":
        raise HTTPException(status_code=403, detail="Only candidates can use the chatbot")
        
    result = await db.execute(select(Candidate).where(Candidate.user_id == current_user.id))
    candidate = result.scalars().first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate profile not found")

    # Fetch history
    query = select(ChatMessage).where(ChatMessage.candidate_id == candidate.id)
    if req.session_id:
        query = query.where(ChatMessage.session_id == req.session_id)
    query = query.order_by(ChatMessage.created_at.asc())
    
    history_records = (await db.execute(query)).scalars().all()
    history = [{"role": m.role, "content": m.content} for m in history_records]
    
    candidate_info = {
        "name": current_user.full_name,
        "experience": candidate.years_experience,
        "education": candidate.education
    }
    
    bot_service = get_chatbot_service()
    
    # Save user message immediately
    user_msg = ChatMessage(candidate_id=candidate.id, role="user", content=req.message, session_id=req.session_id)
    db.add(user_msg)
    await db.commit()

    async def stream_generator():
        full_response = ""
        try:
            for chunk in bot_service.generate_response_stream(candidate.id, req.message, history, candidate_info):
                full_response += chunk
                yield json.dumps({"response": chunk}) + "\n"
        except Exception as e:
            yield json.dumps({"error": "I am currently experiencing technical difficulties."}) + "\n"
            full_response = "I am currently experiencing technical difficulties."

        # Save bot message to DB asynchronously
        async with AsyncSessionLocal() as session:
            bot_msg = ChatMessage(candidate_id=candidate.id, role="assistant", content=full_response, session_id=req.session_id)
            session.add(bot_msg)
            await session.commit()

    return StreamingResponse(stream_generator(), media_type="application/x-ndjson")

@router.get("/history")
async def get_history(session_id: Optional[str] = None, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Candidate).where(Candidate.user_id == current_user.id))
    candidate = result.scalars().first()
    if not candidate:
        return []
        
    query = select(ChatMessage).where(ChatMessage.candidate_id == candidate.id)
    if session_id:
        query = query.where(ChatMessage.session_id == session_id)
    query = query.order_by(ChatMessage.created_at.asc())
    
    records = (await db.execute(query)).scalars().all()
    return records

@router.delete("/session")
async def clear_session(session_id: Optional[str] = None, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    return {"status": "ok"}
