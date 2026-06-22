"""
Matching Engine Service

Computes the match compatibility between a candidate profile (skills, experience,
education) and job postings, providing detailed skill gap analysis and scoring.
"""

from typing import List, Dict, Any
from services.skill_extractor import SkillExtractor

class MatchingEngine:
    """Engine to perform resume-to-job matching computations."""

    def __init__(self):
        self.skill_extractor = SkillExtractor()

    def match_candidate_to_job(
        self,
        candidate_skills: List[str],
        candidate_experience: float,
        candidate_education: str,
        job: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Calculates compatibility between candidate and a single job.
        Weights: Skills (50%), Experience (30%), Education (20%).
        """
        job_id = job.get("id")
        job_title = job.get("title", "Unknown Role")
        company = job.get("company", "Unknown Company")
        
        # 1. Skill Match Score (50%)
        req_skills_str = job.get("required_skills", "")
        skill_res = self.skill_extractor.match_skills(candidate_skills, req_skills_str)
        skill_score = skill_res["match_percentage"]  # 0 to 100
        
        # 2. Experience Match Score (30%)
        min_exp = float(job.get("min_experience", 0.0))
        if candidate_experience >= min_exp:
            experience_score = 100.0
        elif min_exp > 0:
            experience_score = (candidate_experience / min_exp) * 100.0
        else:
            experience_score = 100.0
        experience_score = min(max(experience_score, 0.0), 100.0)

        # 3. Education Match Score (20%)
        # Check if job description mentions degree constraints vs candidate education
        job_desc = job.get("description", "").lower()
        education_score = 100.0
        
        cand_edu_lower = (candidate_education or "").lower()
        
        # Heuristic comparison
        if "phd" in job_desc or "ph.d" in job_desc:
            if "phd" not in cand_edu_lower and "doctor" not in cand_edu_lower:
                education_score = 50.0
        elif "master" in job_desc:
            if "master" not in cand_edu_lower and "phd" not in cand_edu_lower and "doctor" not in cand_edu_lower:
                education_score = 65.0
        elif "bachelor" in job_desc or "b.tech" in job_desc or "degree" in job_desc:
            if not any(kw in cand_edu_lower for kw in ["bachelor", "b.tech", "b.sc", "degree", "master", "phd"]):
                education_score = 70.0

        # Calculate weighted overall score
        overall_score = (skill_score * 0.5) + (experience_score * 0.3) + (education_score * 0.2)
        overall_score = round(overall_score, 2)
        
        # Generate skill gap analysis
        skill_gap_analysis = self.generate_skill_gap_analysis(
            skill_res["matched"],
            skill_res["missing"],
            job_title
        )

        # Map overall score to hiring recommendation
        if overall_score >= 85.0:
            recommendation = "strong_hire"
        elif overall_score >= 70.0:
            recommendation = "hire"
        elif overall_score >= 50.0:
            recommendation = "maybe"
        else:
            recommendation = "no_hire"

        return {
            "job_id": job_id,
            "job_title": job_title,
            "company": company,
            "match_percentage": overall_score,
            "skills_score": round(skill_score, 2),
            "experience_score": round(experience_score, 2),
            "education_score": round(education_score, 2),
            "matched_skills": skill_res["matched"],
            "missing_skills": skill_res["missing"],
            "skill_gap_analysis": skill_gap_analysis,
            "recommendation": recommendation
        }

    def match_candidate_to_all_jobs(
        self,
        candidate_skills: List[str],
        candidate_experience: float,
        candidate_education: str,
        jobs: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Rank all active jobs by match score in descending order.
        """
        results = []
        for job in jobs:
            res = self.match_candidate_to_job(
                candidate_skills,
                candidate_experience,
                candidate_education,
                job
            )
            results.append(res)
            
        # Sort by match percentage descending
        results.sort(key=lambda x: x["match_percentage"], reverse=True)
        return results

    def generate_skill_gap_analysis(self, matched: List[str], missing: List[str], job_title: str) -> str:
        """
        Generates a human-readable summary of the candidate's skill match
        and recommendations for skill improvement relative to the role.
        """
        if not matched and not missing:
            return f"No required skills were specified for the {job_title} role."
            
        matched_str = ", ".join(matched)
        missing_str = ", ".join(missing)
        
        if not missing:
            return f"Perfect skill fit! You have all the required skills for the {job_title} role, including: {matched_str}."
            
        if not matched:
            return f"Significant skill gap. The {job_title} role requires {missing_str}, but none of these were found on your profile. We recommend gaining experience in these technologies."
            
        analysis = (
            f"You have a solid foundation for the {job_title} role with skills in: {matched_str}. "
            f"However, there is a skill gap in: {missing_str}. "
            f"To increase your chances of hiring, we recommend focusing on learning {missing_str}."
        )
        return analysis
