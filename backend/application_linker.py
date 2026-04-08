import logging
import re
from typing import List, Dict, Any, Optional, Tuple
from urllib.parse import urlparse

from .models import Database, Application
from .gemini_classifier import GeminiClassifier

logger = logging.getLogger(__name__)


class ApplicationLinker:
    """Links emails to applications using domain matching, keyword matching, and semantic matching."""

    def __init__(self, db: Database, classifier: GeminiClassifier):
        self.db = db
        self.classifier = classifier

    def _extract_domain_from_email(self, email_address: str) -> str:
        """Extract domain from email address."""
        if "@" in email_address:
            return email_address.split("@")[1].lower()
        return ""

    def _extract_domain_from_url(self, url: str) -> str:
        """Extract domain from a URL."""
        try:
            parsed = urlparse(url)
            domain = parsed.netloc or parsed.path
            # Remove www. prefix
            domain = domain.replace("www.", "")
            return domain.lower()
        except:
            return ""

    def _domains_match(self, domain1: str, domain2: str) -> bool:
        """Check if two domains match (handling variations like google.com vs alphabet.com)."""
        if not domain1 or not domain2:
            return False

        # Exact match
        if domain1 == domain2:
            return True

        # Check if one is a subdomain of the other
        if domain1.endswith(f".{domain2}") or domain2.endswith(f".{domain1}"):
            return True

        return False

    def _keyword_match(self, subject: str, body: str, application: Dict[str, Any]) -> float:
        """
        Match based on company name and job title keywords.
        Returns confidence 0.7 if matched, 0.0 otherwise.
        """
        company_name = application["company_name"].lower()
        job_title = application["job_title"].lower()
        search_text = f"{subject} {body}".lower()

        # Check for company name match
        if company_name in search_text:
            return 0.7

        # Check for partial company name match (for companies with multiple words)
        company_words = company_name.split()
        if len(company_words) > 1:
            # If most words match, it's likely the right company
            matching_words = sum(1 for word in company_words if word in search_text and len(word) > 3)
            if matching_words >= len(company_words) - 1:
                return 0.6

        # Check for job title match (be careful with generic titles)
        if len(job_title) > 10 and job_title in search_text:
            return 0.6

        return 0.0

    def _domain_match(self, sender_email: str, application: Dict[str, Any]) -> float:
        """
        Domain matching: compare sender email domain to company domain.
        Returns 0.9 if matched, 0.0 otherwise.
        """
        sender_domain = self._extract_domain_from_email(sender_email)
        company_domain = application.get("company_domain", "")

        if self._domains_match(sender_domain, company_domain):
            return 0.9

        return 0.0

    def link_email(self, subject: str, body: str, sender: str) -> Optional[Dict[str, Any]]:
        """
        Link an email to the best matching application.
        Returns {"app_id": int, "confidence": float} or None if no match found.
        """
        applications = Application.get_all(self.db)
        if not applications:
            return None

        matches = []

        # Try domain matching first
        for app in applications:
            domain_confidence = self._domain_match(sender, app)
            if domain_confidence > 0.8:
                matches.append({
                    "app_id": app["id"],
                    "confidence": domain_confidence,
                    "method": "domain"
                })

        # If domain matching didn't work, try keyword matching
        if not matches:
            for app in applications:
                keyword_confidence = self._keyword_match(subject, body, app)
                if keyword_confidence > 0.0:
                    matches.append({
                        "app_id": app["id"],
                        "confidence": keyword_confidence,
                        "method": "keyword"
                    })

        # If still no match, try Gemini semantic matching
        if not matches:
            # Filter to recent applications to avoid token overload
            recent_apps = sorted(
                applications,
                key=lambda x: x.get("date_submitted", ""),
                reverse=True
            )[:20]

            semantic_result = self.classifier.semantic_match_email_to_applications(
                subject, body, sender, recent_apps
            )

            if semantic_result.get("matched_app_ids"):
                for app_id in semantic_result["matched_app_ids"]:
                    matches.append({
                        "app_id": app_id,
                        "confidence": semantic_result.get("match_confidence", 0.5),
                        "method": "semantic"
                    })

        # Sort by confidence (descending)
        matches.sort(key=lambda x: x["confidence"], reverse=True)

        # Apply linking logic
        if not matches:
            return None

        best_match = matches[0]

        # If best match is below threshold, no link
        if best_match["confidence"] < 0.7:
            return None

        # If multiple matches above threshold, flag for manual review
        high_confidence_matches = [m for m in matches if m["confidence"] > 0.7]
        if len(high_confidence_matches) > 1:
            logger.info(
                f"Ambiguous match for email '{subject}': "
                f"{len(high_confidence_matches)} applications match. "
                f"Sending to unlinked tray for manual review."
            )
            return None  # Return None to indicate it should go to unlinked tray

        return best_match

    def get_matching_applications(self, subject: str, body: str, sender: str) -> List[Dict[str, Any]]:
        """
        Find all applications that could match this email.
        Used for the Gemini semantic matching.
        """
        return Application.get_all(self.db)
