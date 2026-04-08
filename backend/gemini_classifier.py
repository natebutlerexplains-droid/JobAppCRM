import json
import logging
import time
import re
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import google.generativeai as genai

try:
    from .config import Config
except ImportError:
    from config import Config

logger = logging.getLogger(__name__)


class RateLimiter:
    """Simple rate limiter for Gemini API (1 request per second)."""

    def __init__(self, requests_per_second: int = 1):
        self.min_interval = 1.0 / requests_per_second
        self.last_request_time = 0

    def wait(self):
        """Wait if necessary to respect the rate limit."""
        elapsed = time.time() - self.last_request_time
        if elapsed < self.min_interval:
            time.sleep(self.min_interval - elapsed)
        self.last_request_time = time.time()


# Global rate limiter instance (shared across all Gemini calls)
gemini_rate_limiter = RateLimiter(requests_per_second=1)


class GeminiClassifier:
    """Classifies job application emails using Google Gemini API."""

    def __init__(self):
        genai.configure(api_key=Config.GEMINI_API_KEY)
        self.model = genai.GenerativeModel(Config.GEMINI_MODEL)

    def _extract_json(self, text: str) -> Optional[Dict[str, Any]]:
        """Extract JSON from text, handling markdown code fences."""
        # Remove markdown code fences if present
        text = re.sub(r"```json\s*", "", text)
        text = re.sub(r"```\s*$", "", text)
        text = text.strip()

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            logger.error(f"Failed to parse JSON: {text[:200]}")
            return None

    def classify_email(self, subject: str, body: str, sender: str) -> Dict[str, Any]:
        """Classify an email and return structured information."""
        gemini_rate_limiter.wait()

        prompt = f"""You are an email classifier for job applications. Analyze the following email and respond ONLY with JSON, no markdown formatting.

Email Subject: {subject}
Email Body: {body[:2000]}
Sender: {sender}

Respond with:
{{
  "is_job_related": boolean,
  "email_type": "application_confirmation|interview_request|rejection|more_info_needed|other",
  "company_extracted": "string or null",
  "job_title_extracted": "string or null",
  "requires_action": boolean,
  "action_summary": "string or null",
  "confidence": 0.0-1.0
}}

If you cannot determine the information, set it to null. Be strict about what constitutes a job application email."""

        try:
            response = self.model.generate_content(prompt, generation_config=genai.types.GenerationConfig(
                temperature=0.1,
                max_output_tokens=500,
            ))

            result = self._extract_json(response.text)
            if result:
                return result
            else:
                logger.error(f"Failed to parse Gemini response: {response.text[:500]}")
                return {"email_type": "unclassified", "is_job_related": False, "confidence": 0.0}

        except Exception as e:
            logger.error(f"Gemini classification failed: {e}")
            return {"email_type": "unclassified", "is_job_related": False, "confidence": 0.0}

    def extract_application_info(self, subject: str, body: str, sender: str) -> Optional[Dict[str, str]]:
        """Extract company and job title from an application confirmation email."""
        gemini_rate_limiter.wait()

        prompt = f"""Extract company name and job title from this application confirmation email. Respond ONLY with JSON.

Subject: {subject}
Body: {body[:2000]}
Sender: {sender}

Respond with:
{{
  "company_name": "string",
  "job_title": "string",
  "company_domain": "domain extracted from sender email or null"
}}

If you cannot extract the information, set to null. Be specific and accurate."""

        try:
            response = self.model.generate_content(prompt, generation_config=genai.types.GenerationConfig(
                temperature=0.1,
                max_output_tokens=200,
            ))

            result = self._extract_json(response.text)
            if result and result.get("company_name"):
                return result
            return None

        except Exception as e:
            logger.error(f"Failed to extract application info: {e}")
            return None

    def semantic_match_email_to_applications(
        self, subject: str, body: str, sender: str, applications: list
    ) -> Dict[str, Any]:
        """Use Gemini to find which application(s) this email belongs to."""
        gemini_rate_limiter.wait()

        # Format applications list for the prompt
        app_list = "\n".join([
            f"ID: {app['id']}, Company: {app['company_name']}, Role: {app['job_title']}, Domain: {app.get('company_domain', 'N/A')}"
            for app in applications[:20]  # Cap at 20 to avoid token limits
        ])

        prompt = f"""Match this email to one or more job applications. Respond ONLY with JSON.

Email Subject: {subject}
Email Body: {body[:1000]}
Sender: {sender}

Available Applications:
{app_list}

Respond with:
{{
  "matched_app_ids": [list of matching IDs or empty],
  "match_confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}}

Be conservative - only match if you're confident this email is related to that application."""

        try:
            response = self.model.generate_content(prompt, generation_config=genai.types.GenerationConfig(
                temperature=0.1,
                max_output_tokens=300,
            ))

            result = self._extract_json(response.text)
            if result:
                return result
            return {"matched_app_ids": [], "match_confidence": 0.0}

        except Exception as e:
            logger.error(f"Semantic matching failed: {e}")
            return {"matched_app_ids": [], "match_confidence": 0.0}

    def batch_classify_emails(self, emails: list) -> list:
        """Classify multiple emails in a single API call (optimization for bulk processing).

        Args:
            emails: List of dicts with keys: subject, body, sender

        Returns:
            List of classification results (same format as classify_email)
        """
        if not emails:
            return []

        if len(emails) == 1:
            # Single email - use regular method
            email = emails[0]
            return [self.classify_email(email['subject'], email['body'], email['sender'])]

        # For multiple emails, batch them in a single prompt to reduce API calls
        gemini_rate_limiter.wait()

        # Format emails for batch processing
        email_list = "\n\n".join([
            f"EMAIL {i+1}:\nSubject: {e['subject']}\nBody: {e['body'][:500]}\nSender: {e['sender']}"
            for i, e in enumerate(emails[:10])  # Batch up to 10 at a time to avoid token limits
        ])

        prompt = f"""Classify the following {len(emails[:10])} emails for job applications. Respond ONLY with a JSON array, no markdown.

{email_list}

For EACH email, respond with an object:
{{
  "email_index": number (0-based),
  "is_job_related": boolean,
  "email_type": "application_confirmation|interview_request|rejection|more_info_needed|other",
  "company_extracted": "string or null",
  "job_title_extracted": "string or null",
  "requires_action": boolean,
  "action_summary": "string or null",
  "confidence": 0.0-1.0
}}

Respond with a JSON array of these objects. Be strict about what constitutes a job application email."""

        try:
            response = self.model.generate_content(prompt, generation_config=genai.types.GenerationConfig(
                temperature=0.1,
                max_output_tokens=2000,
            ))

            # Extract JSON array
            text = response.text
            text = re.sub(r"```json\s*", "", text)
            text = re.sub(r"```\s*$", "", text)
            text = text.strip()

            try:
                results = json.loads(text)
                if isinstance(results, list):
                    # Ensure all results have the email_index for tracking
                    return results
                else:
                    logger.error(f"Batch classification returned non-array: {text[:200]}")
                    return [{"email_type": "unclassified", "is_job_related": False, "confidence": 0.0} for _ in emails]
            except json.JSONDecodeError:
                logger.error(f"Failed to parse batch classification JSON: {text[:200]}")
                return [{"email_type": "unclassified", "is_job_related": False, "confidence": 0.0} for _ in emails]

        except Exception as e:
            logger.error(f"Batch classification failed: {e}")
            return [{"email_type": "unclassified", "is_job_related": False, "confidence": 0.0} for _ in emails]
