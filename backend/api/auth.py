"""
Authentication API Endpoints

Handles user registration, login, and fetching current session information.
"""

from datetime import timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from models.database import get_db
from models.models import User, Candidate
from utils.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)

router = APIRouter(prefix="/api/auth", tags=["authentication"])

# --- Request / Response Schemas ---
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2)
    role: str = Field("candidate", pattern="^(candidate|hr)$")

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str

    class Config:
        from_attributes = True

class AuthResponse(BaseModel):
    user: UserResponse
    token: str
    candidate_id: Optional[int] = None

# --- Route Handlers ---

@router.post("/register", response_model=AuthResponse)
async def register(user_in: UserRegister, db: AsyncSession = Depends(get_db)):
    """Register a new user (Candidate or HR)."""
    # Check if user already exists
    result = await db.execute(select(User).where(User.email == user_in.email))
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    # Hash the password and save the user
    new_user = User(
        email=user_in.email,
        password_hash=hash_password(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role
    )
    db.add(new_user)
    await db.flush()  # Populates new_user.id

    candidate_id = None
    if user_in.role == "candidate":
        # Automatically create candidate profile
        new_candidate = Candidate(user_id=new_user.id)
        db.add(new_candidate)
        await db.flush()
        candidate_id = new_candidate.id

    await db.commit()

    # Generate access token
    access_token = create_access_token(data={"sub": new_user.email, "role": new_user.role})
    
    return {
        "user": new_user,
        "token": access_token,
        "candidate_id": candidate_id
    }

@router.post("/login", response_model=AuthResponse)
async def login(user_in: UserLogin, db: AsyncSession = Depends(get_db)):
    """Log in with email and password and return access token."""
    result = await db.execute(select(User).where(User.email == user_in.email))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(user_in.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    candidate_id = None
    if user.role == "candidate":
        candidate_res = await db.execute(select(Candidate).where(Candidate.user_id == user.id))
        candidate = candidate_res.scalar_one_or_none()
        if candidate:
            candidate_id = candidate.id

    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    
    return {
        "user": user,
        "token": access_token,
        "candidate_id": candidate_id
    }

@router.get("/me")
async def get_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Fetch the currently logged in user profile details."""
    response_data = {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "candidate": None
    }

    if current_user.role == "candidate":
        result = await db.execute(select(Candidate).where(Candidate.user_id == current_user.id))
        candidate = result.scalar_one_or_none()
        if candidate:
            response_data["candidate"] = {
                "id": candidate.id,
                "phone": candidate.phone,
                "education": candidate.education,
                "years_experience": candidate.years_experience,
                "current_title": candidate.current_title,
                "summary": candidate.summary
            }
            
    return response_data
