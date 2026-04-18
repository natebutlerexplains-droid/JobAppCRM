"""
Email processor module stub.
Handles email fetching, classification, and application linking.
"""

import logging

logger = logging.getLogger(__name__)


class EmailProcessor:
    """Processes emails: fetch, classify, link to applications."""

    def __init__(self, db, cancel_event=None):
        """Initialize email processor."""
        self.db = db
        self.cancel_event = cancel_event
        # Note: ClaudeClassifier removed - using manual markdown upload workflow
        logger.info("📧 EmailProcessor initialized")

    def process_emails(self, days_back=7):
        """
        Process unlinked emails (stub).
        TODO: Implement full email fetch + classify + link logic
        """
        logger.warning("📧 Email processing not yet fully implemented")
        return {
            "processed": 0,
            "linked": 0,
            "non_job_related": 0,
        }
