"""
Ranking Service

Ranks candidates for specific jobs based on multi-factor scoring (resume quality,
skill match, experience match, and interview performance).
"""

from typing import List, Dict, Any

class RankingService:
    """Service to score and rank candidates for job openings."""

    def calculate_resume_score(self, parsed_resume: Dict[str, Any]) -> float:
        """
        Evaluate completeness and quality of parsed resume.
        Scores based on presence of key sections:
        - Basic Info (Email, Phone, Name): 25 points
        - Skills List (at least 5): 25 points
        - Experience (at least 1 entry): 25 points
        - Education or Certifications: 25 points
        """
        if not parsed_resume:
            return 0.0

        score = 0.0

        # Basic Info completeness (25 pts)
        has_name = bool(parsed_resume.get("name") and parsed_resume.get("name") != "Unknown Candidate")
        has_email = bool(parsed_resume.get("email"))
        has_phone = bool(parsed_resume.get("phone"))
        basic_info_count = sum([has_name, has_email, has_phone])
        score += (basic_info_count / 3.0) * 25.0

        # Skills completeness (25 pts)
        skills = parsed_resume.get("skills", [])
        if len(skills) >= 10:
            score += 25.0
        elif len(skills) >= 5:
            score += 20.0
        elif len(skills) > 0:
            score += 10.0

        # Experience completeness (25 pts)
        experience = parsed_resume.get("experience", [])
        if len(experience) >= 3:
            score += 25.0
        elif len(experience) >= 1:
            score += 20.0

        # Education / Certifications completeness (25 pts)
        education = parsed_resume.get("education", [])
        certs = parsed_resume.get("certifications", [])
        if education or certs:
            score += 25.0

        return round(score, 2)

    def calculate_skill_score(self, candidate_skills: List[str], required_skills_str: str) -> float:
        """
        Evaluate candidate's skills against job required skills.
        """
        if not required_skills_str:
            return 100.0

        req_list = [s.strip().lower() for s in required_skills_str.split(",") if s.strip()]
        if not req_list:
            return 100.0

        cand_set = {s.strip().lower() for s in candidate_skills if s.strip()}
        
        matches = 0
        for req in req_list:
            if req in cand_set:
                matches += 1
            else:
                # Fuzzy partial check
                for cand in cand_set:
                    if req in cand or cand in req:
                        matches += 0.5
                        break

        score = (matches / len(req_list)) * 100.0
        return round(min(score, 100.0), 2)

    def calculate_experience_score(self, candidate_exp: float, required_exp: float) -> float:
        """
        Scoring experience duration:
        - Perfect Match (candidate >= required and candidate <= required + 4): 100
        - Underqualified (candidate < required): (candidate / required) * 100 (scales down)
        - Overqualified (candidate > required + 4): scales down slightly (candidate is too senior)
        """
        candidate_exp = float(candidate_exp or 0.0)
        required_exp = float(required_exp or 0.0)

        if required_exp == 0.0:
            if candidate_exp <= 3.0:
                return 100.0
            else:
                # Senior candidates applying for entry level
                over_years = candidate_exp - 3.0
                score = 100.0 - (over_years * 3.0)
                return round(max(score, 60.0), 2)

        if candidate_exp < required_exp:
            score = (candidate_exp / required_exp) * 100.0
            return round(max(score, 0.0), 2)
        elif candidate_exp <= required_exp + 4.0:
            return 100.0
        else:
            # Overqualified
            over_years = candidate_exp - (required_exp + 4.0)
            score = 100.0 - (over_years * 2.0)
            return round(max(score, 70.0), 2)

    def calculate_overall_score(
        self,
        resume_score: float,
        skill_score: float,
        experience_score: float,
        interview_score: float
    ) -> float:
        """
        Calculate composite score based on weights:
        - Resume Score: 25%
        - Skill Match Score: 35%
        - Experience Match Score: 25%
        - Interview Performance Score: 15%
        """
        overall = (
            (resume_score * 0.25) +
            (skill_score * 0.35) +
            (experience_score * 0.25) +
            (interview_score * 0.15)
        )
        return round(overall, 2)

    def get_recommendation(self, overall_score: float) -> str:
        """Determine recommendation based on overall score."""
        if overall_score >= 85.0:
            return "strong_hire"
        elif overall_score >= 70.0:
            return "hire"
        elif overall_score >= 50.0:
            return "maybe"
        else:
            return "no_hire"

    def rank_candidates(self, candidates_list: List[Dict[str, Any]], job: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Score and sort all candidates for a specific job in descending order.
        Each candidate dict must include: candidate_id, parsed_resume, candidate_skills, years_experience, interview_score
        """
        req_skills = job.get("required_skills", "")
        req_exp = float(job.get("min_experience", 0.0))

        ranked = []
        for cand in candidates_list:
            resume_score = self.calculate_resume_score(cand.get("parsed_resume", {}))
            skill_score = self.calculate_skill_score(cand.get("candidate_skills", []), req_skills)
            experience_score = self.calculate_experience_score(cand.get("years_experience", 0.0), req_exp)
            
            # If candidate hasn't had an interview yet, use 0.0 as baseline
            interview_score = cand.get("interview_score")
            if interview_score is None:
                interview_score = 0.0
            else:
                # Convert 0-10 or 0-100 scale
                if interview_score <= 10.0:
                    interview_score = interview_score * 10.0

            overall_score = self.calculate_overall_score(
                resume_score,
                skill_score,
                experience_score,
                interview_score
            )

            rec = self.get_recommendation(overall_score)

            ranked.append({
                "candidate_id": cand.get("candidate_id"),
                "candidate_name": cand.get("candidate_name", "Unknown"),
                "resume_score": resume_score,
                "skill_match_score": skill_score,
                "experience_score": experience_score,
                "interview_score": interview_score,
                "overall_score": overall_score,
                "recommendation": rec
            })

        # Sort by overall score descending
        ranked.sort(key=lambda x: x["overall_score"], reverse=True)
        return ranked
