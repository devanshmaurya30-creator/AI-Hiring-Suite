"""
Interview Service

Manages interview session configurations, question selections from the offline database,
and fallback generation of dynamic questions via the Gemini AI Service.
"""

import random
import logging
import pandas as pd
from typing import List, Dict, Any, Optional
from utils.dataset_loader import load_interviews_dataset
from services.gemini_service import get_gemini_service

logger = logging.getLogger(__name__)

class InterviewService:
    """Service to prepare interview questions and manage interview logic."""

    def __init__(self):
        self.gemini_service = get_gemini_service()
        try:
            self.dataset = load_interviews_dataset()
        except Exception as e:
            logger.error(f"Failed to load interview dataset in InterviewService: {e}")
            self.dataset = pd.DataFrame()

    def get_categories(self) -> List[str]:
        """Get all unique question categories from the software questions dataset."""
        if self.dataset.empty or "Category" not in self.dataset.columns:
            # Standard software developer question categories
            return ["Algorithms", "Data Structures", "Web Development", "Databases", "System Design", "Python", "General Technical"]
        return sorted(self.dataset["Category"].dropna().unique().tolist())

    def get_questions_from_dataset(
        self,
        category: str,
        difficulty: Optional[str] = None,
        count: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Filter dataset questions by category and difficulty.
        Returns a random sample up to 'count'.
        """
        if self.dataset.empty:
            return []

        # Filter by Category (case-insensitive)
        mask = self.dataset["Category"].str.lower() == category.lower()
        filtered_df = self.dataset[mask]

        # Filter by Difficulty if provided
        if difficulty and not filtered_df.empty and "Difficulty" in filtered_df.columns:
            diff_mask = filtered_df["Difficulty"].str.lower() == difficulty.lower()
            temp_df = filtered_df[diff_mask]
            # Fall back to category-only questions if specific difficulty yields 0 matches
            if not temp_df.empty:
                filtered_df = temp_df

        if filtered_df.empty:
            return []

        # Sample randomly
        sample_count = min(count, len(filtered_df))
        sampled_df = filtered_df.sample(n=sample_count)

        questions = []
        for _, row in sampled_df.iterrows():
            questions.append({
                "question": row.get("Question", ""),
                "expected_answer": row.get("Answer", ""),
                "difficulty": row.get("Difficulty", difficulty or "Medium"),
                "category": row.get("Category", category)
            })

        return questions

    async def get_questions_for_interview(
        self,
        category: str,
        difficulty: str,
        count: int = 5,
        candidate_skills: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Get interview questions.
        Primary: Calls Gemini Service for dynamic generation.
        Fallback: Pulls from the local dataset-driven generator if Gemini fails.
        """
        questions = []
        try:
            # Try Gemini first
            logger.info(f"Primary question generation: calling Gemini for {category} ({difficulty})")
            questions = await self.gemini_service.generate_interview_questions(
                category=category,
                difficulty=difficulty,
                count=count,
                skills=candidate_skills
            )
        except Exception as exc:
            logger.error(f"Primary Gemini question generation failed, falling back to dataset: {exc}")

        # If Gemini returned no/insufficient questions, fill with dataset
        needed = count - len(questions)
        if needed > 0:
            logger.info(f"Gemini returned {len(questions)}/{count} questions. Fetching {needed} fallback questions from dataset.")
            dataset_questions = self.get_questions_from_dataset(category, difficulty, needed)
            questions.extend(dataset_questions)

        # If we still have fewer than count questions, generate using simple template fallbacks
        needed = count - len(questions)
        if needed > 0:
            logger.info(f"Dataset returned insufficient questions. Using template fallback for {needed} questions.")
            template_questions = self.gemini_service._fallback_questions(category, difficulty, needed)
            questions.extend(template_questions)

        return questions[:count]
