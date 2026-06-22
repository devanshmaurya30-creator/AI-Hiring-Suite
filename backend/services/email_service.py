import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

class EmailService:
    def __init__(self):
        import os
        self.enabled = os.getenv("EMAIL_ENABLED", "false").lower() == "true"
        self.host = os.getenv("SMTP_HOST", "localhost")
        self.port = int(os.getenv("SMTP_PORT", "587"))
        self.user = os.getenv("SMTP_USER", "")
        self.password = os.getenv("SMTP_PASSWORD", "")
        self.from_email = os.getenv("EMAIL_FROM", "hr@aihiring.local")

    async def send_email(self, recipient: str, subject: str, html_body: str, ics_content: str = None) -> bool:
        if not self.enabled:
            logger.info(f"Email disabled. Would have sent to {recipient}: {subject}")
            return True
            
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = self.from_email
        msg["To"] = recipient
        
        part = MIMEText(html_body, "html")
        msg.attach(part)
        
        if ics_content:
            from email.mime.base import MIMEBase
            from email import encoders
            ics_part = MIMEBase("text", "calendar", method="REQUEST")
            ics_part.set_payload(ics_content)
            encoders.encode_base64(ics_part)
            ics_part.add_header("Content-Disposition", "attachment; filename=invite.ics")
            msg.attach(ics_part)
        
        try:
            server = smtplib.SMTP(self.host, self.port)
            server.starttls()
            if self.user and self.password:
                server.login(self.user, self.password)
            server.sendmail(self.from_email, recipient, msg.as_string())
            server.quit()
            logger.info(f"Email sent to {recipient}: {subject}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email to {recipient}: {e}")
            return False

_email_service = None
def get_email_service() -> EmailService:
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service
