"""
Dataset Loader Utilities

Loads and parses CSV files from the datasets/ directory.
Caches datasets in memory using lru_cache for optimal startup and runtime performance.
"""

import os
from functools import lru_cache
from pathlib import Path
import pandas as pd

# Resolve paths relative to project root (2 levels up from backend/utils/)
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

SKILLS_CSV_PATH = _PROJECT_ROOT / "datasets" / "skills" / "raw" / "skills.csv"
RESUMES_CSV_PATH = _PROJECT_ROOT / "datasets" / "resumes" / "raw" / "ml_resume_dataset_4500.csv"
JOBS_CSV_PATH = _PROJECT_ROOT / "datasets" / "jobs" / "raw" / "training_data.csv"
INTERVIEWS_CSV_PATH = _PROJECT_ROOT / "datasets" / "interviews" / "raw" / "Software Questions.csv"

@lru_cache(maxsize=1)
def load_skills_dataset() -> list[str]:
    """Load base skills from skills.csv."""
    if not os.path.exists(SKILLS_CSV_PATH):
        raise FileNotFoundError(f"Skills dataset not found at {SKILLS_CSV_PATH}")
    
    df = pd.read_csv(SKILLS_CSV_PATH)
    # The column name is 'skill' as per database seed info
    column_name = 'skill' if 'skill' in df.columns else df.columns[0]
    return df[column_name].dropna().str.strip().tolist()

@lru_cache(maxsize=1)
def load_resumes_dataset() -> pd.DataFrame:
    """Load the machine learning resumes dataset."""
    if not os.path.exists(RESUMES_CSV_PATH):
        raise FileNotFoundError(f"Resumes dataset not found at {RESUMES_CSV_PATH}")
    
    return pd.read_csv(RESUMES_CSV_PATH)

@lru_cache(maxsize=1)
def load_jobs_dataset() -> pd.DataFrame:
    """Load the jobs dataset."""
    if not os.path.exists(JOBS_CSV_PATH):
        raise FileNotFoundError(f"Jobs dataset not found at {JOBS_CSV_PATH}")
    
    return pd.read_csv(JOBS_CSV_PATH)

@lru_cache(maxsize=1)
def load_interviews_dataset() -> pd.DataFrame:
    """Load the interview questions dataset (with latin-1 encoding)."""
    if not os.path.exists(INTERVIEWS_CSV_PATH):
        raise FileNotFoundError(f"Interviews dataset not found at {INTERVIEWS_CSV_PATH}")
    
    return pd.read_csv(INTERVIEWS_CSV_PATH, encoding="latin-1")

@lru_cache(maxsize=1)
def expand_skills_taxonomy() -> list[str]:
    """
    Expand the base skills taxonomy by combining skills from skills.csv
    with unique skills parsed from the resumes dataset.
    """
    # 1. Start with base skills
    skills_set = set(load_skills_dataset())
    
    # 2. Add skills from resumes dataset if available
    try:
        resumes_df = load_resumes_dataset()
        if "skills" in resumes_df.columns:
            for skill_str in resumes_df["skills"].dropna():
                # Split comma-separated skills and clean them
                for s in skill_str.split(","):
                    cleaned = s.strip()
                    # Skip empty strings and very long sentences
                    if cleaned and len(cleaned) < 50:
                        skills_set.add(cleaned)
    except Exception as e:
        # Fall back to base skills if resumes cannot be loaded
        print(f"Warning: Could not parse resumes for skills expansion: {e}")
        
    return sorted(list(skills_set))
