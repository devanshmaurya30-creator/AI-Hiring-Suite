"""
Database Seed Script

Populates the database with initial data from CSV datasets.
Creates demo users, skills, and sample job postings.

Usage:
    python -m database.seed.seed_data
    OR
    python database/seed/seed_data.py
"""

import asyncio
import csv
import hashlib
import logging
import os
import sys
from pathlib import Path

import aiosqlite
from dotenv import load_dotenv

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Resolve project root (2 levels up from database/seed/)
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(PROJECT_ROOT / ".env")

# Try to import bcrypt directly, then passlib, then hashlib
try:
    import bcrypt
    def hash_password(password: str) -> str:
        return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
except ImportError:
    try:
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        def hash_password(password: str) -> str:
            return pwd_context.hash(password)
    except Exception:
        logger.warning("bcrypt/passlib not installed, using sha256 fallback for password hashing")
        def hash_password(password: str) -> str:
            return hashlib.sha256(password.encode()).hexdigest()


def get_db_path() -> str:
    """Extract SQLite database path from DATABASE_URL."""
    db_url = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./ai_hiring.db")
    # Parse sqlite URL: sqlite+aiosqlite:///./ai_hiring.db -> ./ai_hiring.db
    if "///" in db_url:
        db_path = db_url.split("///")[-1]
    else:
        db_path = "./ai_hiring.db"

    # Resolve relative paths against project root
    if db_path.startswith("."):
        db_path = str(PROJECT_ROOT / db_path)

    return db_path


