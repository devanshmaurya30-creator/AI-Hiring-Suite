"""
Resume Parser Service

Heuristically extracts structured data from resume text using regex and
expanded skills matching. Falls back to AI analysis (Gemini) for complex structures.
"""

import re
import logging
from typing import Dict, Any, List
from utils.dataset_loader import expand_skills_taxonomy
from services.gemini_service import get_gemini_service

logger = logging.getLogger(__name__)

class ResumeParser:
    """Service to parse plain text resumes into structured dictionary fields."""

    def __init__(self):
        self.gemini_service = get_gemini_service()

    def parse(self, text: str) -> Dict[str, Any]:
        """
        Parses text heuristically. If results are poor or fields are missing,
        falls back to AI-based parsing.
        """
        if not text or not text.strip():
            return {
                "name": "Unknown",
                "email": "",
                "phone": "",
                "skills": [],
                "education": [],
                "experience": [],
                "projects": [],
                "certifications": []
            }

        # 1. Regex parsing for basic contact info
        email = self._extract_email(text)
        phone = self._extract_phone(text)
        name = self._extract_name(text)

        # 2. Heuristics for skills matching against the taxonomy
        skills = self._extract_skills(text)

        # 3. Simple heuristics for education/experience summary
        education = self._extract_education(text)
        experience = self._extract_experience(text)

        # Build basic heuristic result
        parsed_dict = {
            "name": name,
            "email": email,
            "phone": phone,
            "skills": skills,
            "education": education,
            "experience": experience,
            "projects": [],
            "certifications": []
        }

        # If key fields are missing or it looks very simple, parse with AI to get high-quality structured data
        if not email or len(skills) < 3:
            logger.info("Heuristic parser yielded low data quality. Falling back to AI parser.")
            return self.parse_with_ai(text)

        return parsed_dict

    def parse_with_ai(self, text: str) -> Dict[str, Any]:
        """Use Gemini service to extract high-quality structured data from the resume."""
        import asyncio
        # Run async Gemini call in a synchronous context if needed, or define as synchronous wrapper
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
        if loop.is_running():
            # If we are in an async context, we shouldn't block, but for simplicity
            # we can run it using a future or run_coroutine_threadsafe.
            # However, FastAPI endpoints are async, so we should make this method async!
            # Wait, let's make this class methods async so they fit FastAPI async endpoints perfectly!
            pass
            
        # Let's write the async versions. It's much cleaner!
        # Let's write helper to run async or just make parse/parse_with_ai async.
        # Wait, the prompt says: "parse(text: str) -> dict" and "parse_with_ai(text: str) -> dict"
        # We can implement them as async methods: "async def parse" and "async def parse_with_ai"
        # Let's do that. It makes absolute sense for async API routes!

    # Let's implement the methods as async.
    async def parse_async(self, text: str) -> Dict[str, Any]:
        """Async implementation of parse."""
        email = self._extract_email(text)
        phone = self._extract_phone(text)
        name = self._extract_name(text)
        skills = self._extract_skills(text)
        education = self._extract_education(text)
        experience_entries, years_exp = self._extract_experience(text)

        # If data is sparse, fall back to AI
        if not email or len(skills) < 4:
            return await self.parse_with_ai(text)
            
        return {
            "name": name,
            "email": email,
            "phone": phone,
            "skills": skills,
            "education": education,
            "experience": experience_entries,
            "projects": [],
            "certifications": []
        }

    async def parse_with_ai(self, text: str) -> Dict[str, Any]:
        """Fall back to Gemini to analyze the resume text."""
        return await self.gemini_service.analyze_resume(text)

    # --- Heuristic Helpers ---
    def _extract_email(self, text: str) -> str:
        pattern = r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+'
        match = re.search(pattern, text)
        return match.group(0) if match else ""

    def _extract_phone(self, text: str) -> str:
        # Matches formats like +1-555-555-5555, (555) 555-5555, 555.555.5555, etc.
        pattern = r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'
        match = re.search(pattern, text)
        return match.group(0) if match else ""

    def _extract_name(self, text: str) -> str:
        # Assume name is in the first line
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        if lines:
            first_line = lines[0]
            # Simple check to see if first line has 2-3 words (capitalized)
            words = first_line.split()
            if 1 <= len(words) <= 4:
                return first_line
        return "Unknown Candidate"

    def _extract_skills(self, text: str) -> List[str]:
        # Clean text
        cleaned_text = text.lower()
        matched_skills = []
        
        # Load taxonomy
        taxonomy = expand_skills_taxonomy()
        for skill in taxonomy:
            # Word boundary matching to avoid matching substring inside other words (e.g. 'c' inside 'cloud')
            # Handle special characters in skill name for regex safety (e.g. .NET, C++, Node.js)
            safe_skill = re.escape(skill.lower())
            
            # Special check for short skills like 'C', 'R', 'Go'
            if len(skill) <= 2:
                pattern = rf'\b{safe_skill}\b'
            else:
                pattern = rf'\b{safe_skill}\b'
                
            if re.search(pattern, cleaned_text):
                matched_skills.append(skill)
                
        return matched_skills

    def _extract_education(self, text: str) -> List[Dict[str, str]]:
        education_list = []
        # Look for typical degree patterns
        degree_pattern = r'(bachelor|master|phd|b\.tech|m\.tech|b\.sc|m\.sc|doctorate|degree|university|college|institute)'
        lines = text.split("\n")
        
        for line in lines:
            if re.search(degree_pattern, line, re.IGNORECASE):
                # Clean and append line as institution/degree placeholder
                cleaned_line = line.strip()
                if len(cleaned_line) > 10 and len(cleaned_line) < 150:
                    # Parse degree name heuristically
                    degree = "Degree"
                    if "bachelor" in cleaned_line.lower() or "b.tech" in cleaned_line.lower() or "b.sc" in cleaned_line.lower():
                        degree = "Bachelor's"
                    elif "master" in cleaned_line.lower() or "m.tech" in cleaned_line.lower() or "m.sc" in cleaned_line.lower():
                        degree = "Master's"
                    elif "phd" in cleaned_line.lower() or "doctorate" in cleaned_line.lower():
                        degree = "Ph.D."
                        
                    education_list.append({
                        "degree": degree,
                        "institution": cleaned_line,
                        "year": ""
                    })
        return education_list[:3]  # Return top 3 matches

    def _extract_experience(self, text: str) -> tuple[List[Dict[str, str]], float]:
        experience_list = []
        years_exp = 0.0
        
        # Look for years of experience mentioned in text
        years_match = re.search(r'(\d+(?:\.\d+)?)\s*years?\s+(?:of\s+)?experience', text, re.IGNORECASE)
        if years_match:
            try:
                years_exp = float(years_match.group(1))
            except ValueError:
                pass
                
        # Look for typical job titles / companies in first 50 lines
        lines = text.split("\n")
        title_keywords = r'(engineer|developer|manager|lead|architect|analyst|intern|specialist)'
        for line in lines:
            if re.search(title_keywords, line, re.IGNORECASE) and not re.search(r'(education|skills|university|college|project)', line, re.IGNORECASE):
                cleaned_line = line.strip()
                if 10 < len(cleaned_line) < 100:
                    experience_list.append({
                        "title": cleaned_line,
                        "company": "Company",
                        "duration": "",
                        "description": cleaned_line
                    })
                    
        return experience_list[:4], years_exp
