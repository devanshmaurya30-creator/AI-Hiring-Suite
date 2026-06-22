-- ============================================================
-- Migration 001: Initial Schema
-- Description: Creates all initial tables for AI Hiring Assistant
-- ============================================================

BEGIN;

-- =============================================
-- TABLE: users
-- =============================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'candidate' CHECK (role IN ('hr', 'candidate')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- TABLE: candidates
-- =============================================
CREATE TABLE IF NOT EXISTS candidates (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phone VARCHAR(20),
    education TEXT,
    years_experience FLOAT DEFAULT 0,
    current_title VARCHAR(255),
    summary TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- TABLE: resumes
-- =============================================
CREATE TABLE IF NOT EXISTS resumes (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(10) NOT NULL,
    parsed_data JSON,
    raw_text TEXT,
    status VARCHAR(20) DEFAULT 'uploaded',
    uploaded_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- TABLE: jobs
-- =============================================
CREATE TABLE IF NOT EXISTS jobs (
    id SERIAL PRIMARY KEY,
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
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- TABLE: skills
-- =============================================
CREATE TABLE IF NOT EXISTS skills (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- TABLE: candidate_skills
-- =============================================
CREATE TABLE IF NOT EXISTS candidate_skills (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    proficiency_level VARCHAR(20) DEFAULT 'intermediate',
    source VARCHAR(20) DEFAULT 'resume',
    UNIQUE (candidate_id, skill_id)
);

-- =============================================
-- TABLE: interviews
-- =============================================
CREATE TABLE IF NOT EXISTS interviews (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    job_id INTEGER REFERENCES jobs(id),
    interview_type VARCHAR(20) NOT NULL CHECK (interview_type IN ('technical', 'hr')),
    status VARCHAR(20) DEFAULT 'pending',
    total_score FLOAT,
    feedback TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- TABLE: interview_results
-- =============================================
CREATE TABLE IF NOT EXISTS interview_results (
    id SERIAL PRIMARY KEY,
    interview_id INTEGER NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    expected_answer TEXT,
    candidate_answer TEXT,
    score FLOAT,
    feedback TEXT,
    question_number INTEGER
);

-- =============================================
-- TABLE: rankings
-- =============================================
CREATE TABLE IF NOT EXISTS rankings (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    resume_score FLOAT DEFAULT 0,
    skill_match_score FLOAT DEFAULT 0,
    experience_score FLOAT DEFAULT 0,
    interview_score FLOAT DEFAULT 0,
    overall_score FLOAT DEFAULT 0,
    recommendation VARCHAR(20),
    ranked_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (candidate_id, job_id)
);

-- =============================================
-- INDEXES
-- =============================================
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
CREATE INDEX IF NOT EXISTS idx_rankings_overall_score ON rankings(overall_score DESC);

COMMIT;
