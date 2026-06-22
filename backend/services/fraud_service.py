import re
import os
import logging
from datetime import datetime
from typing import Dict, Any, List, Tuple, Optional
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func

from models.models import Candidate, Resume, User, FraudReport, CandidateSimilarity, FraudAlert, FraudEvent, Interview
from services.ml_service import get_ml_service
from services.gemini_service import get_gemini_service

logger = logging.getLogger(__name__)

class FraudDetectionService:
    """Service to handle resume fraud and candidate cheating detection using local ML and heuristics."""

    def __init__(self):
        self.ml = get_ml_service()
        self.gemini = get_gemini_service()

    def clean_phone(self, phone: Optional[str]) -> str:
        if not phone:
            return ""
        return re.sub(r'\D', '', phone)

    def extract_social_handle(self, url: Optional[str], domain: str) -> str:
        """Extract username/handle from profile URL for comparison."""
        if not url:
            return ""
        url_lower = url.lower().strip()
        # Look for domain.com/handle
        pattern = r'(?:' + re.escape(domain) + r'\.com/)([\w\-]+)'
        match = re.search(pattern, url_lower)
        if match:
            return match.group(1)
        # Fallback to last URL path component if structure is different
        parts = [p for p in url_lower.split('/') if p]
        if parts:
            return parts[-1]
        return url_lower

    async def detect_identity_fraud(self, candidate: Candidate, other_candidates: List[Candidate]) -> Tuple[float, List[str], Dict[str, Any]]:
        """
        Check for duplicate identity attributes (Email, Phone, LinkedIn, GitHub).
        Returns a sub-score (0-100), alert reasons, and details.
        """
        score = 0.0
        alerts = []
        details = {
            "duplicate_email": False,
            "duplicate_phone": False,
            "duplicate_linkedin": False,
            "duplicate_github": False,
            "matched_candidate_ids": []
        }

        cand_phone_clean = self.clean_phone(candidate.phone)
        cand_email = candidate.user.email.lower().strip() if candidate.user else ""

        # Extract handles from summary or resume text (social profiles are usually in resume metadata or summary text)
        cand_text = candidate.summary or ""
        cand_linkedin = self.extract_social_handle(re.search(r'linkedin\.com/in/[\w\-]+', cand_text, re.IGNORECASE).group(0) if re.search(r'linkedin\.com/in/[\w\-]+', cand_text, re.IGNORECASE) else "", "linkedin")
        cand_github = self.extract_social_handle(re.search(r'github\.com/[\w\-]+', cand_text, re.IGNORECASE).group(0) if re.search(r'github\.com/[\w\-]+', cand_text, re.IGNORECASE) else "", "github")

        for other in other_candidates:
            if other.id == candidate.id:
                continue

            other_phone_clean = self.clean_phone(other.phone)
            other_email = other.user.email.lower().strip() if other.user else ""
            other_text = other.summary or ""
            other_linkedin = self.extract_social_handle(re.search(r'linkedin\.com/in/[\w\-]+', other_text, re.IGNORECASE).group(0) if re.search(r'linkedin\.com/in/[\w\-]+', other_text, re.IGNORECASE) else "", "linkedin")
            other_github = self.extract_social_handle(re.search(r'github\.com/[\w\-]+', other_text, re.IGNORECASE).group(0) if re.search(r'github\.com/[\w\-]+', other_text, re.IGNORECASE) else "", "github")

            # Check duplicate email
            if cand_email and other_email and cand_email == other_email:
                details["duplicate_email"] = True
                details["matched_candidate_ids"].append(other.id)
                alerts.append(f"Duplicate email detected! Matches candidate '{other.user.full_name}' (ID: {other.id}).")
                score += 50.0

            # Check duplicate phone
            if cand_phone_clean and other_phone_clean and cand_phone_clean == other_phone_clean:
                details["duplicate_phone"] = True
                if other.id not in details["matched_candidate_ids"]:
                    details["matched_candidate_ids"].append(other.id)
                alerts.append(f"Duplicate phone number detected! Matches candidate '{other.user.full_name}' (ID: {other.id}).")
                score += 40.0

            # Check duplicate LinkedIn
            if cand_linkedin and other_linkedin and cand_linkedin == other_linkedin:
                details["duplicate_linkedin"] = True
                if other.id not in details["matched_candidate_ids"]:
                    details["matched_candidate_ids"].append(other.id)
                alerts.append(f"Duplicate LinkedIn profile detected! Matches candidate '{other.user.full_name}' (ID: {other.id}).")
                score += 30.0

            # Check duplicate GitHub
            if cand_github and other_github and cand_github == other_github:
                details["duplicate_github"] = True
                if other.id not in details["matched_candidate_ids"]:
                    details["matched_candidate_ids"].append(other.id)
                alerts.append(f"Duplicate GitHub profile detected! Matches candidate '{other.user.full_name}' (ID: {other.id}).")
                score += 30.0

        # Clamp identity score
        score = min(100.0, score)
        return score, alerts, details

    def detect_keyword_stuffing(self, resume_text: str) -> Tuple[float, List[str], Dict[str, Any]]:
        """
        Check for excessive keyword repetition and suspicious skill optimization.
        """
        score = 0.0
        alerts = []
        details = {
            "stuffing_detected": False,
            "stuffed_keywords": [],
            "skills_density": 0.0
        }

        if not resume_text:
            return score, alerts, details

        cleaned_text = resume_text.lower()
        words = [w for w in re.split(r'\W+', cleaned_text) if len(w) > 1]
        word_count = len(words)
        
        if word_count < 10:
            return score, alerts, details

        # Check keyword frequency density
        from collections import Counter
        counts = Counter(words)
        
        # Commonly stuffed keywords to ignore (unless extreme)
        stopwords = {"experience", "project", "software", "development", "work", "using", "application", "system", "management", "and", "the", "for", "with"}
        
        abnormal = []
        for word, count in counts.items():
            if word in stopwords:
                continue
            # If any typical skill word represents > 4.5% of the total words and repeats >= 7 times
            density = count / word_count
            if density > 0.045 and count >= 7:
                abnormal.append((word, count, round(density * 100, 2)))

        if abnormal:
            details["stuffing_detected"] = True
            details["stuffed_keywords"] = abnormal
            score += min(50.0, len(abnormal) * 20.0)
            alerts.append(f"Keyword stuffing warning! Abnormal repeating density for terms: {', '.join([f'{w[0]} ({w[1]}x, {w[2]}%)' for w in abnormal])}.")

        # Check total unique skill keyword dumps
        tech_words = {"python", "react", "docker", "kubernetes", "aws", "django", "flask", "fastapi", "typescript", "javascript", "node", "java", "c++", "c#", "rust", "golang", "sql", "postgresql", "mysql", "mongodb", "redis", "html", "css"}
        skills_matched = [w for w in tech_words if w in cleaned_text]
        skills_density = len(skills_matched) / len(tech_words)
        details["skills_density"] = round(skills_density * 100, 2)
        
        if skills_density > 0.85:
            score += 20.0
            alerts.append(f"Suspicious resume optimization! Matches {len(skills_matched)} of out of {len(tech_words)} total tech keywords, indicating potential automated profile padding.")

        score = min(100.0, score)
        return score, alerts, details

    def detect_ai_authenticity(self, resume_text: str, parsed_data: Dict[str, Any]) -> Tuple[float, List[str], Dict[str, Any]]:
        """
        Check if resume is AI generated, has copied descriptions, repeating achievements, or unrealistic timeline claims.
        """
        score = 0.0
        alerts = []
        details = {
            "ai_generated_probability": 0.0,
            "unrealistic_claims": [],
            "repeated_achievements": []
        }

        if not resume_text:
            return score, alerts, details

        # 1. AI-generated probability heuristic
        # AI models frequently write using specific sets of transition words and phrases in CVs
        ai_markers = [
            "proven track record", "highly motivated", "passionate developer", "adept at",
            "leverage my skills", "delve into", "testament to", "fostered collaboration",
            "spearheaded key initiatives", "orchestrated the delivery", "result-oriented",
            "transformative solutions", "demonstrated excellence", "streamlined operations"
        ]
        
        matched_markers = [marker for marker in ai_markers if marker in resume_text.lower()]
        ai_prob = min(1.0, len(matched_markers) / len(ai_markers))
        details["ai_generated_probability"] = round(ai_prob * 100, 2)

        if ai_prob >= 0.60:
            score += 25.0
            alerts.append(f"AI resume generation indicator! Detected high frequency of ChatGPT template patterns (matched {len(matched_markers)} buzz phrases).")

        # 2. Unrealistic experience claims (FastAPI launched 2018, React 2013, Next.js 2016, Rust 2015, Tailwind 2017)
        timeline_rules = {
            "fastapi": (2018, "FastAPI"),
            "next.js": (2016, "Next.js"),
            "nextjs": (2016, "Next.js"),
            "tailwind": (2017, "Tailwind CSS"),
            "rust": (2015, "Rust"),
            "kubernetes": (2014, "Kubernetes"),
            "react": (2013, "React")
        }

        current_year = datetime.now().year
        text_lower = resume_text.lower()

        for tech, (launch_year, tech_name) in timeline_rules.items():
            # Match patterns like: "X years of experience in React", "React: X years", "React (X years)"
            patterns = [
                r'(\d+)\+?\s*(?:years?|yrs?)(?:\s+of)?(?:\s+experience)?(?:\s+in)?\s+' + re.escape(tech),
                re.escape(tech) + r'\b.*?\b(\d+)\+?\s*(?:years?|yrs?)'
            ]
            for pat in patterns:
                match = re.search(pat, text_lower)
                if match:
                    years_claimed = int(match.group(1))
                    max_possible = current_year - launch_year
                    if years_claimed > max_possible:
                        claim_str = f"Claims {years_claimed} years of {tech_name} experience (released in {launch_year}, max possible is {max_possible} years)."
                        details["unrealistic_claims"].append(claim_str)
                        alerts.append(f"Unrealistic experience claim! {claim_str}")
                        score += 35.0
                        break # Check next technology

        # 3. Repeated achievements (Internal redundancy within bullet points)
        sentences = [s.strip() for s in re.split(r'[\.\n•\-\*]', resume_text) if len(s.strip()) > 15]
        if len(sentences) > 4:
            from sklearn.feature_extraction.text import TfidfVectorizer
            from sklearn.metrics.pairwise import cosine_similarity
            try:
                tfidf = TfidfVectorizer(stop_words='english')
                tfidf_matrix = tfidf.fit_transform(sentences)
                sim_matrix = cosine_similarity(tfidf_matrix)
                
                # Check for near duplicate sentences (similarity > 0.85)
                seen_pairs = set()
                for i in range(len(sentences)):
                    for j in range(i + 1, len(sentences)):
                        if sim_matrix[i][j] > 0.85:
                            pair = (min(i, j), max(i, j))
                            if pair not in seen_pairs:
                                seen_pairs.add(pair)
                                rep_str = f"Repeated achievement structure: '{sentences[i][:40]}...' and '{sentences[j][:40]}...' are 85%+ identical."
                                details["repeated_achievements"].append(rep_str)
                                alerts.append(rep_str)
                                score += 15.0
            except Exception as e:
                logger.error(f"Error computing internal resume sentence similarity: {e}")

        score = min(100.0, score)
        return score, alerts, details

    async def check_candidate_resume_similarity(self, candidate_id: int, current_resume_text: str, db_session: Any) -> Tuple[float, List[str]]:
        """
        Compare current candidate's resume with all other candidates' resumes in the database.
        Stores similarity pairs in CandidateSimilarity table.
        """
        alerts = []
        max_similarity = 0.0

        if not current_resume_text:
            return 0.0, alerts

        # Get all resumes excluding the current candidate's
        stmt = select(Resume).where(Resume.candidate_id != candidate_id, Resume.raw_text.isnot(None))
        result = await db_session.execute(stmt)
        other_resumes = result.scalars().all()

        if not other_resumes:
            return 0.0, alerts

        # Load texts and mappings
        other_texts = [r.raw_text for r in other_resumes]
        other_candidate_ids = [r.candidate_id for r in other_resumes]

        try:
            # Run TF-IDF cosine similarity comparison
            from sklearn.feature_extraction.text import TfidfVectorizer
            from sklearn.metrics.pairwise import cosine_similarity

            tfidf = TfidfVectorizer(stop_words='english')
            tfidf_matrix = tfidf.fit_transform([current_resume_text] + other_texts)
            similarities = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:])[0]

            for idx, sim in enumerate(similarities):
                sim_score = round(float(sim) * 100.0, 2)
                other_cand_id = other_candidate_ids[idx]

                # Update max similarity
                if sim_score > max_similarity:
                    max_similarity = sim_score

                # Save similarity edge in CandidateSimilarity table
                if sim_score > 30.0:  # Save anything with minor overlap
                    # Check if similarity edge already exists
                    edge_stmt = select(CandidateSimilarity).where(
                        ((CandidateSimilarity.candidate_id_1 == candidate_id) & (CandidateSimilarity.candidate_id_2 == other_cand_id)) |
                        ((CandidateSimilarity.candidate_id_1 == other_cand_id) & (CandidateSimilarity.candidate_id_2 == candidate_id))
                    )
                    edge_res = await db_session.execute(edge_stmt)
                    edge = edge_res.scalar_one_or_none()

                    if edge:
                        edge.similarity_score = sim_score
                    else:
                        db_session.add(CandidateSimilarity(
                            candidate_id_1=min(candidate_id, other_cand_id),
                            candidate_id_2=max(candidate_id, other_cand_id),
                            similarity_score=sim_score,
                            match_type="resume"
                        ))

                # Raise alert if duplicate (similarity > 85%)
                if sim_score >= 85.0:
                    cand_info_stmt = select(User).join(Candidate, User.id == Candidate.user_id).where(Candidate.id == other_cand_id)
                    cand_info_res = await db_session.execute(cand_info_stmt)
                    other_name = cand_info_res.scalar().full_name if cand_info_res.scalar() else f"Candidate {other_cand_id}"
                    alerts.append(f"Highly similar profile match! {sim_score}% profile text overlapping with candidate '{other_name}' (ID: {other_cand_id}).")

            await db_session.commit()
        except Exception as e:
            logger.error(f"Error computing candidate similarities: {e}")

        return max_similarity, alerts

    async def calculate_aggregate_fraud_report(self, candidate_id: int, db_session: Any) -> FraudReport:
        """
        Aggregate all indicators to generate a consolidated Fraud Report for a candidate.
        Pipes explanations to Gemini for enhancement if available.
        """
        # 1. Fetch Candidate with related data
        cand_stmt = select(Candidate).options(selectinload(Candidate.user), selectinload(Candidate.resumes)).where(Candidate.id == candidate_id)
        cand_res = await db_session.execute(cand_stmt)
        candidate = cand_res.scalar_one_or_none()

        if not candidate:
            raise ValueError(f"Candidate with ID {candidate_id} not found.")

        # 2. Get latest resume
        latest_resume = None
        if candidate.resumes:
            # Sort resumes by uploaded_at desc
            candidate.resumes.sort(key=lambda r: r.uploaded_at or datetime.min, reverse=True)
            latest_resume = candidate.resumes[0]

        resume_text = latest_resume.raw_text if latest_resume else ""
        parsed_data = latest_resume.parsed_data if latest_resume and latest_resume.parsed_data else {}

        # Fetch other candidates
        other_stmt = select(Candidate).options(selectinload(Candidate.user)).where(Candidate.id != candidate_id)
        other_res = await db_session.execute(other_stmt)
        other_candidates = other_res.scalars().all()

        # Run Checks
        id_score, id_alerts, id_details = await self.detect_identity_fraud(candidate, other_candidates)
        kw_score, kw_alerts, kw_details = self.detect_keyword_stuffing(resume_text)
        ai_score, ai_alerts, ai_details = self.detect_ai_authenticity(resume_text, parsed_data)
        sim_score, sim_alerts = await self.check_candidate_resume_similarity(candidate_id, resume_text, db_session)

        # Compile all alert messages
        all_alerts = id_alerts + kw_alerts + ai_alerts + sim_alerts

        # Check for interview level alerts (copy paste, voice repeats, face mismatch)
        # Fetch candidate's interviews and results
        int_stmt = select(Interview).options(selectinload(Interview.results)).where(Interview.candidate_id == candidate_id)
        int_res = await db_session.execute(int_stmt)
        interviews = int_res.scalars().all()

        interview_alerts = []
        face_alerts = []
        voice_alerts = []
        interview_details = {
            "copy_paste_count": 0,
            "repeated_answers_detected": False,
            "suspicious_speed_answers": 0,
            "synthetic_voice_flags": 0,
            "duplicate_recordings_count": 0,
            "face_mismatches_count": 0,
            "multiple_faces_frames": 0,
            "low_liveness_frames": 0
        }

        audio_hashes_seen = {} # hash -> (candidate_id, question_id)
        
        for interview in interviews:
            results = interview.results or []
            answers = [r.candidate_answer for r in results if r.candidate_answer]
            
            # Check repeated answers in same interview
            for idx, ans in enumerate(answers):
                for other_idx, other_ans in enumerate(answers):
                    if idx != other_idx and len(ans) > 20:
                        from sklearn.feature_extraction.text import TfidfVectorizer
                        from sklearn.metrics.pairwise import cosine_similarity
                        try:
                            tfidf = TfidfVectorizer(stop_words='english')
                            mat = tfidf.fit_transform([ans, other_ans])
                            sim = cosine_similarity(mat[0:1], mat[1:2])[0][0]
                            if sim > 0.90:
                                interview_details["repeated_answers_detected"] = True
                                interview_alerts.append(f"Repeated answer matching! Candidate submitted near-identical answer for Question {idx+1} and Question {other_idx+1} in Interview ID {interview.id}.")
                        except Exception:
                            pass

            for r in results:
                # 1. Clipboard copy-paste tracking (if flagged in metadata)
                if r.emotion_analytics and r.emotion_analytics.get("copy_paste_detected"):
                    interview_details["copy_paste_count"] += 1
                    interview_alerts.append(f"Clipboard copy-paste detected! Candidate pasted text into answer for question {r.question_number} (Interview ID {interview.id}).")
                
                # 2. Voice Checks: Repeated recordings & synthetic voice
                if r.audio_path and os.path.exists(r.audio_path):
                    try:
                        with open(r.audio_path, "rb") as f:
                            audio_bytes = f.read()
                        
                        audio_hash = self.ml.hash_audio_bytes(audio_bytes)
                        if audio_hash in audio_hashes_seen:
                            matched_cand, matched_q = audio_hashes_seen[audio_hash]
                            interview_details["duplicate_recordings_count"] += 1
                            voice_alerts.append(f"Duplicate voice recording detected! Audio file hash matches recording in Candidate {matched_cand} Question {matched_q}.")
                        else:
                            audio_hashes_seen[audio_hash] = (candidate_id, r.id)
                            
                        if r.emotion_analytics and r.emotion_analytics.get("synthetic_voice_indicator"):
                            interview_details["synthetic_voice_flags"] += 1
                            voice_alerts.append(f"Synthetic voice warning! Acoustic metadata reveals artificial/text-to-speech signal markers in Question {r.question_number}.")
                    except Exception as e:
                        logger.warning(f"Error checking voice fraud: {e}")

                # 3. Face snapshot checks
                if r.emotion_analytics:
                    faces = r.emotion_analytics.get("faces_detected", 1)
                    if faces > 1:
                        interview_details["multiple_faces_frames"] += 1
                        face_alerts.append(f"Multiple faces detected! Frame captured {faces} individuals in front of webcam during Question {r.question_number}.")
                    
                    liveness = r.emotion_analytics.get("liveness_score", 1.0)
                    if liveness < 0.65:
                        interview_details["low_liveness_frames"] += 1
                        face_alerts.append(f"Liveness verification failed! Captured facial depth/blink markers suggest photo/screen loop spoofing (Liveness: {liveness*100}%).")

                    if r.emotion_analytics.get("face_mismatch"):
                        interview_details["face_mismatches_count"] += 1
                        face_alerts.append(f"Face mismatch warning! Facial structure does not match initial photo snapshot for Question {r.question_number}.")

        all_alerts.extend(interview_alerts + voice_alerts + face_alerts)

        # Aggregate overall score
        interview_fraud_score = min(100.0, (interview_details["copy_paste_count"] * 25.0) + 
                                           (interview_details["duplicate_recordings_count"] * 50.0) +
                                           (interview_details["face_mismatches_count"] * 50.0) +
                                           (interview_details["low_liveness_frames"] * 40.0) +
                                           (interview_details["multiple_faces_frames"] * 30.0))

        overall_fraud_score = (id_score * 0.30) + (kw_score * 0.15) + (ai_score * 0.15) + (min(100.0, sim_score) * 0.20) + (interview_fraud_score * 0.20)
        overall_fraud_score = round(min(100.0, overall_fraud_score), 2)

        # Determine Risk Level
        if overall_fraud_score >= 80.0:
            risk_level = "Critical Risk"
            recommended_action = "IMMEDIATE REJECTION. Multiple critical integrity alerts triggered, indicating identity fraud or automated plagiarism."
        elif overall_fraud_score >= 50.0:
            risk_level = "High Risk"
            recommended_action = "FLAG PROFILE. Perform manual review of the resume details and double-check facial liveness logs/webcam records."
        elif overall_fraud_score >= 20.0:
            risk_level = "Medium Risk"
            recommended_action = "INSPECT INTEGRITY. Inspect the candidate's resume keywords and interview copy-paste activity for minor anomalies."
        else:
            risk_level = "Low Risk"
            recommended_action = "PROCEED. No significant fraud or integrity indicators detected."

        # Generate base explanation
        explanation = f"Fraud detection analysis complete for candidate. Total indicators triggered: {len(all_alerts)}. "
        if all_alerts:
            explanation += "Key factors: " + " ".join(all_alerts[:3])
        else:
            explanation += "Candidate profile exhibits high matching integrity with no suspicious duplication or keyword padding."

        # Enhance explanation with Gemini if available
        if self.gemini._enabled:
            try:
                prompt = f"""
You are an expert recruitment fraud analyst. Summarize this candidate's fraud report in 2 professional, objective sentences.
Fraud Score: {overall_fraud_score}/100
Risk Level: {risk_level}
Triggers detected:
{chr(10).join(['- ' + a for a in all_alerts])}

Provide a concise summary explaining why they have this risk level and what the recruiter should verify. Output only the plain text summary.
"""
                summary = await self.gemini.generate_summary_feedback(prompt)
                if summary and "disabled" not in summary.lower():
                    explanation = summary
            except Exception as e:
                logger.warning(f"Failed to enhance explanation using Gemini: {e}")

        # Check if report already exists, otherwise create it
        report_stmt = select(FraudReport).where(FraudReport.candidate_id == candidate_id)
        report_res = await db_session.execute(report_stmt)
        report = report_res.scalar_one_or_none()

        if report:
            report.fraud_score = overall_fraud_score
            report.risk_level = risk_level
            report.explanation = explanation
            report.recommended_action = recommended_action
            report.identity_fraud_alerts = id_details
            report.keyword_stuffing_alerts = kw_details
            report.ai_authenticity_alerts = ai_details
            report.interview_fraud_alerts = interview_details
            report.created_at = datetime.utcnow()
        else:
            report = FraudReport(
                candidate_id=candidate_id,
                fraud_score=overall_fraud_score,
                risk_level=risk_level,
                explanation=explanation,
                recommended_action=recommended_action,
                identity_fraud_alerts=id_details,
                keyword_stuffing_alerts=kw_details,
                ai_authenticity_alerts=ai_details,
                interview_fraud_alerts=interview_details,
                created_at=datetime.utcnow()
            )
            db_session.add(report)

        # Sync FraudAlert rows based on triggers
        # Dismiss existing alerts and re-insert active ones
        dismiss_stmt = select(FraudAlert).where(FraudAlert.candidate_id == candidate_id)
        dismiss_res = await db_session.execute(dismiss_stmt)
        existing_alerts = dismiss_res.scalars().all()
        for ea in existing_alerts:
            await db_session.delete(ea)

        for alert_msg in all_alerts:
            # Map severity
            severity = "info"
            alert_type = "general"
            if "duplicate email" in alert_msg.lower() or "duplicate phone" in alert_msg.lower():
                severity = "critical"
                alert_type = "identity"
            elif "unrealistic" in alert_msg.lower() or "similar profile" in alert_msg.lower():
                severity = "critical"
                alert_type = "ai_authenticity"
            elif "stuffing" in alert_msg.lower() or "optimization" in alert_msg.lower():
                severity = "warning"
                alert_type = "keyword_stuffing"
            elif "copy-paste" in alert_msg.lower() or "repeated answer" in alert_msg.lower():
                severity = "warning"
                alert_type = "copy_paste"
            elif "liveness" in alert_msg.lower() or "multiple faces" in alert_msg.lower():
                severity = "critical"
                alert_type = "face_mismatch"
            elif "duplicate voice" in alert_msg.lower():
                severity = "critical"
                alert_type = "voice_repeated"

            db_session.add(FraudAlert(
                candidate_id=candidate_id,
                alert_type=alert_type,
                severity=severity,
                message=alert_msg,
                details={},
                status="active"
            ))

        # Log new Fraud Events if critical
        if overall_fraud_score >= 50.0:
            db_session.add(FraudEvent(
                candidate_id=candidate_id,
                event_type="high_risk_score",
                score=overall_fraud_score,
                details={"alert_count": len(all_alerts), "risk_level": risk_level}
            ))

        await db_session.commit()
        return report

# Global access
_fraud_service: Optional[FraudDetectionService] = None

def get_fraud_service() -> FraudDetectionService:
    global _fraud_service
    if _fraud_service is None:
        _fraud_service = FraudDetectionService()
    return _fraud_service
