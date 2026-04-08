import logging
import time
from datetime import datetime, timedelta
from typing import List, Dict, Any

from models import Database, Application, Email, StageSuggestion, SyncLog
from auth import get_authenticated_api
from gemini_classifier import GeminiClassifier
from application_linker import ApplicationLinker

logger = logging.getLogger(__name__)


class EmailProcessor:
    """Processes emails: fetches, classifies, and links them to applications."""

    def __init__(self, db: Database):
        self.db = db
        self.classifier = GeminiClassifier()
        self.linker = ApplicationLinker(db, self.classifier)

    def process_emails(self, days_back: int = 30, max_retries: int = 3) -> Dict[str, Any]:
        """
        Main email processing pipeline:
        1. Fetch emails from MS Graph
        2. Classify with Gemini
        3. Link to applications
        4. Create stage suggestions
        """
        sync_log_id = SyncLog.create(self.db)
        stats = {
            "emails_fetched": 0,
            "emails_processed": 0,
            "apps_created": 0,
            "errors": [],
            "new_suggestions": 0,
        }

        try:
            # Fetch emails from MS Graph with retry logic
            emails = self._fetch_emails_with_retry(days_back, max_retries)
            stats["emails_fetched"] = len(emails)
            logger.info(f"Fetched {len(emails)} emails from Outlook")

            # Process each email
            for email in emails:
                try:
                    self._process_single_email(email, stats)
                except Exception as e:
                    logger.error(f"Error processing email {email.get('id')}: {e}")
                    stats["errors"].append(str(e))

            # Update sync log
            SyncLog.update(
                self.db,
                sync_log_id,
                emails_fetched=stats["emails_fetched"],
                emails_processed=stats["emails_processed"],
                apps_created=stats["apps_created"],
                status="completed",
                errors=stats["errors"] if stats["errors"] else None,
            )

            logger.info(f"Email processing complete: {stats}")
            return stats

        except Exception as e:
            logger.error(f"Fatal error in email processing: {e}")
            stats["errors"].append(f"Fatal error: {str(e)}")
            SyncLog.update(
                self.db,
                sync_log_id,
                status="failed",
                errors=stats["errors"],
            )
            return stats

    def _fetch_emails_with_retry(self, days_back: int = 30, max_retries: int = 3) -> List[Dict[str, Any]]:
        """Fetch emails with exponential backoff on throttling."""
        for attempt in range(max_retries):
            try:
                api = get_authenticated_api()
                emails = api.get_emails(days_back=days_back)
                return emails
            except Exception as e:
                if "429" in str(e) or "rate limit" in str(e).lower():
                    wait_time = 2 ** attempt  # Exponential backoff
                    logger.warning(f"Rate limited. Waiting {wait_time}s before retry...")
                    time.sleep(wait_time)
                else:
                    raise

        raise Exception("Max retries exceeded for email fetching")

    def _process_single_email(self, email: Dict[str, Any], stats: Dict[str, Any]):
        """Process a single email: classify, link, and create suggestions."""
        ms_message_id = email.get("id")
        subject = email.get("subject", "")
        body = email.get("body", "")
        sender = email.get("from", "")
        received_date = email.get("receivedDateTime", datetime.now().isoformat())

        # Check if already processed
        if Email.is_processed(self.db, ms_message_id):
            logger.debug(f"Email {ms_message_id} already processed, skipping")
            return

        # Classify the email
        classification = self.classifier.classify_email(subject, body, sender)
        email_type = classification.get("email_type", "other")
        confidence = classification.get("confidence", 0.0)

        logger.info(f"Classified email: {subject[:50]}... as {email_type} (confidence: {confidence})")

        # Handle application confirmation emails specially
        if email_type == "application_confirmation":
            self._handle_confirmation_email(email, classification, stats)
        else:
            # Link to existing application
            self._link_and_store_email(email, classification, stats)

        # Mark as processed
        Email.mark_as_processed(self.db, ms_message_id)
        stats["emails_processed"] += 1

    def _handle_confirmation_email(self, email: Dict[str, Any], classification: Dict[str, Any],
                                   stats: Dict[str, Any]):
        """Handle application confirmation emails: auto-create Application record."""
        # Extract application info
        app_info = self.classifier.extract_application_info(
            email.get("subject", ""),
            email.get("body", ""),
            email.get("from", ""),
        )

        if app_info and app_info.get("company_name"):
            company_name = app_info["company_name"]
            job_title = app_info.get("job_title", "Unknown Role")
            company_domain = app_info.get("company_domain")
            received_date = email.get("receivedDateTime", datetime.now().isoformat())

            # Parse date to YYYY-MM-DD format
            try:
                date_obj = datetime.fromisoformat(received_date.replace("Z", "+00:00"))
                date_submitted = date_obj.date().isoformat()
            except:
                date_submitted = datetime.now().date().isoformat()

            # Create the application
            app_id = Application.create(
                self.db,
                company_name=company_name,
                job_title=job_title,
                date_submitted=date_submitted,
                company_domain=company_domain,
            )
            logger.info(f"Auto-created application: {company_name} - {job_title}")
            stats["apps_created"] += 1

            # Store the email linked to the new application
            Email.create(
                self.db,
                ms_message_id=email.get("id"),
                sender=email.get("from", ""),
                subject=email.get("subject", ""),
                body_excerpt=email.get("body", "")[:2000],
                date_received=email.get("receivedDateTime"),
                email_type="application_confirmation",
                gemini_classification=classification,
                application_id=app_id,
                linked_confidence=1.0,  # Confirmation emails are high confidence
            )
        else:
            # Couldn't extract application info, store as unclassified
            self._link_and_store_email(email, classification, stats)

    def _link_and_store_email(self, email: Dict[str, Any], classification: Dict[str, Any],
                             stats: Dict[str, Any]):
        """Link email to an application and store it."""
        # Try to link the email
        match = self.linker.link_email(
            email.get("subject", ""),
            email.get("body", ""),
            email.get("from", ""),
        )

        app_id = match["app_id"] if match else None
        confidence = match["confidence"] if match else None

        # Store the email
        email_id = Email.create(
            self.db,
            ms_message_id=email.get("id"),
            sender=email.get("from", ""),
            subject=email.get("subject", ""),
            body_excerpt=email.get("body", "")[:2000],
            date_received=email.get("receivedDateTime"),
            email_type=classification.get("email_type", "other"),
            gemini_classification=classification,
            application_id=app_id,
            linked_confidence=confidence,
        )

        # If linked, create a stage suggestion if applicable
        if app_id:
            self._create_stage_suggestion_if_applicable(app_id, classification, stats)

    def _create_stage_suggestion_if_applicable(self, app_id: int, classification: Dict[str, Any],
                                               stats: Dict[str, Any]):
        """Create a stage suggestion based on email type."""
        email_type = classification.get("email_type")
        app = Application.get_by_id(self.db, app_id)

        if not app:
            return

        current_status = app["status"]
        suggestion = None

        if email_type == "interview_request" and current_status == "Submitted":
            suggestion = {
                "from_stage": "Submitted",
                "to_stage": "Interview Started",
                "reason": f"Email from {classification.get('action_summary', 'Interview request received')}",
            }

        elif email_type == "rejection" and current_status != "Denied":
            suggestion = {
                "from_stage": current_status,
                "to_stage": "Denied",
                "reason": "Rejection email received",
            }

        elif email_type == "offer" and current_status != "Offered":
            suggestion = {
                "from_stage": current_status,
                "to_stage": "Offered",
                "reason": "Offer received",
            }

        elif email_type == "more_info_needed" and current_status == "Submitted":
            suggestion = {
                "from_stage": "Submitted",
                "to_stage": "More Info Required",
                "reason": "Additional information requested",
            }

        if suggestion:
            StageSuggestion.create(
                self.db,
                app_id=app_id,
                from_stage=suggestion["from_stage"],
                to_stage=suggestion["to_stage"],
                reason=suggestion["reason"],
                confidence=classification.get("confidence", 0.7),
            )
            stats["new_suggestions"] += 1
            logger.info(f"Created stage suggestion for app {app_id}: {suggestion['from_stage']} → {suggestion['to_stage']}")
