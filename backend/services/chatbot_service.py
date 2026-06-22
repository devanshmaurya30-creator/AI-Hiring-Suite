import json
import logging
from typing import List, Dict, Any, Optional
from services.gemini_service import get_gemini_service

logger = logging.getLogger(__name__)

class ChatbotService:
    def __init__(self):
        self.gemini = get_gemini_service()

    def get_kb_fallback(self, message: str) -> str:
        msg_lower = message.lower()
        if any(k in msg_lower for k in ["schedule", "reschedule", "time", "calendar", "meeting"]):
            return ("You can check, reschedule, or cancel your interview itinerary via the Schedule tab. "
                    "Recruiter accounts have access to modify the dates, and confirmation email notifications "
                    "will be sent automatically with ICS attachments.")
        elif any(k in msg_lower for k in ["status", "application", "apply", "job"]):
            return ("Your job match scores and rankings can be viewed under the Jobs and Dashboard sections. "
                    "The assistant ranks candidate matches using advanced NLP similarity analysis.")
        elif any(k in msg_lower for k in ["interview", "voice", "practice", "question"]):
            return ("The voice interview module processes speech recordings locally using standalone OpenAI Whisper. "
                    "You can start an interview session under the Interviews tab, which will present role-specific "
                    "technical questions.")
        elif any(k in msg_lower for k in ["resume", "upload", "parse"]):
            return ("Resumes can be uploaded in PDF or text format on the Upload page. "
                    "The parser will extract your experience, skills, and projects using local regex and metadata fallbacks "
                    "if the primary LLM parser is busy.")
        elif any(k in msg_lower for k in ["score", "evaluation", "result"]):
            return ("After completing your interview, the system evaluates your answers. "
                    "If our primary AI services are heavily loaded, a local TF-IDF overlap scoring fallback takes over "
                    "to ensure your responses are successfully submitted and graded.")
        elif any(k in msg_lower for k in ["cheating", "fraud", "security"]):
            return ("The assistant performs identity fraud checking (email, phone, GitHub, LinkedIn), "
                    "keyword stuffing checks, and voice authenticity metrics. These results are saved directly "
                    "to the Integrity log on the Recruiter Dashboard.")
        elif any(k in msg_lower for k in ["help", "prepare", "guide"]):
            return ("I can help you navigate this recruitment portal. Try asking about 'interviews', "
                    "'uploading resumes', 'checking status', or 'scheduling dates'.")
        
        return ("I am currently operating in offline mode as the primary AI service is busy. "
                "I can answer questions about the interview process, scheduling, resume uploading, and candidate evaluation. "
                "What would you like assistance with?")

    async def generate_response(self, candidate_id: int, message: str, history: List[Dict[str, str]], candidate_info: Optional[Dict[str, Any]] = None) -> str:
        try:
            client = self.gemini._get_client()
            
            system_prompt = "You are a helpful AI HR assistant. Help the candidate with their job search, skills, and interview preparation. Be concise and professional."
            if candidate_info:
                system_prompt += f"\nCandidate Profile: {json.dumps(candidate_info)}"
                
            messages = [{"role": "user", "parts": [{"text": system_prompt}]}]
            for msg in history:
                role = "user" if msg["role"] == "user" else "model"
                messages.append({"role": role, "parts": [{"text": msg["content"]}]})
                
            messages.append({"role": "user", "parts": [{"text": message}]})
            
            import asyncio
            def _call() -> str:
                response = client.models.generate_content(
                    model=self.gemini.MODEL_NAME,
                    contents=messages
                )
                return response.text or ""

            text = await asyncio.to_thread(_call)
            if not text:
                raise ValueError("Received empty response from Gemini.")
            return text
        except Exception as e:
            logger.error(f"Chatbot failed: {e}. Falling back to knowledge-base responses.")
            return self.get_kb_fallback(message)

    def generate_response_stream(self, candidate_id: int, message: str, history: List[Dict[str, str]], candidate_info: Optional[Dict[str, Any]] = None):
        try:
            client = self.gemini._get_client()
            
            system_prompt = "You are a helpful AI HR assistant. Help the candidate with their job search, skills, and interview preparation. Be concise and professional."
            if candidate_info:
                system_prompt += f"\nCandidate Profile: {json.dumps(candidate_info)}"
                
            messages = [{"role": "user", "parts": [{"text": system_prompt}]}]
            for msg in history:
                role = "user" if msg["role"] == "user" else "model"
                messages.append({"role": role, "parts": [{"text": msg["content"]}]})
                
            messages.append({"role": "user", "parts": [{"text": message}]})
            
            response = client.models.generate_content_stream(
                model=self.gemini.MODEL_NAME,
                contents=messages
            )
            for chunk in response:
                yield chunk.text
        except Exception as e:
            logger.error(f"Chatbot streaming failed: {e}. Falling back to knowledge-base response stream.")
            kb_resp = self.get_kb_fallback(message)
            for word in kb_resp.split(" "):
                yield word + " "

_chatbot_service: Optional[ChatbotService] = None
def get_chatbot_service() -> ChatbotService:
    global _chatbot_service
    if _chatbot_service is None:
        _chatbot_service = ChatbotService()
    return _chatbot_service
