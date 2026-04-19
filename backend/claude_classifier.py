"""
Anthropic Claude API Classifier
Handles email classification, company research, and interview prep generation.
"""

import json
import logging
import requests
from bs4 import BeautifulSoup
from anthropic import Anthropic
from config import Config

logger = logging.getLogger(__name__)


class ClaudeClassifier:
    """AI classifier using Anthropic Claude API"""

    def __init__(self, api_key=None):
        self.api_key = api_key or Config.CLAUDE_API_KEY
        if not self.api_key:
            raise ValueError("CLAUDE_API_KEY not set in environment")

        self.client = Anthropic(api_key=self.api_key)
        self.model = "claude-3-5-sonnet-20241022"

        logger.info(f"🤖 ClaudeClassifier initialized with {self.model}")

    def classify_email(self, subject, body, sender):
        """
        Classify email into job-related categories.

        Returns:
            dict: Classification result with category, confidence, extracted fields
        """
        prompt = f"""Classify the following email as it relates to job applications.

Subject: {subject}
From: {sender}
Body: {body}

Respond with ONLY valid JSON (no markdown, no code fences):
{{
  "is_job_related": boolean,
  "category": "application_confirmation|job_lead|interview_request|rejection|more_info_needed|unrelated",
  "company_extracted": "company name or null",
  "job_title_extracted": "job title or null",
  "requires_action": boolean,
  "action_summary": "brief action needed or null",
  "confidence": 0.0-1.0
}}"""

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=500,
                temperature=0.1,
                messages=[{"role": "user", "content": prompt}],
            )

            result = self._extract_json(response.content[0].text)
            if result:
                return result

            logger.warning("Failed to parse email classification response")
            return self._get_default_classification()

        except Exception as e:
            logger.error(f"Email classification failed: {e}")
            return self._get_default_classification()

    def research_company_with_website(
        self, company_name, job_title, job_url, company_website=None
    ):
        """
        Research company for interview prep with optional website crawling.

        Args:
            company_name: Name of company
            job_title: Job title/position
            job_url: URL to job posting
            company_website: Optional company website URL for crawling

        Returns:
            dict: Company research with overview, products, culture, etc.
        """
        website_content = None
        web_crawled = False

        # Try to fetch and parse website if provided
        if company_website:
            website_content = self._fetch_and_parse_website(company_website)
            web_crawled = website_content is not None

        website_context = ""
        if website_content:
            website_context = f"\n\nCompany website content (for reference):\n{website_content}"

        prompt = f"""Research and extract detailed information for interview preparation.

Company: {company_name}
Job Title: {job_title}
Job URL: {job_url}
Website: {company_website or "Not provided"}{website_context}

Respond with ONLY valid JSON (no markdown, no code fences):
{{
  "company_overview": "2-3 sentence summary of company mission and focus",
  "key_products": ["Product/service 1", "Product/service 2", "Key offering 3"],
  "company_culture": "Description of company culture, values, work style",
  "org_structure": "Basic description of how company is organized (teams, departments, reporting structure)",
  "ceo_info": "CEO/founder name and brief background if available",
  "recent_news": ["News item 1 from 2024-2026", "News item 2", "Relevant industry news"],
  "industry_relevance": "Why this company/industry matters and current trends affecting the role",
  "hiring_focus": "What this company is likely focusing on for {job_title} roles"
}}"""

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=2000,
                temperature=0.7,
                messages=[{"role": "user", "content": prompt}],
            )

            result = self._extract_json(response.content[0].text)
            if result:
                result["web_crawled"] = web_crawled
                result["data_source"] = (
                    "website_content" if web_crawled else "claude_knowledge"
                )
                return result

            logger.warning("Failed to parse company research response")
            return self._get_default_research()

        except Exception as e:
            logger.error(f"Company research failed: {e}")
            return self._get_default_research()

    def generate_interview_prep(self, company_name, job_title, company_research):
        """
        Generate interview questions based on company research.

        Args:
            company_name: Company name
            job_title: Job position
            company_research: Dict of company research data

        Returns:
            dict: Interview questions and suggested counter-questions
        """
        research_summary = (
            json.dumps(company_research)
            if isinstance(company_research, dict)
            else company_research
        )

        prompt = f"""Generate interview preparation questions for this role.

Company: {company_name}
Position: {job_title}

Company Info:
{research_summary}

Generate comprehensive interview questions and provide as JSON:
{{
  "interview_questions": [
    {{"question": "Tell me about a time when...", "category": "behavioral", "answer_hint": "Look for examples of..."}}
  ],
  "questions_to_ask": [
    "What does success look like in the first 90 days?",
    "Tell me about the team I would be working with"
  ]
}}"""

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=2000,
                temperature=0.7,
                messages=[{"role": "user", "content": prompt}],
            )

            result = self._extract_json(response.content[0].text)
            if result:
                return result

            logger.warning("Failed to parse interview prep response")
            return {"interview_questions": [], "questions_to_ask": []}

        except Exception as e:
            logger.error(f"Interview prep generation failed: {e}")
            return {"interview_questions": [], "questions_to_ask": []}

    def run_quiz(self, question, user_answer, model_answer):
        """
        Score user's answer to an interview question.

        Args:
            question: The interview question
            user_answer: User's written answer
            model_answer: Model answer/guidance

        Returns:
            dict: Score (0-100) and feedback
        """
        prompt = f"""Score the following interview answer.

Question: {question}

Model Answer (expected points to cover):
{model_answer}

User's Answer:
{user_answer}

Evaluate and respond with ONLY valid JSON (no markdown):
{{
  "score": 0-100,
  "feedback": "constructive feedback on the answer",
  "strengths": ["what they did well"],
  "improvements": ["areas to improve"]
}}"""

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=500,
                temperature=0.7,
                messages=[{"role": "user", "content": prompt}],
            )

            result = self._extract_json(response.content[0].text)
            if result:
                return result

            logger.warning("Failed to parse quiz response")
            return {"score": 0, "feedback": "Unable to score answer"}

        except Exception as e:
            logger.error(f"Quiz scoring failed: {e}")
            return {"score": 0, "feedback": "Error scoring answer"}

    def _fetch_and_parse_website(self, url, timeout=10):
        """
        Fetch company website and extract main content.

        Args:
            url: Company website URL
            timeout: Request timeout in seconds

        Returns:
            str: Plain text content (limited to 2000 chars) or None on error
        """
        try:
            # Add https:// if missing
            if not url.startswith(("http://", "https://")):
                url = f"https://{url}"

            response = requests.get(
                url,
                timeout=timeout,
                headers={"User-Agent": "Mozilla/5.0 (JobAppCRM/1.0)"},
            )
            response.raise_for_status()

            soup = BeautifulSoup(response.content, "html.parser")

            # Remove script and style elements
            for script in soup(["script", "style"]):
                script.decompose()

            # Extract text
            text = soup.get_text()

            # Clean up whitespace
            lines = (line.strip() for line in text.splitlines())
            text = "\n".join(line for line in lines if line)

            # Limit to first 2000 chars
            return text[:2000]

        except Exception as e:
            logger.warning(f"Website fetch failed for {url}: {e}")
            return None

    def _extract_json(self, text):
        """
        Extract JSON from response text, handling markdown code fences.

        Args:
            text: Response text that may contain JSON

        Returns:
            dict: Parsed JSON or None on error
        """
        try:
            # Remove markdown code fences if present
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()

            return json.loads(text)

        except Exception as e:
            logger.error(f"Failed to parse JSON response: {e}")
            return None

    def _get_default_classification(self):
        """Get default classification when parsing fails."""
        return {
            "is_job_related": False,
            "category": "unrelated",
            "company_extracted": None,
            "job_title_extracted": None,
            "requires_action": False,
            "action_summary": None,
            "confidence": 0.0,
        }

    def _get_default_research(self):
        """Get default research response when parsing fails."""
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
