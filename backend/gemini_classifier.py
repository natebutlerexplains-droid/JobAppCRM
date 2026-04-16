import json
import logging
import time
import re
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import google.generativeai as genai
import requests
from bs4 import BeautifulSoup

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
        if not Config.GEMINI_API_KEY:
            logger.warning("⚠️  GEMINI_API_KEY not configured! Set GEMINI_API_KEY environment variable.")
            raise ValueError("GEMINI_API_KEY environment variable is required")

        genai.configure(api_key=Config.GEMINI_API_KEY)
        self.model = genai.GenerativeModel(Config.GEMINI_MODEL)
        logger.info(f"✅ Gemini API initialized with model: {Config.GEMINI_MODEL}")

    def _extract_json(self, text: str) -> Optional[Dict[str, Any]]:
        """Extract JSON from text, handling markdown code fences and truncated responses."""
        # Remove markdown code fences if present
        text = re.sub(r"```json\s*", "", text)
        text = re.sub(r"```\s*$", "", text)
        text = text.strip()

        try:
            return json.loads(text)
        except json.JSONDecodeError as e:
            # Try to recover truncated JSON by finding the last complete object
            logger.debug(f"Failed to parse JSON (full): {text[:300]}")

            # Try removing incomplete trailing content
            if text.endswith(','):
                text = text[:-1]

            # Find the last closing brace and try parsing up to that point
            last_brace = text.rfind('}')
            if last_brace > 0:
                text_trimmed = text[:last_brace + 1]
                try:
                    result = json.loads(text_trimmed)
                    logger.info(f"Successfully parsed truncated JSON after recovery")
                    return result
                except json.JSONDecodeError:
                    pass

            logger.error(f"Failed to parse JSON (even after recovery): {text[:200]}")
            return None

    def _decode_safelinks(self, text: str) -> str:
        """Replace Microsoft SafeLinks URLs with their original destination URLs."""
        from urllib.parse import urlparse, parse_qs, unquote

        def _replace(m):
            try:
                url = m.group(0)
                parsed = urlparse(url)
                params = parse_qs(parsed.query)
                original = params.get('url', [url])[0]
                return unquote(original)
            except Exception:
                return m.group(0)

        return re.sub(r'https?://[^\s]*safelinks\.protection\.outlook\.com[^\s]*', _replace, text)

    def _clean_body_for_classification(self, text: str) -> str:
        """Clean email body for Gemini classification: remove tracking junk and normalize whitespace.

        Removes:
        - Zero-width and invisible Unicode chars (U+200B-U+200F, U+2028-U+202E, U+034F, U+FEFF)
        - URLs and bracketed URL labels (tracking links add nothing for classification)
        - Excessive whitespace

        Args:
            text: Raw email body text (may contain stored body_excerpt from DB)

        Returns:
            Cleaned text suitable for Gemini classification
        """
        # Remove zero-width and invisible unicode chars
        text = re.sub(r'[\u200b-\u200f\u2028\u2029\u202a-\u202e\u034f\ufeff]', '', text)
        # Decode SafeLinks before stripping — preserve destination URL text
        text = self._decode_safelinks(text)
        # Remove URLs (tracking links add nothing for classification)
        text = re.sub(r'https?://\S+', '', text)
        # Remove bracketed URL labels like [Indeed] or [https://...]
        text = re.sub(r'\[https?://[^\]]*\]', '', text)
        text = re.sub(r'\[[A-Z][a-z]+\]\s*', '', text)
        # Collapse whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    def classify_email(self, subject: str, body: str, sender: str) -> Dict[str, Any]:
        """Classify an email and return structured information."""
        gemini_rate_limiter.wait()

        # Clean body for classification (handles stored body_excerpt from DB)
        clean_body = self._clean_body_for_classification(body)[:1000]

        prompt = f"""You are an email classifier for job applications. Analyze the following email and respond ONLY with JSON, no markdown formatting.

Email Subject: {subject}
Email Body: {clean_body}
Sender: {sender}

Classify as ONE of:
1. "application_confirmation" - Email confirming that YOUR APPLICATION WAS RECEIVED (e.g., "Your application has been received", "Application status update", HR confirmation)
2. "job_lead" - Job recommendations/matches sent to you that YOU could apply to (e.g., "We found these jobs for you", "Recommended roles", "Job matches based on your profile")
3. "interview_request" - Request for an interview or next steps
4. "rejection" - Application rejected
5. "more_info_needed" - Requesting more information from you
6. "unrelated" - Not job-related (newsletters, notifications, marketing, social emails)

KEYWORDS FOR application_confirmation: "application received", "application status", "we received your", "confirmation of application", "application submitted", "Indeed Application:", "your application was sent", "application to", "thank you for applying", "thank you for your application", "has been received"

KEYWORDS FOR job_lead: "we found", "recommended for you", "job match", "based on your profile", "we think you'd be great"

KEYWORDS FOR unrelated: "newsletter", "notification", "social", "book recommendation", "sign in detected", "weekly digest"

SENDER GUIDANCE:
- Emails from HR platforms (ADP domains like *.hr@adp.com, Workday, Greenhouse, Indeed, Lever, Smartrecruiters) about applications → always application_confirmation
- Emails from LinkedIn job alerts (jobs-noreply@linkedin.com) with patterns like "your application was sent" → application_confirmation
- Do NOT classify HR platform emails as unrelated even if body is unclear

Respond with:
{{
  "is_job_related": boolean,
  "category": "application_confirmation|job_lead|interview_request|rejection|more_info_needed|unrelated",
  "company_extracted": "string or null",
  "job_title_extracted": "string or null",
  "requires_action": boolean,
  "action_summary": "string or null",
  "confidence": 0.0-1.0
}}

If you cannot determine the information, set it to null. The subject line is the strongest signal — if subject mentions 'application' or 'applied' in the context of a job, lean toward application_confirmation even if the body is unclear."""

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
                return {"category": "unrelated", "is_job_related": False, "confidence": 0.0}

        except Exception as e:
            logger.error(f"Gemini classification failed: {e}")
            return {"category": "unrelated", "is_job_related": False, "confidence": 0.0}

    def extract_application_info(self, subject: str, body: str, sender: str) -> Optional[Dict[str, str]]:
        """Extract company and job title from an application confirmation email."""
        gemini_rate_limiter.wait()

        # Combine subject and body for better extraction
        combined_text = f"Subject: {subject}\n\nBody: {body[:2000]}"

        prompt = f"""Extract company name and job title from this application confirmation email.
Always respond ONLY with valid JSON, no markdown formatting.

{combined_text}

Sender: {sender}

EXTRACTION RULES FOR COMPANY NAME:
- Look for full company names in subject, body, or sender domain (not just domain)
- Patterns: "at [Company Name]", "for [Company Name]", "[Company Name]'s", "behalf of [Company Name]"
- If sender has multi-word domain (e.g., vishay-precision.com or vishay-precision-group.com), extract as "Vishay Precision" or "Vishay Precision Group"
- Prefer full company name from body/subject over domain abbreviation
- Include subsidiary/division names if present (e.g., "Acme Corp's Engineering Division")

EXTRACTION RULES FOR JOB TITLE:
- Look for job titles in subject line (often formatted as "[JobTitle] - [Company]" or "Thanks for applying for [JobTitle]")
- Patterns: "applying for [title]", "position of [title]", "role of [title]", "as [title]"
- Common job titles: Engineer, Manager, Developer, Analyst, Coordinator, Specialist, etc.
- Extract the full job title (e.g., "Senior Software Engineer", not just "Engineer")
- If multiple roles mentioned, pick the most specific one from the subject line

Respond with ONLY this JSON structure (no markdown, no extra text):
{{
  "company_name": "full company name or null (prefer multi-word names)",
  "job_title": "full job title or null",
  "company_domain": "domain from sender email or null"
}}"""

        try:
            response = self.model.generate_content(prompt, generation_config=genai.types.GenerationConfig(
                temperature=0.1,
                max_output_tokens=200,
            ))

            result = self._extract_json(response.text)
            if result and (result.get("company_name") or result.get("job_title")):
                logger.info(f"Extracted: company={result.get('company_name')}, job={result.get('job_title')}")
                return result
            logger.warning(f"Extraction returned no data: {result}")
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
                    return [{"category": "unrelated", "is_job_related": False, "confidence": 0.0} for _ in emails]
            except json.JSONDecodeError:
                logger.error(f"Failed to parse batch classification JSON: {text[:200]}")
                return [{"category": "unrelated", "is_job_related": False, "confidence": 0.0} for _ in emails]

        except Exception as e:
            logger.error(f"Batch classification failed: {e}")
            return [{"category": "unrelated", "is_job_related": False, "confidence": 0.0} for _ in emails]

    def classify_email_with_feedback(self, subject: str, body: str, sender: str,
                                     feedback_examples: list) -> Dict[str, Any]:
        """Classify email with few-shot examples injected from user feedback.

        Args:
            subject: Email subject
            body: Email body
            sender: Email sender
            feedback_examples: List of dicts from ClassificationFeedback.get_recent() with training examples

        Returns:
            Classification dict with is_job_related, category, confidence, etc.
        """
        gemini_rate_limiter.wait()

        # Clean body for classification
        clean_body = self._clean_body_for_classification(body)[:1000]

        # Build few-shot block from feedback examples
        few_shot_block = ""
        if feedback_examples:
            examples = []
            for ex in feedback_examples[:10]:  # Cap at 10 to stay under token budget
                ex_body = self._clean_body_for_classification(ex.get("body_excerpt", ""))[:300]
                examples.append(
                    f'  Subject: "{ex["subject"]}"\n'
                    f'  Sender: "{ex["sender"]}"\n'
                    f'  Body: "{ex_body}"\n'
                    f'  Reason: {ex["reason_label"]}\n'
                    f'  → Correct category: "{ex["corrected_category"]}"'
                )
            few_shot_block = (
                "\n\nUSER-CORRECTED EXAMPLES (high-confidence training signal — follow these patterns):\n"
                + "\n\n".join(examples)
                + "\n"
            )

        # Build full prompt: reuse existing prompt structure with few-shot injection
        prompt = f"""You are an email classifier for job applications. Analyze the following email and respond ONLY with JSON, no markdown formatting.

Email Subject: {subject}
Email Body: {clean_body}
Sender: {sender}

Classify as ONE of:
1. "application_confirmation" - Email confirming that YOUR APPLICATION WAS RECEIVED (e.g., "Your application has been received", "Application status update", HR confirmation)
2. "job_lead" - Job recommendations/matches sent to you that YOU could apply to (e.g., "We found these jobs for you", "Recommended roles", "Job matches based on your profile")
3. "interview_request" - Request for an interview or next steps
4. "rejection" - Application rejected
5. "more_info_needed" - Requesting more information from you
6. "unrelated" - Not job-related (newsletters, notifications, marketing, social emails)

KEYWORDS FOR application_confirmation: "application received", "application status", "we received your", "confirmation of application", "application submitted", "Indeed Application:", "your application was sent", "application to", "thank you for applying", "thank you for your application", "has been received"

KEYWORDS FOR job_lead: "we found", "recommended for you", "job match", "based on your profile", "we think you'd be great"

KEYWORDS FOR unrelated: "newsletter", "notification", "social", "book recommendation", "sign in detected", "weekly digest"

SENDER GUIDANCE:
- Emails from HR platforms (ADP domains like *.hr@adp.com, Workday, Greenhouse, Indeed, Lever, Smartrecruiters) about applications → always application_confirmation
- Emails from LinkedIn job alerts (jobs-noreply@linkedin.com) with patterns like "your application was sent" → application_confirmation
- Do NOT classify HR platform emails as unrelated even if body is unclear
{few_shot_block}
Respond with:
{{
  "is_job_related": boolean,
  "category": "application_confirmation|job_lead|interview_request|rejection|more_info_needed|unrelated",
  "company_extracted": "string or null",
  "job_title_extracted": "string or null",
  "requires_action": boolean,
  "action_summary": "string or null",
  "confidence": 0.0-1.0
}}

If you cannot determine the information, set it to null. The subject line is the strongest signal — if subject mentions 'application' or 'applied' in the context of a job, lean toward application_confirmation even if the body is unclear."""

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
                return {"category": "unrelated", "is_job_related": False, "confidence": 0.0}

        except Exception as e:
            logger.error(f"Gemini classification with feedback failed: {e}")
            return {"category": "unrelated", "is_job_related": False, "confidence": 0.0}

    def _fetch_and_parse_website(self, url: str, timeout: int = 10) -> Optional[str]:
        """
        Fetch company website and extract main content.
        Returns: Plain text content (limit to 2000 chars for API efficiency)
        """
        try:
            # Add https:// if missing
            if not url.startswith(('http://', 'https://')):
                url = f'https://{url}'

            response = requests.get(url, timeout=timeout, headers={
                'User-Agent': 'Mozilla/5.0 (Job Interview CRM/1.0)'
            })
            response.raise_for_status()

            soup = BeautifulSoup(response.content, 'html.parser')

            # Extract main content (remove scripts, styles, etc.)
            for script in soup(["script", "style"]):
                script.decompose()

            text = soup.get_text()
            # Clean up whitespace
            lines = (line.strip() for line in text.splitlines())
            text = '\n'.join(line for line in lines if line)

            # Limit to first 2000 chars for efficiency
            return text[:2000]
        except Exception as e:
            logger.warning(f"Failed to crawl website {url}: {e}")
            return None

    def research_company_with_website(self, company_name: str, job_title: str, job_url: str, company_website: Optional[str] = None) -> Dict[str, Any]:
        """
        Research company with hybrid approach:
        1. If company_website provided, fetch and scrape content
        2. Provide scraped content + company_website to Gemini for extraction
        3. Fall back to pure Gemini knowledge if fetch fails
        """
        website_content = None
        web_crawled = False

        logger.info(f"🔍 Starting research for {company_name} ({job_title})")

        # Step 1: Try to fetch and parse website if URL provided
        if company_website:
            logger.info(f"🌐 Fetching website: {company_website}")
            website_content = self._fetch_and_parse_website(company_website)
            web_crawled = website_content is not None
            if web_crawled:
                logger.info(f"✅ Website fetched successfully ({len(website_content)} chars)")
            else:
                logger.info(f"⚠️  Website fetch failed, will use pure Gemini knowledge")
        else:
            logger.info("ℹ️  No website provided, using pure Gemini knowledge")

        # Step 2: Call Gemini with website content context
        gemini_rate_limiter.wait()
        logger.info(f"🤖 Calling Gemini API ({Config.GEMINI_MODEL}) to research company...")

        website_context = ""
        if website_content:
            website_context = f"\n\nCompany website content (for reference):\n{website_content}"

        prompt = f"""You are an expert research assistant. Research the following company and provide detailed, accurate information for interview preparation.

COMPANY INFO:
- Company: {company_name}
- Position: {job_title}
- Company Website: {company_website or "Not provided"}
- Job URL: {job_url}{website_context}

INSTRUCTIONS:
1. Respond with VALID, COMPLETE JSON only - no markdown code blocks, no explanations
2. Fill in every field with actual information or null if not available
3. Be accurate and specific
4. Use website content if available

REQUIRED JSON RESPONSE FORMAT (EXACT - must include all fields):
{{
  "company_overview": "2-3 sentence summary of company mission and focus",
  "key_products": ["Product/service 1", "Product/service 2", "Key offering 3"],
  "company_culture": "Description of company culture, values, and work environment",
  "org_structure": "How the company is organized (teams, departments, reporting structure)",
  "ceo_info": "CEO/founder name and brief background",
  "recent_news": ["News item 1", "News item 2", "News item 3"],
  "industry_relevance": "Why this company and industry matter, and current trends",
  "hiring_focus": "What this company focuses on when hiring for {job_title} roles"
}}

Now provide the complete JSON response with all 8 fields filled in:"""

        try:
            response = self.model.generate_content(prompt, generation_config=genai.types.GenerationConfig(
                temperature=0.5,
                max_output_tokens=2000,
            ))

            logger.info(f"✅ Gemini API response received ({len(response.text)} chars)")
            result = self._extract_json(response.text)

            if result and result.get("company_overview"):
                logger.info(f"✅ Successfully researched {company_name} (web_crawled={web_crawled}, source={'website_content' if web_crawled else 'gemini_knowledge'})")
                result["web_crawled"] = web_crawled
                result["data_source"] = "website_content" if web_crawled else "gemini_knowledge"
                return result
            else:
                logger.warning(f"⚠️  Company research returned incomplete data: {result}")
                return {
                    "company_overview": f"Unable to gather detailed information about {company_name}",
                    "key_products": [],
                    "company_culture": None,
                    "org_structure": None,
                    "ceo_info": None,
                    "recent_news": [],
                    "industry_relevance": None,
                    "hiring_focus": None,
                    "web_crawled": web_crawled,
                    "data_source": "website_content" if web_crawled else "gemini_knowledge",
                }

        except Exception as e:
            logger.error(f"❌ Company research FAILED: {e}", exc_info=True)
            return {
                "company_overview": None,
                "key_products": [],
                "company_culture": None,
                "org_structure": None,
                "ceo_info": None,
                "recent_news": [],
                "industry_relevance": None,
                "hiring_focus": None,
                "web_crawled": False,
                "data_source": "error",
            }

    def research_company(self, company_name: str, job_title: str, job_url: Optional[str] = None, company_website: Optional[str] = None) -> Dict[str, Any]:
        """
        Legacy wrapper - now calls research_company_with_website.
        Maintains backward compatibility while enabling web crawling.
        """
        return self.research_company_with_website(company_name, job_title, job_url or "", company_website)

    def research_company_legacy(self, company_name: str, job_title: str, job_url: Optional[str] = None) -> Dict[str, Any]:
        """Research a company for interview preparation (pure Gemini, no web crawling)."""
        gemini_rate_limiter.wait()

        job_url_context = f"\nJob URL: {job_url}" if job_url else ""

        prompt = f"""Research this company and role for interview preparation. Respond ONLY with valid JSON, no markdown formatting.

Company: {company_name}
Job Title: {job_title}{job_url_context}

Provide research information in this JSON format (respond with ONLY the JSON):
{{
  "summary": "2-3 sentence overview of what the company does",
  "business_model": "How the company makes money / revenue model",
  "recent_news": ["Notable news item 1 from last 6 months", "Notable news item 2"],
  "culture_notes": "Key insights about company culture and work environment",
  "key_facts": ["Fact 1 to know before interviewing", "Fact 2", "Fact 3"]
}}

Focus on information that would be useful for someone interviewing for a {job_title} role."""

        try:
            response = self.model.generate_content(prompt, generation_config=genai.types.GenerationConfig(
                temperature=0.7,
                max_output_tokens=600,
            ))

            result = self._extract_json(response.text)
            if result and result.get("summary"):
                logger.info(f"Researched company: {company_name}")
                return result
            else:
                logger.warning(f"Company research returned incomplete data: {result}")
                return {
                    "summary": f"Unable to gather detailed information about {company_name}",
                    "business_model": None,
                    "recent_news": [],
                    "culture_notes": None,
                    "key_facts": [],
                }

        except Exception as e:
            logger.error(f"Company research failed: {e}")
            return {"summary": None, "business_model": None, "recent_news": [], "culture_notes": None, "key_facts": []}

    def generate_interview_prep(self, company_name: str, job_title: str, company_research: Dict[str, Any]) -> Dict[str, Any]:
        """Generate interview questions and questions to ask based on company research."""
        gemini_rate_limiter.wait()

        research_context = f"""
Company Summary: {company_research.get('summary', 'N/A')}
Business Model: {company_research.get('business_model', 'N/A')}
Culture Notes: {company_research.get('culture_notes', 'N/A')}
Key Facts: {', '.join(company_research.get('key_facts', []))}
"""

        prompt = f"""Generate interview preparation questions for this role. Respond ONLY with valid JSON, no markdown formatting.

Company: {company_name}
Job Title: {job_title}

Background:{research_context}

Generate interview questions and questions to ask the interviewer in this JSON format (respond with ONLY the JSON):
{{
  "interview_questions": [
    {{"question": "Question 1", "category": "behavioral", "answer_hint": "Hint for how to answer"}},
    {{"question": "Question 2", "category": "technical", "answer_hint": "Hint for how to answer"}},
    ...10 total questions...
  ],
  "questions_to_ask": [
    "What does success look like in the first 90 days?",
    "How do you measure performance for this role?",
    ...5-8 questions to ask the interviewer...
  ]
}}

Categories: behavioral, technical, situational
Include at least 3-4 of each category type.
Questions should be specific to a {job_title} role at {company_name}."""

        try:
            response = self.model.generate_content(prompt, generation_config=genai.types.GenerationConfig(
                temperature=0.7,
                max_output_tokens=1200,
            ))

            result = self._extract_json(response.text)
            if result and result.get("interview_questions"):
                logger.info(f"Generated {len(result['interview_questions'])} interview questions for {company_name}")
                return result
            else:
                logger.warning(f"Interview question generation returned incomplete data: {result}")
                return {"interview_questions": [], "questions_to_ask": []}

        except Exception as e:
            logger.error(f"Interview question generation failed: {e}")
            return {"interview_questions": [], "questions_to_ask": []}

    def run_quiz(self, company_name: str, job_title: str, question: str, user_answer: str, company_research: Dict[str, Any]) -> Dict[str, Any]:
        """Score a user's answer to an interview question."""
        gemini_rate_limiter.wait()

        research_context = f"""
Company: {company_name}
Role: {job_title}
Company Summary: {company_research.get('summary', 'N/A')}
"""

        prompt = f"""Score this answer to an interview question. Respond ONLY with valid JSON, no markdown formatting.

{research_context}

Interview Question: {question}

Candidate's Answer: {user_answer}

Score the answer and provide feedback in this JSON format (respond with ONLY the JSON):
{{
  "score": 7,
  "feedback": "This is a strong answer because... Could be improved by...",
  "suggested_answer": "Here's how a strong answer might address this question..."
}}

Score: 0-10 where 10 is excellent, 5 is average, 0 is not addressing the question.
Feedback: 2-3 sentences of constructive feedback.
Suggested answer: A 2-3 sentence example of a strong answer.
Consider the {job_title} role at {company_name} when scoring."""

        try:
            response = self.model.generate_content(prompt, generation_config=genai.types.GenerationConfig(
                temperature=0.7,
                max_output_tokens=400,
            ))

            result = self._extract_json(response.text)
            if result and "score" in result:
                logger.info(f"Quiz answer scored: {result.get('score')}/10")
                return result
            else:
                logger.warning(f"Quiz scoring returned incomplete data: {result}")
                return {"score": 5, "feedback": "Unable to score this answer", "suggested_answer": None}

        except Exception as e:
            logger.error(f"Quiz scoring failed: {e}")
            return {"score": 0, "feedback": "Error scoring answer", "suggested_answer": None}
