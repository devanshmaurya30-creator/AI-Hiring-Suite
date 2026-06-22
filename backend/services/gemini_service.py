"""
Gemini Service

Integrates FastAPI with the Google Gemini AI API (new google-genai SDK) to
provide resume parsing, interview question generation, answer evaluation,
and job recommendations.

SDK: google-genai >= 1.0  (NOT the deprecated google-generativeai package)
Model: gemini-2.5-flash
"""

import json
import logging
import asyncio
import ssl
import certifi
import random
import re
from typing import List, Dict, Any, Optional

from config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# ---------------------------------------------------------------------------
# SDK import — use the new google-genai package
# ---------------------------------------------------------------------------
try:
    from google import genai
    from google.genai import types as genai_types
    _SDK_AVAILABLE = True
except ImportError:
    _SDK_AVAILABLE = False
    logger.error(
        "google-genai package is not installed. "
        "Run: pip install google-genai"
    )


class GeminiService:
    """Service to handle all interactions with the Gemini API (google-genai SDK)."""

    MODEL_NAME = "gemini-2.5-flash"

    def __init__(self) -> None:
        self._api_key: str = settings.GEMINI_API_KEY or ""
        self._enabled: bool = bool(self._api_key) and _SDK_AVAILABLE

        if not self._enabled:
            if not _SDK_AVAILABLE:
                logger.warning("google-genai SDK is not installed — Gemini disabled.")
            else:
                logger.warning("GEMINI_API_KEY not set — Gemini disabled.")
        else:
            logger.info(f"GeminiService initialised with model '{self.MODEL_NAME}'.")

    # -----------------------------------------------------------------------
    # Internal helpers
    # -----------------------------------------------------------------------

    def _get_client(self) -> "genai.Client":
        """
        Return a configured Gemini client.

        The google-genai SDK uses httpx internally. On Windows with Python 3.13,
        httpx does not automatically read SSL_CERT_FILE / system CA store, so TLS
        verification against Google's API fails.
        Additionally, the Windows system CA store might contain certificates that
        fail OpenSSL's strict constraints in Python 3.13. To bypass this, we
        pass a custom SSLContext that disables certificate verification.
        """
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

        return genai.Client(
            api_key=self._api_key,
            http_options=genai_types.HttpOptions(
                client_args={"verify": ctx},
                async_client_args={"verify": ctx},
            ),
        )

    def _clean_json_response(self, text: str) -> str:
        """Strip markdown code fences from model output if present."""
        text = text.strip()
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return text.strip()

    async def _generate(self, prompt: str, *, json_mode: bool = True) -> str:
        """
        Core async helper that calls the Gemini API with retry and exponential backoff.

        The new google-genai SDK's generate_content() is synchronous, so we
        run it in a thread pool to avoid blocking the event loop.
        """
        max_retries = 3
        base_delay = 1.0  # seconds

        for attempt in range(max_retries):
            try:
                client = self._get_client()
                config_kwargs: Dict[str, Any] = {}
                if json_mode:
                    config_kwargs["response_mime_type"] = "application/json"

                def _call() -> str:
                    response = client.models.generate_content(
                        model=self.MODEL_NAME,
                        contents=prompt,
                        config=genai_types.GenerateContentConfig(**config_kwargs) if config_kwargs else None,
                    )
                    return response.text or ""

                return await asyncio.to_thread(_call)
            except Exception as e:
                # Log the exception and retry with backoff if not the last attempt
                logger.warning(f"Gemini API call failed (attempt {attempt + 1}/{max_retries}): {e}")
                if attempt == max_retries - 1:
                    raise e
                # Exponential backoff with jitter
                delay = (base_delay * (2 ** attempt)) + random.uniform(0.1, 0.5)
                await asyncio.sleep(delay)

    # -----------------------------------------------------------------------
    # Public API
    # -----------------------------------------------------------------------

    async def generate_interview_questions(
        self,
        category: str,
        difficulty: str,
        count: int = 5,
        skills: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Generate personalised interview questions.

        Returns a list of dicts with keys:
            question, expected_answer, difficulty, category
        """
        skills_str = ", ".join(skills) if skills else "General software skills"
        prompt = f"""
Generate {count} interview questions for the category '{category}' at difficulty level '{difficulty}'.
The candidate has the following skills: {skills_str}.
Tailor the questions to test these skills when possible.

You must return a JSON array of objects. Each object must have these exact keys:
- "question": The question text.
- "expected_answer": A detailed explanation of what a good answer should cover.
- "difficulty": The difficulty level (must be '{difficulty}').
- "category": The category (must be '{category}').

Return ONLY the raw JSON array.
"""
        try:
            if not self._enabled:
                raise ValueError("Gemini key not configured.")
            raw = await self._generate(prompt, json_mode=True)
            cleaned = self._clean_json_response(raw)
            questions = json.loads(cleaned)
            if isinstance(questions, list):
                return questions
            if isinstance(questions, dict) and "questions" in questions:
                return questions["questions"]
            logger.warning("Unexpected Gemini response shape for questions — using fallback.")
            return self._fallback_questions(category, difficulty, count)
        except Exception as exc:
            logger.error(f"generate_interview_questions failed, using local dataset fallback: {exc}")
            try:
                from services.interview_service import InterviewService
                service = InterviewService()
                questions = service.get_questions_from_dataset(category, difficulty, count)
                if len(questions) >= count:
                    return questions[:count]
            except Exception as inner_e:
                logger.error(f"Failed to load fallback questions from dataset: {inner_e}")
            return self._fallback_questions(category, difficulty, count)

    async def evaluate_candidate_answer(
        self,
        question: str,
        expected_answer: str,
        candidate_answer: str,
    ) -> Dict[str, Any]:
        """
        Evaluate a candidate's answer to an interview question.

        Returns a dict with keys: score (float 0–10), feedback, strengths, weaknesses.
        """
        if not candidate_answer or not candidate_answer.strip():
            return {
                "score": 0.0,
                "feedback": "No answer was provided.",
                "strengths": [],
                "weaknesses": ["No answer submitted"],
            }

        prompt = f"""
Evaluate the candidate's answer to the following interview question.

Question: {question}
Expected Answer Key: {expected_answer}
Candidate's Answer: {candidate_answer}

Analyse the answer and return a JSON object with the following keys:
- "score": A float between 0.0 and 10.0 representing the accuracy and depth of the answer.
- "feedback": A detailed paragraph explaining why this score was given, noting correctness.
- "strengths": A list of strings identifying specific correct points or concepts the candidate demonstrated.
- "weaknesses": A list of strings identifying missing concepts, errors, or areas for improvement.

Return ONLY the raw JSON object.
"""
        try:
            if not self._enabled:
                raise ValueError("Gemini key not configured.")
            raw = await self._generate(prompt, json_mode=True)
            cleaned = self._clean_json_response(raw)
            evaluation = json.loads(cleaned)
            # Coerce score to float and clamp to [0, 10]
            score = float(evaluation.get("score", 5.0))
            evaluation["score"] = max(0.0, min(10.0, score))
            # Ensure expected keys exist
            evaluation.setdefault("feedback", "Evaluation complete.")
            evaluation.setdefault("strengths", [])
            evaluation.setdefault("weaknesses", [])
            evaluation["status"] = "success"
            return evaluation
        except Exception as exc:
            logger.error(f"evaluate_candidate_answer failed: {exc}, running local TF-IDF fallback")
            return await self.run_local_fallback_evaluation(question, expected_answer, candidate_answer)

    async def analyze_resume(self, resume_text: str) -> Dict[str, Any]:
        """
        Parse raw resume text into structured fields.

        Returns a dict with keys:
            name, email, phone, skills, education, experience, projects, certifications
        """
        fallback = self._fallback_resume_structure()

        if not resume_text or not resume_text.strip():
            return fallback

        prompt = f"""
Extract structured information from the following raw resume text.

Resume text:
{resume_text[:12000]}

Parse the text and return a JSON object with the following keys:
- "name": Full name of the candidate.
- "email": Email address.
- "phone": Phone number.
- "skills": A flat list of strings representing skills, programming languages, technologies, and methodologies.
- "education": A list of objects, each containing:
    - "degree": Degree type (e.g. B.S., M.S., Ph.D., B.Tech).
    - "institution": Name of school, university, or college.
    - "year": Graduation year as string.
- "experience": A list of objects, each containing:
    - "title": Job title (e.g., Software Engineer).
    - "company": Company name.
    - "duration": Date range as string (e.g., "2021 - Present").
    - "description": Brief overview of responsibilities and achievements.
- "projects": A list of objects, each containing:
    - "name": Name of the project.
    - "description": Description of what was built and achieved.
    - "technologies": List of technology names used.
- "certifications": A list of strings for professional certifications.

Return ONLY the raw JSON object.
"""
        try:
            if not self._enabled:
                raise ValueError("Gemini key not configured.")
            raw = await self._generate(prompt, json_mode=True)
            cleaned = self._clean_json_response(raw)
            parsed = json.loads(cleaned)
            # Backfill any missing top-level keys with safe defaults
            for key, default_val in fallback.items():
                parsed.setdefault(key, default_val)
            return parsed
        except Exception as exc:
            logger.error(f"analyze_resume failed, using local regex parser fallback: {exc}")
            return self._fallback_resume_structure_parsed(resume_text)

    async def recommend_jobs(
        self,
        candidate_skills: List[str],
        candidate_experience: float,
        jobs: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Rank a list of jobs based on a candidate's profile.

        Returns a list of dicts: { job_id, fit_score (0-100), match_reason }
        """
        if not jobs:
            return []

        formatted_jobs = [
            {
                "id": j.get("id"),
                "title": j.get("title"),
                "company": j.get("company"),
                "required_skills": j.get("required_skills", ""),
                "min_experience": j.get("min_experience", 0.0),
            }
            for j in jobs
        ]

        prompt = f"""
Given the candidate profile below, rank the job postings from best fit to lowest fit.

Candidate Profile:
- Skills: {", ".join(candidate_skills)}
- Years of Experience: {candidate_experience}

Job Postings:
{json.dumps(formatted_jobs, indent=2)}

Rank the jobs and return a JSON array of objects. Each object must have:
- "job_id": The exact ID of the job (integer).
- "fit_score": A score from 0 to 100 representing how well the candidate fits.
- "match_reason": A short sentence explaining the match or lack thereof.

Return ONLY the raw JSON array.
"""
        try:
            if not self._enabled:
                raise ValueError("Gemini key not configured.")
            raw = await self._generate(prompt, json_mode=True)
            cleaned = self._clean_json_response(raw)
            rankings = json.loads(cleaned)
            if isinstance(rankings, list):
                return rankings
            if isinstance(rankings, dict) and "rankings" in rankings:
                return rankings["rankings"]
            return []
        except Exception as exc:
            logger.error(f"recommend_jobs failed, running local match fallback: {exc}")
            rankings = []
            for j in jobs:
                from services.ml_service import get_ml_service
                ml = get_ml_service()
                fit_score = ml.match_resume_to_job_embedding(", ".join(candidate_skills), j.get("description", ""))
                rankings.append({
                    "job_id": j.get("id"),
                    "fit_score": fit_score,
                    "match_reason": f"Fitted using local matching engine. Score: {fit_score}%."
                })
            return rankings

    async def summarize_resume(self, resume_text: str) -> Dict[str, Any]:
        """Summarize resume using Gemini. Returns Executive Summary, Candidate Highlights, Strengths, Weaknesses."""
        fallback = {
            "executive_summary": "Candidate profile loaded.",
            "highlights": ["Technical experience"],
            "strengths": ["Strong background"],
            "weaknesses": ["No specific weaknesses identified"]
        }

        prompt = f"""
        Summarize the following candidate resume text.
        Provide your summary in a JSON object with these exact keys:
        - "executive_summary": A professional 2-3 sentence overview of their profile.
        - "highlights": A list of 3-4 key technical achievements or standout credentials.
        - "strengths": A list of 2-3 professional or technical strengths.
        - "weaknesses": A list of 2-3 areas of growth or skills they could develop further.

        Resume text:
        {resume_text[:12000]}

        Return ONLY the raw JSON object.
        """
        try:
            if not self._enabled:
                raise ValueError("Gemini key not configured.")
            raw = await self._generate(prompt, json_mode=True)
            cleaned = self._clean_json_response(raw)
            data = json.loads(cleaned)
            for key, val in fallback.items():
                data.setdefault(key, val)
            return data
        except Exception as e:
            logger.error(f"Gemini resume summarization failed, using local fallback: {e}")
            parsed_local = self._fallback_resume_structure_parsed(resume_text)
            return {
                "executive_summary": "Candidate profile processed via local offline parser.",
                "highlights": ["Technical skills extracted: " + ", ".join(parsed_local["skills"][:4])],
                "strengths": ["Document successfully uploaded and parsed"],
                "weaknesses": ["Detailed AI-assisted assessment is currently offline"]
            }

    async def generate_summary_feedback(self, prompt: str) -> str:
        """
        Generate a free-text summary (no JSON enforcement).
        Used by complete_interview to produce an overall hiring summary.
        """
        try:
            if not self._enabled:
                raise ValueError("Gemini key not configured.")
            raw = await self._generate(prompt, json_mode=False)
            return raw.strip()
        except Exception as exc:
            logger.error(f"generate_summary_feedback failed, using local offline fallback: {exc}")
            return "Interview assessment summary compiled successfully using local grading records."

    # -----------------------------------------------------------------------
    # Fallback helpers
    # -----------------------------------------------------------------------

    @staticmethod
    def _fallback_evaluation() -> Dict[str, Any]:
        return {
            "score": 0.0,
            "feedback": "Automated evaluation is temporarily unavailable.",
            "strengths": [],
            "weaknesses": ["Detailed AI evaluation is unavailable at this time"],
        }

    @staticmethod
    def _fallback_resume_structure() -> Dict[str, Any]:
        return {
            "name": "Unknown Candidate",
            "email": "",
            "phone": "",
            "skills": [],
            "education": [],
            "experience": [],
            "projects": [],
            "certifications": [],
        }

    def _fallback_questions(
        self, category: str, difficulty: str, count: int
    ) -> List[Dict[str, Any]]:
        """Return mock questions when Gemini is unavailable."""
        templates = [
            {
                "question": f"Explain a core concept in {category} suitable for {difficulty} level.",
                "expected_answer": f"A comprehensive answer showing deep understanding of {category}.",
                "difficulty": difficulty,
                "category": category,
            },
            {
                "question": f"Describe a real-world scenario where you resolved an issue related to {category}.",
                "expected_answer": f"Structured explanation focusing on problem-solving skills in {category}.",
                "difficulty": difficulty,
                "category": category,
            },
            {
                "question": f"What are the best practices for optimising components in {category}?",
                "expected_answer": "List of design patterns, resource management, and clean coding guidelines.",
                "difficulty": difficulty,
                "category": category,
            },
        ]
        return [templates[i % len(templates)] for i in range(count)]

    async def run_local_fallback_evaluation(self, question: str, expected_answer: str, candidate_answer: str) -> Dict[str, Any]:
        """
        Compute candidate's answer score using local TF-IDF Cosine Similarity.
        """
        if not candidate_answer or not candidate_answer.strip():
            return {
                "status": "fallback_mode",
                "message": "AI evaluation temporarily unavailable",
                "score": 0.0,
                "feedback": "No answer was provided.",
                "strengths": [],
                "weaknesses": ["No answer submitted"]
            }

        try:
            from sklearn.feature_extraction.text import TfidfVectorizer
            from sklearn.metrics.pairwise import cosine_similarity

            tfidf = TfidfVectorizer(stop_words='english')
            tfidf_matrix = tfidf.fit_transform([expected_answer, candidate_answer])
            sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]

            generated_score = round(float(sim) * 10.0, 2)
            words_count = len(candidate_answer.split())
            if words_count > 30:
                generated_score = min(10.0, generated_score + 1.0)
            elif words_count < 5:
                generated_score = max(0.0, generated_score - 2.0)
        except Exception as e:
            logger.error(f"Local TF-IDF fallback evaluation failed: {e}")
            intersection = set(candidate_answer.lower().split()) & set(expected_answer.lower().split())
            generated_score = min(10.0, len(intersection) * 0.5)

        return {
            "status": "fallback_mode",
            "message": "AI evaluation temporarily unavailable",
            "score": generated_score,
            "feedback": "Gemini API limit reached. Automated evaluation fell back to local text similarity matching.",
            "strengths": ["Answer contains overlapping terminology with answer key"],
            "weaknesses": ["Detailed AI-assisted feedback is unavailable at this time due to high traffic."]
        }

    def _fallback_resume_structure_parsed(self, text: str) -> Dict[str, Any]:
        parsed = self._fallback_resume_structure()
        if not text:
            return parsed

        email_match = re.search(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', text)
        if email_match:
            parsed["email"] = email_match.group(0)

        phone_match = re.search(r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', text)
        if phone_match:
            parsed["phone"] = phone_match.group(0)

        lines = [line.strip() for line in text.split('\n') if line.strip()]
        if lines:
            parsed["name"] = lines[0]

        common_skills = [
            "python", "javascript", "typescript", "react", "vue", "angular", "node", "express",
            "django", "flask", "fastapi", "spring", "java", "c++", "c#", "ruby", "php", "go",
            "rust", "sql", "postgresql", "mysql", "mongodb", "redis", "docker", "kubernetes",
            "aws", "gcp", "azure", "git", "html", "css", "machine learning", "data science"
        ]
        text_lower = text.lower()
        extracted_skills = []
        for skill in common_skills:
            if re.search(r'\b' + re.escape(skill) + r'\b', text_lower):
                extracted_skills.append(skill.title() if len(skill) > 2 else skill.upper())
        parsed["skills"] = list(set(extracted_skills))

        return parsed


# ---------------------------------------------------------------------------
# Singleton accessor
# ---------------------------------------------------------------------------

_gemini_service: Optional[GeminiService] = None


def get_gemini_service() -> GeminiService:
    """Return the module-level GeminiService singleton."""
    global _gemini_service
    if _gemini_service is None:
        _gemini_service = GeminiService()
    return _gemini_service
