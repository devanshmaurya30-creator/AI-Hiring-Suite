"""
AI Hiring Assistant Backend Application

Bootstraps the FastAPI application, configures CORS, handles database schema
initialization, and registers all API endpoint routers.
"""

import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config.settings import get_settings, validate_settings
from models.database import init_db

# Import routers
from api.auth import router as auth_router
from api.resume import router as resume_router
from api.skills import router as skills_router
from api.jobs import router as jobs_router
from api.matching import router as matching_router
from api.ranking import router as ranking_router
from api.interview import router as interview_router
from api.dashboard import router as dashboard_router
from api.offers import router as offers_router
from api.schedules import router as schedules_router
from api.chatbot import router as chatbot_router
from api.email_pipeline import router as email_router
from api.predictions import router as predictions_router
from api.fraud import router as fraud_router

from utils.ingestion import ingest_all_datasets, RESUME_CSV_PATH
from services.ml_service import get_ml_service
from models.database import AsyncSessionLocal

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI Lifespan Context Manager.
    Performs critical configuration validation and database schema updates on startup.
    """
    logger.info("Starting up AI Hiring Assistant API...")
    
    # 1. Validate environment configuration
    try:
        validate_settings()
    except Exception as e:
        logger.error(f"Configuration Validation Error: {e}")
        # We don't crash the server so mock/offline fallbacks can still be used if user wishes,
        # but raise if database is inaccessible.
        
    # 2. Initialize database schema (Creates SQL tables if not exists)
    try:
        await init_db()
    except Exception as e:
        logger.error(f"Critical Database Initialization Failure: {e}")
        raise e

    # 3. Seed datasets and train machine learning models on startup
    try:
        async with AsyncSessionLocal() as db:
            ingest_stats = await ingest_all_datasets(db)
            logger.info(f"Database Ingestion Stats: {ingest_stats}")
            
        ml_service = get_ml_service()
        if os.path.exists(RESUME_CSV_PATH):
            logger.info("Training candidate suitability ranking classifier...")
            ml_service.train_suitability_model(RESUME_CSV_PATH)
        else:
            logger.warning(f"Resume dataset not found at {RESUME_CSV_PATH}, cannot train ML ranking model.")
    except Exception as e:
        logger.error(f"Failed to complete database seeding/ML pre-training: {e}")
        
    yield
    
    logger.info("Shutting down AI Hiring Assistant API...")

# Initialize FastAPI App with lifespan context
app = FastAPI(
    title="AI Hiring Assistant API",
    description="Automated Recruiting, Resume Parsing, Candidate Matching & Dynamic AI Interviews",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all endpoint routers
app.include_router(auth_router)
app.include_router(resume_router)
app.include_router(skills_router)
app.include_router(jobs_router)
app.include_router(matching_router)
app.include_router(ranking_router)
app.include_router(interview_router)
app.include_router(dashboard_router)
app.include_router(offers_router)
app.include_router(schedules_router)
app.include_router(chatbot_router)
app.include_router(email_router)
app.include_router(predictions_router)
app.include_router(fraud_router)

@app.get("/")
async def root():
    """Root Endpoint."""
    return {
        "message": "AI Hiring Assistant API",
        "version": "1.0.0",
        "status": "online"
    }

@app.get("/api/health")
async def health_check():
    """Health check endpoint for monitoring."""
    return {
        "status": "healthy",
        "database": "connected"
    }
