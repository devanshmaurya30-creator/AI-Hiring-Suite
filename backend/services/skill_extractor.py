"""
Skill Extractor Service

Extracts skills from text based on the master skills taxonomy and
computes overlap/gap metrics between candidate and job skills.
"""

import re
from typing import List, Dict, Any, Set
from utils.dataset_loader import expand_skills_taxonomy

class SkillExtractor:
    """Service to extract skills and analyze skill matches/gaps."""

    def __init__(self):
        # Load taxonomy from dataset
        self.taxonomy = expand_skills_taxonomy()

    def extract_skills(self, text: str) -> List[Dict[str, Any]]:
        """
        Tokenize and extract skills from text, providing confidence scores.
        Confidence:
          - 1.0: Exact case-sensitive match (word-bounded)
          - 0.8: Case-insensitive match (word-bounded)
          - 0.6: Partial / Substring match (e.g. "ReactJS" matching "React")
        """
        if not text or not text.strip():
            return []

        extracted = {}
        text_lower = text.lower()
        
        for skill in self.taxonomy:
            skill_lower = skill.lower()
            safe_skill = re.escape(skill_lower)
            
            # 1. Exact case-sensitive match check (word bounded)
            exact_pattern = rf'\b{re.escape(skill)}\b'
            if re.search(exact_pattern, text):
                extracted[skill] = {
                    "skill_name": skill,
                    "confidence": 1.0,
                    "source": "resume"
                }
                continue
                
            # 2. Case-insensitive match check (word bounded)
            ci_pattern = rf'\b{safe_skill}\b'
            if re.search(ci_pattern, text_lower):
                extracted[skill] = {
                    "skill_name": skill,
                    "confidence": 0.8,
                    "source": "resume"
                }
                continue
                
            # 3. Partial/substring check (only for multi-word or longer skills)
            if len(skill_lower) > 4 and skill_lower in text_lower:
                extracted[skill] = {
                    "skill_name": skill,
                    "confidence": 0.6,
                    "source": "resume"
                }

        return list(extracted.values())

    def match_skills(self, candidate_skills: List[str], required_skills: List[str]) -> Dict[str, Any]:
        """
        Compare candidate skills with job required skills.
        Returns:
          - matched: list of skills the candidate has
          - missing: list of skills candidate lacks
          - match_percentage: float (0.0 to 100.0)
        """
        # Clean skills list (strip whitespace, lowercase for matching)
        cand_set = {s.strip().lower() for s in candidate_skills if s.strip()}
        
        # Parse required skills (could be comma-separated or list)
        req_list = []
        if isinstance(required_skills, str):
            req_list = [s.strip() for s in required_skills.split(",") if s.strip()]
        elif isinstance(required_skills, list):
            req_list = [s.strip() for s in required_skills if s.strip()]
            
        req_set = {s.lower() for s in req_list}
        
        if not req_set:
            return {
                "matched": [],
                "missing": [],
                "match_percentage": 100.0
            }
            
        # Match computation
        matched_lower = cand_set.intersection(req_set)
        missing_lower = req_set.difference(cand_set)
        
        # Map back to original casing from required skills list
        matched_orig = []
        missing_orig = []
        for req in req_list:
            if req.lower() in matched_lower:
                matched_orig.append(req)
            else:
                missing_orig.append(req)
                
        # Handle duplicates in original casing
        matched_orig = list(set(matched_orig))
        missing_orig = list(set(missing_orig))
        
        match_percentage = (len(matched_orig) / len(req_list)) * 100.0 if req_list else 100.0
        
        return {
            "matched": matched_orig,
            "missing": missing_orig,
            "match_percentage": round(match_percentage, 2)
        }
