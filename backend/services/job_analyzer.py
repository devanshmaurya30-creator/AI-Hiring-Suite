"""
Job Analyzer Service

Extracts structured information from raw job description texts,
including title, responsibilities, required experience, and key skills.
"""

import re
from typing import Dict, Any, List
from services.skill_extractor import SkillExtractor

class JobAnalyzer:
    """Service to parse and analyze job description texts."""

    def __init__(self):
        self.skill_extractor = SkillExtractor()

    def analyze(self, description: str) -> Dict[str, Any]:
        """
        Analyze a raw job description string and return structured fields.
        """
        if not description or not description.strip():
            return {
                "title": "Unknown Job",
                "required_skills": [],
                "min_experience": 0.0,
                "responsibilities": []
            }

        # 1. Title heuristic
        title = self._extract_title(description)

        # 2. Skill extraction
        skills_info = self.skill_extractor.extract_skills(description)
        skills = [s["skill_name"] for s in skills_info]

        # 3. Experience extraction
        min_experience = self._extract_min_experience(description)

        # 4. Responsibilities extraction (find lines starting with bullet points)
        responsibilities = self._extract_responsibilities(description)

        return {
            "title": title,
            "required_skills": skills,
            "min_experience": min_experience,
            "responsibilities": responsibilities
        }

    def analyze_from_dataset(self, job_row: Dict[str, Any]) -> Dict[str, Any]:
        """
        Convert a row from training_data.csv into structured job format.
        Columns in training_data: company_name, job_description, position_title, description_length, model_response
        """
        description = job_row.get("job_description", "")
        title = job_row.get("position_title", "")
        company = job_row.get("company_name", "")
        
        # Analyze description for additional details
        details = self.analyze(description)
        
        return {
            "title": title or details["title"],
            "company": company,
            "description": description,
            "required_skills": ", ".join(details["required_skills"]),
            "min_experience": details["min_experience"],
            "responsibilities": "\n".join(details["responsibilities"]),
            "location": "Remote",
            "salary_range": "Competitive"
        }

    # --- Heuristic Helpers ---
    def _extract_title(self, text: str) -> str:
        # Check first line
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        if lines:
            first_line = lines[0]
            if len(first_line) < 100 and not first_line.lower().startswith(("job description", "about us", "role overview")):
                return first_line
        
        # Search for job title indicator patterns
        match = re.search(r'(?:title|position|role):\s*([^\n]+)', text, re.IGNORECASE)
        if match:
            return match.group(1).strip()
            
        return "Software Engineer"

    def _extract_min_experience(self, text: str) -> float:
        # Matches patterns like: 3+ years, 3-5 years, minimum 2 years, etc.
        patterns = [
            r'(\d+)\+?\s*(?:years?|yrs?)(?:\s+of)?\s+experience',
            r'(?:minimum|at least|reqs|required)\s*(\d+)\s*(?:years?|yrs?)',
            r'(\d+)(?:\s*-\s*\d+)?\s*(?:years?|yrs?)\s+exp'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    return float(match.group(1))
                except ValueError:
                    pass
        return 0.0

    def _extract_responsibilities(self, text: str) -> List[str]:
        responsibilities = []
        lines = text.split("\n")
        
        # We look for bullet point symbols like: -, *, •, or numbered lists like 1., 2.
        bullet_pattern = r'^\s*[-*•]\s+(.+)$'
        numbered_pattern = r'^\s*\d+\.\s+(.+)$'
        
        # Also check if we are in a "responsibilities" section
        in_section = False
        section_pattern = r'(responsibilities|what you will do|key duties|role description|requirements)'
        
        for line in lines:
            if re.search(section_pattern, line, re.IGNORECASE):
                in_section = True
                continue
                
            # Match bullets
            match = re.match(bullet_pattern, line.strip())
            if not match:
                match = re.match(numbered_pattern, line.strip())
                
            if match:
                cleaned = match.group(1).strip()
                if 15 < len(cleaned) < 300:
                    responsibilities.append(cleaned)
            elif in_section and len(line.strip()) > 30 and len(line.strip()) < 200:
                # If we are in responsibilities section and line is medium-sized, consider it a item
                responsibilities.append(line.strip())
                
        # Return unique responsibilities
        seen = set()
        unique_resp = []
        for r in responsibilities:
            if r.lower() not in seen:
                seen.add(r.lower())
                unique_resp.append(r)
                
        return unique_resp[:10]  # Limit to top 10 items
