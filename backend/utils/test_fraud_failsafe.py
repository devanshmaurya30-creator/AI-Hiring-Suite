import asyncio
import sys
import os

# Add parent dir to python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.fraud_service import get_fraud_service
from services.gemini_service import get_gemini_service
from services.ml_service import get_ml_service

async def run_tests():
    print("--------------------------------------------------")
    print("AI-Hiring-Assistant Security & Fail-Safe Test Suite")
    print("--------------------------------------------------")

    # 1. Test TF-IDF Local Fallback evaluation
    print("\n[Test 1] Testing Local TF-IDF Grading Fallback...")
    gemini = get_gemini_service()
    
    question = "Explain the difference between SQL and NoSQL databases."
    expected = "SQL databases are relational, table-based, and use structured schemas. NoSQL databases are non-relational, document or key-value based, and are dynamically schemaless."
    candidate_good = "SQL databases are relational and use tables. NoSQL databases are non-relational and document based. SQL uses predefined schemas while NoSQL uses dynamic schemas."
    candidate_bad = "I do not know, databases store data."

    # Force a local fallback call
    good_eval = await gemini.run_local_fallback_evaluation(question, expected, candidate_good)
    bad_eval = await gemini.run_local_fallback_evaluation(question, expected, candidate_bad)

    print(f"Good Answer Score: {good_eval['score']}/10 | Feedback: {good_eval['feedback']}")
    print(f"Bad Answer Score: {bad_eval['score']}/10 | Feedback: {bad_eval['feedback']}")
    assert good_eval['score'] > bad_eval['score'], "Good answer should score higher than bad answer."
    print("=> TEST 1 PASSED!")

    # 2. Test timeline rule validation (e.g. 10 years of FastAPI experience)
    print("\n[Test 2] Testing Unrealistic Experience Claim Detection...")
    fraud = get_fraud_service()
    
    resume_good = "I have 4 years of experience working with FastAPI and 5 years of experience with React."
    resume_fraud = "I have 12 years of experience with FastAPI and 15 years of experience with Next.js."

    _, _, good_ai = fraud.detect_ai_authenticity(resume_good, {})
    _, _, fraud_ai = fraud.detect_ai_authenticity(resume_fraud, {})

    print(f"Good resume claims: {good_ai['unrealistic_claims']}")
    print(f"Fraudulent resume claims: {fraud_ai['unrealistic_claims']}")
    assert len(fraud_ai['unrealistic_claims']) > 0, "Unrealistic claims should have been flagged."
    print("=> TEST 2 PASSED!")

    # 3. Test Keyword Stuffing Detection
    print("\n[Test 3] Testing Keyword Stuffing Detection...")
    stuffing_resume = "Python python python Python Python development using python and python. React react react React React design with react."
    normal_resume = "Experienced software engineer with solid backgrounds in Python and React. Built robust web application microservices."

    _, _, stuff_res = fraud.detect_keyword_stuffing(stuffing_resume)
    _, _, normal_res = fraud.detect_keyword_stuffing(normal_resume)

    print(f"Stuffing indicators: {stuff_res['stuffed_keywords']}")
    print(f"Normal indicators: {normal_res['stuffed_keywords']}")
    assert stuff_res['stuffing_detected'] == True, "Stuffing should be detected."
    assert normal_res['stuffing_detected'] == False, "Normal text should not trigger stuffing."
    print("=> TEST 3 PASSED!")

    # 4. Test Whisper Standalone isolation
    print("\n[Test 4] Testing Voice Transcription standalone path...")
    ml = get_ml_service()
    # Mock audio bytes
    audio_dummy = b"RIFF dummy wave audio data content bytes block"
    # Execute transcription (with Whisper unavailable flag or execution path)
    transcript = await ml.transcribe_audio_whisper(audio_dummy)
    print(f"Generated transcript: {transcript}")
    assert "Gemini" not in transcript, "Gemini fallback should not be utilized in voice transcription."
    print("=> TEST 4 PASSED!")

    print("\n--------------------------------------------------")
    print("ALL TESTS COMPLETED SUCCESSFULLY!")
    print("--------------------------------------------------")

if __name__ == "__main__":
    asyncio.run(run_tests())
