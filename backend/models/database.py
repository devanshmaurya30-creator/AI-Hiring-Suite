"""
Database Configuration

Sets up the async SQLAlchemy database engine and session factory.
"""

from typing import AsyncGenerator
import logging
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Create async database engine
# SQLite requires check_same_thread=False for multi-threaded access
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False
    connect_args["timeout"] = 30

engine = create_async_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False,
)

# Async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# SQLAlchemy 2.0 declarative base using the new DeclarativeBase class.
# This supports Mapped[] annotations natively — no __allow_unmapped__ needed.
class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency injection helper to get a database session.
    Yields an AsyncSession and ensures it's closed after use.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """
    Initialize database. Creates all tables if they do not exist.
    """
    try:
        async with engine.begin() as conn:
            from models.models import Base as ModelBase
            await conn.run_sync(ModelBase.metadata.create_all)
        logger.info("Database initialized successfully.")
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        raise