async def create_tables(db: aiosqlite.Connection) -> None:
    """Create all database tables if they don't exist."""
    logger.info("Creating database tables...")

    await db.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            full_name VARCHAR(255) NOT NULL,
            role VARCHAR(20) NOT NULL DEFAULT 'candidate' CHECK (role IN ('hr', 'candidate')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS candidates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            phone VARCHAR(20),
            education TEXT,
            years_experience FLOAT DEFAULT 0,
            current_title VARCHAR(255),
            summary TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS resumes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
            filename VARCHAR(255) NOT NULL,
            file_path VARCHAR(500) NOT NULL,
            file_type VARCHAR(10) NOT NULL,
            parsed_data JSON,
            raw_text TEXT,
            status VARCHAR(20) DEFAULT 'uploaded',
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title VARCHAR(255) NOT NULL,
            company VARCHAR(255),
            description TEXT NOT NULL,
            required_skills TEXT,
            min_experience FLOAT DEFAULT 0,
            max_experience FLOAT,
            responsibilities TEXT,
            location VARCHAR(255),
            salary_range VARCHAR(100),
            status VARCHAR(20) DEFAULT 'active',
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS skills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(100) UNIQUE NOT NULL,
            category VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS candidate_skills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
            skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
            proficiency_level VARCHAR(20) DEFAULT 'intermediate',
            source VARCHAR(20) DEFAULT 'resume',
            UNIQUE (candidate_id, skill_id)
        );

        CREATE TABLE IF NOT EXISTS interviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
            job_id INTEGER REFERENCES jobs(id),
            interview_type VARCHAR(20) NOT NULL CHECK (interview_type IN ('technical', 'hr')),
            status VARCHAR(20) DEFAULT 'pending',
            total_score FLOAT,
            feedback TEXT,
            started_at TIMESTAMP,
            completed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS interview_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            interview_id INTEGER NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
            question_text TEXT NOT NULL,
            expected_answer TEXT,
            candidate_answer TEXT,
            score FLOAT,
            feedback TEXT,
            question_number INTEGER
        );

        CREATE TABLE IF NOT EXISTS rankings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
            job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
            resume_score FLOAT DEFAULT 0,
            skill_match_score FLOAT DEFAULT 0,
            experience_score FLOAT DEFAULT 0,
            interview_score FLOAT DEFAULT 0,
            overall_score FLOAT DEFAULT 0,
            recommendation VARCHAR(20),
            ranked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (candidate_id, job_id)
        );

        -- Indexes
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
        CREATE INDEX IF NOT EXISTS idx_candidates_user_id ON candidates(user_id);
        CREATE INDEX IF NOT EXISTS idx_resumes_candidate_id ON resumes(candidate_id);
        CREATE INDEX IF NOT EXISTS idx_resumes_status ON resumes(status);
        CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
        CREATE INDEX IF NOT EXISTS idx_jobs_created_by ON jobs(created_by);
        CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name);
        CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);
        CREATE INDEX IF NOT EXISTS idx_candidate_skills_candidate_id ON candidate_skills(candidate_id);
        CREATE INDEX IF NOT EXISTS idx_candidate_skills_skill_id ON candidate_skills(skill_id);
        CREATE INDEX IF NOT EXISTS idx_interviews_candidate_id ON interviews(candidate_id);
        CREATE INDEX IF NOT EXISTS idx_interviews_job_id ON interviews(job_id);
        CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews(status);
        CREATE INDEX IF NOT EXISTS idx_interview_results_interview_id ON interview_results(interview_id);
        CREATE INDEX IF NOT EXISTS idx_rankings_candidate_id ON rankings(candidate_id);
        CREATE INDEX IF NOT EXISTS idx_rankings_job_id ON rankings(job_id);
        CREATE INDEX IF NOT EXISTS idx_rankings_overall_score ON rankings(overall_score);
    """)

    await db.commit()
    logger.info("Database tables created successfully")


async def seed_users(db: aiosqlite.Connection) -> dict[str, int]:
    """Create demo HR and candidate users. Returns dict of email -> user_id."""
    logger.info("Seeding demo users...")

    demo_users = [
        {
            "email": "hr@demo.com",
            "password": "password123",
            "full_name": "HR Manager",
            "role": "hr"
        },
        {
            "email": "candidate@demo.com",
            "password": "password123",
            "full_name": "Demo Candidate",
            "role": "candidate"
        }
    ]

    user_ids = {}

    for user in demo_users:
        # Check if user already exists
        cursor = await db.execute(
            "SELECT id FROM users WHERE email = ?", (user["email"],)
        )
        existing = await cursor.fetchone()

        if existing:
            user_ids[user["email"]] = existing[0]
            logger.info(f"User {user['email']} already exists (id={existing[0]})")
            continue

        hashed = hash_password(user["password"])
        cursor = await db.execute(
            "INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)",
            (user["email"], hashed, user["full_name"], user["role"])
        )
        user_ids[user["email"]] = cursor.lastrowid
        logger.info(f"Created user: {user['email']} (id={cursor.lastrowid})")

    # Create candidate profile for the demo candidate
    candidate_user_id = user_ids.get("candidate@demo.com")
    if candidate_user_id:
        cursor = await db.execute(
            "SELECT id FROM candidates WHERE user_id = ?", (candidate_user_id,)
        )
        if not await cursor.fetchone():
            await db.execute(
                "INSERT INTO candidates (user_id, education, years_experience, current_title, summary) VALUES (?, ?, ?, ?, ?)",
                (
                    candidate_user_id,
                    "Bachelor's in Computer Science",
                    3.0,
                    "Software Developer",
                    "Experienced software developer with expertise in Python and web technologies."
                )
            )
            logger.info("Created candidate profile for candidate@demo.com")

    await db.commit()
    return user_ids


async def seed_skills(db: aiosqlite.Connection) -> None:
    """Seed skills from the skills dataset CSV."""
    logger.info("Seeding skills from dataset...")

    skills_csv = PROJECT_ROOT / "datasets" / "skills" / "raw" / "skills.csv"

    if not skills_csv.exists():
        logger.warning(f"Skills CSV not found at {skills_csv}, using default skills")
        skills = ["Python", "Java", "React", "Node.js", "SQL", "AWS", "Docker", "Power BI"]
    else:
        skills = []
        with open(skills_csv, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                skill_name = row.get("skill", "").strip()
                if skill_name:
                    skills.append(skill_name)
        logger.info(f"Loaded {len(skills)} skills from CSV")

    # Define skill categories
    skill_categories = {
        "Python": "Programming Language",
        "Java": "Programming Language",
        "React": "Frontend Framework",
        "Node.js": "Backend Runtime",
        "SQL": "Database",
        "AWS": "Cloud Platform",
        "Docker": "DevOps",
        "Power BI": "Data Visualization",
    }

    inserted = 0
    for skill in skills:
        cursor = await db.execute(
            "SELECT id FROM skills WHERE name = ?", (skill,)
        )
        if not await cursor.fetchone():
            category = skill_categories.get(skill, "General")
            await db.execute(
                "INSERT INTO skills (name, category) VALUES (?, ?)",
                (skill, category)
            )
            inserted += 1

    await db.commit()
    logger.info(f"Inserted {inserted} new skills")


async def seed_jobs(db: aiosqlite.Connection, hr_user_id: int) -> None:
    """Seed jobs from the training_data.csv dataset (first 50 rows)."""
    logger.info("Seeding jobs from dataset...")

    jobs_csv = PROJECT_ROOT / "datasets" / "jobs" / "raw" / "training_data.csv"

    if not jobs_csv.exists():
        logger.warning(f"Jobs CSV not found at {jobs_csv}, skipping job seeding")
        return

    inserted = 0
    with open(jobs_csv, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader):
            if i >= 50:
                break

            title = row.get("position_title", "Untitled Position").strip()
            company = row.get("company_name", "").strip()
            description = row.get("job_description", "").strip()

            if not title or not description:
                continue

            # Check for duplicate
            cursor = await db.execute(
                "SELECT id FROM jobs WHERE title = ? AND company = ?",
                (title, company)
            )
            if await cursor.fetchone():
                continue

            await db.execute(
                """INSERT INTO jobs (title, company, description, status, created_by)
                   VALUES (?, ?, ?, 'active', ?)""",
                (title, company, description, hr_user_id)
            )
            inserted += 1

    await db.commit()
    logger.info(f"Inserted {inserted} jobs from dataset")


async def verify_datasets() -> dict[str, bool]:
    """Verify all expected dataset files exist."""
    datasets = {
        "skills": PROJECT_ROOT / "datasets" / "skills" / "raw" / "skills.csv",
        "resumes": PROJECT_ROOT / "datasets" / "resumes" / "raw" / "ml_resume_dataset_4500.csv",
        "jobs": PROJECT_ROOT / "datasets" / "jobs" / "raw" / "training_data.csv",
        "interviews": PROJECT_ROOT / "datasets" / "interviews" / "raw" / "Software Questions.csv",
    }

    results = {}
    for name, path in datasets.items():
        exists = path.exists()
        results[name] = exists
        status = "FOUND" if exists else "MISSING"
        logger.info(f"Dataset '{name}': {status} ({path})")

    return results


async def print_summary(db: aiosqlite.Connection) -> None:
    """Print a summary of seeded data."""
    logger.info("\n" + "=" * 50)
    logger.info("SEED DATA SUMMARY")
    logger.info("=" * 50)

    tables = ["users", "candidates", "skills", "jobs", "resumes", "interviews", "rankings"]
    for table in tables:
        cursor = await db.execute(f"SELECT COUNT(*) FROM {table}")
        count = (await cursor.fetchone())[0]
        logger.info(f"  {table}: {count} rows")

    logger.info("=" * 50)


async def main() -> None:
    """Main seed function."""
    logger.info("Starting database seeding...")
    logger.info(f"Project root: {PROJECT_ROOT}")

    # Verify datasets
    await verify_datasets()

    # Get database path
    db_path = get_db_path()
    logger.info(f"Database path: {db_path}")

    # Ensure parent directory exists
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)

    async with aiosqlite.connect(db_path) as db:
        # Enable foreign keys for SQLite
        await db.execute("PRAGMA foreign_keys = ON")

        # Create tables
        await create_tables(db)

        # Seed data
        user_ids = await seed_users(db)
        await seed_skills(db)

        hr_user_id = user_ids.get("hr@demo.com", 1)
        await seed_jobs(db, hr_user_id)

        # Print summary
        await print_summary(db)

    logger.info("Database seeding completed successfully!")


if __name__ == "__main__":
    asyncio.run(main())
