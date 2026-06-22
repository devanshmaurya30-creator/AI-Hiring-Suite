"""
Application Settings

Centralized configuration management using pydantic-settings.
All settings are loaded from environment variables and/or .env file.
"""

import logging
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

# Resolve the .env file path (project root is 2 levels up from config/)
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
_ENV_FILE = _PROJECT_ROOT / ".env"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # --- API Keys ---
    GEMINI_API_KEY: str = ""

    # --- Database ---
    DATABASE_URL: str = "sqlite+aiosqlite:///./ai_hiring.db"

    # --- JWT Authentication ---
    JWT_SECRET: str = "change-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24

    # --- File Uploads ---
    UPLOAD_PATH: str = "./uploads"

    # --- CORS ---
    CORS_ORIGINS: list[str] = [
    "http://localhost:3000",
    "https://ai-hiring-suite-s4cs.vercel.app",
]

    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Get cached application settings singleton."""
    return Settings()


def validate_settings() -> Settings:
    """
    Validate critical settings on startup.

    Logs a masked version of the API key and raises ValueError
    if GEMINI_API_KEY is not configured.

    Returns:
        The validated Settings instance.

    Raises:
        ValueError: If GEMINI_API_KEY is empty or not set.
    """
    settings = get_settings()

    # Validate GEMINI_API_KEY
    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "your_gemini_api_key_here":
        raise ValueError(
            "GEMINI_API_KEY is not configured. "
            "Please set it in your .env file or environment variables."
        )

    # Log masked API key
    key = settings.GEMINI_API_KEY
    masked = key[:4] + "*" * (len(key) - 8) + key[-4:] if len(key) > 8 else "****"
    logger.info(f"GEMINI_API_KEY: {masked}")
    logger.info(f"DATABASE_URL: {settings.DATABASE_URL}")
    logger.info(f"UPLOAD_PATH: {settings.UPLOAD_PATH}")
    logger.info(f"CORS_ORIGINS: {settings.CORS_ORIGINS}")

    return settings


# Log on module import
logger.info("Configuration loaded successfully")
