import logging
import os
import re
import threading
import json
from datetime import datetime, timedelta
from flask import Flask, jsonify, request
from flask_cors import CORS
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from config import Config, logger
from models import Database, Application, Email, StageSuggestion, SyncLog, ClassificationFeedback, InterviewPrep
from email_processor import EmailProcessor

# Configure logging
logging.basicConfig(
    level=Config.LOG_LEVEL,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

# Initialize Flask app
app = Flask(__name__)
app.config["JSON_SORT_KEYS"] = False
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16MB max

# CORS: Only allow localhost in dev
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:3000",
            "http://localhost:3001",
            "http://localhost:3002",
            "http://localhost:3003",
            "http://localhost:3004",
            "http://localhost:3005",
            "http://localhost:3006",
            "http://localhost:3007",
            "http://localhost:3008",
            "http://localhost:3009",
            "http://localhost:3010",
            "http://localhost:3307",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:3001",
            "http://127.0.0.1:3002",
            "http://127.0.0.1:3003",
            "http://127.0.0.1:3004",
            "http://127.0.0.1:3005",
            "http://127.0.0.1:3006",
            "http://127.0.0.1:3007",
            "http://127.0.0.1:3008",
            "http://127.0.0.1:3009",
            "http://127.0.0.1:3010",
            "http://127.0.0.1:3307"
        ],
        "methods": ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type"],
        "supports_credentials": True
    }
})

# Security: Add response headers after each request
@app.after_request
def add_security_headers(response):
    """Add security headers to all responses."""
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data:; "
        "font-src 'self'"
    )
    return response

# Initialize database
logger.info(f"Initializing database at: {Config.DATABASE_PATH}")
db = Database(Config.DATABASE_PATH)

# Initialize scheduler
scheduler = BackgroundScheduler()
current_sync = {"cancel_event": None, "log_id": None}


# Scheduler functions
def sync_emails_job():
    """Background job to sync emails."""
    logger.info("Starting scheduled email sync...")
    cancel_event = threading.Event()
    current_sync["cancel_event"] = cancel_event
    current_sync["log_id"] = None
    try:
        processor = EmailProcessor(db, cancel_event=cancel_event)
        stats = processor.process_emails(days_back=getattr(Config, 'EMAIL_SYNC_DAYS_BACK', 7))
        logger.info(f"Email sync completed: {stats}")
    except Exception as e:
        logger.error(f"Email sync failed: {e}")
    finally:
        current_sync["cancel_event"] = None
        current_sync["log_id"] = None


def check_and_sync_on_startup():
    """Check if we should run a sync on startup (if last sync was >4 hours ago)."""
    try:
        last_sync = SyncLog.get_latest(db)
        if not last_sync or not last_sync.get("finished_at"):
            # No previous sync, don't auto-sync on startup
            return

        finished_at = datetime.fromisoformat(last_sync["finished_at"].replace("Z", "+00:00"))
        hours_since = (datetime.now(finished_at.tzinfo) - finished_at).total_seconds() / 3600

        if hours_since > Config.STARTUP_SYNC_THRESHOLD_HOURS:
            logger.info(f"Last sync was {hours_since:.1f} hours ago. Running sync now...")
            sync_emails_job()
    except Exception as e:
        logger.error(f"Error checking for startup sync: {e}")


# Initialize scheduler
def calculate_next_sync_time(schedule):
    """Calculate the next sync time based on schedule."""
    from models import AppConfig

    now = datetime.now()

    if schedule == "daily":
        # Next sync at 2 AM
        next_time = now.replace(hour=Config.SYNC_SCHEDULE_HOUR, minute=Config.SYNC_SCHEDULE_MINUTE, second=0, microsecond=0)
        if next_time <= now:
            next_time += timedelta(days=1)

    elif schedule == "every_4_hours":
        # Next sync at 2, 6, 10, 14, 18, or 22 o'clock
        hours = [2, 6, 10, 14, 18, 22]
        next_time = None
        for hour in hours:
            candidate = now.replace(hour=hour, minute=0, second=0, microsecond=0)
            if candidate > now:
                next_time = candidate
                break
        if not next_time:
            # All times passed today, next is 2 AM tomorrow
            next_time = (now + timedelta(days=1)).replace(hour=2, minute=0, second=0, microsecond=0)

    elif schedule == "manual_only":
        next_time = None

    return next_time.isoformat() if next_time else None


def update_scheduler_for_schedule(schedule):
    """Update APScheduler jobs based on selected schedule."""
    try:
        from models import AppConfig

        # Remove existing sync jobs
        for job_id in [f"sync_every_4h_{i}" for i in range(6)]:
            try:
                scheduler.remove_job(job_id)
            except:
                pass
        try:
            scheduler.remove_job("daily_email_sync")
        except:
            pass

        if schedule == "daily":
            scheduler.add_job(
                sync_emails_job,
                trigger=CronTrigger(hour=Config.SYNC_SCHEDULE_HOUR, minute=Config.SYNC_SCHEDULE_MINUTE),
                id="daily_email_sync",
                name="Daily email sync at 2 AM",
                replace_existing=True,
            )
            logger.info("Scheduler updated: daily sync at 2 AM")

        elif schedule == "every_4_hours":
            # Add jobs at 2 AM, 6 AM, 10 AM, 2 PM, 6 PM, 10 PM
            hours = [2, 6, 10, 14, 18, 22]
            for i, hour in enumerate(hours):
                scheduler.add_job(
                    sync_emails_job,
                    trigger=CronTrigger(hour=hour, minute=0),
                    id=f"sync_every_4h_{i}",
                    name=f"Email sync at {hour:02d}:00",
                    replace_existing=True,
                )
            logger.info("Scheduler updated: sync every 4 hours")

        elif schedule == "manual_only":
            logger.info("Scheduler updated: manual sync only (no scheduled jobs)")

        # Calculate and store next sync time
        next_sync_time = calculate_next_sync_time(schedule)
        if next_sync_time:
            AppConfig.set_next_sync_time(db, next_sync_time)
            logger.info(f"Next sync scheduled for: {next_sync_time}")

    except Exception as e:
        logger.error(f"Error updating scheduler: {e}")
        raise


def init_scheduler():
    """Initialize APScheduler jobs."""
    from models import AppConfig

    # Get the configured schedule from config table
    schedule = AppConfig.get_sync_schedule(db)

    # Initialize based on configured schedule
    update_scheduler_for_schedule(schedule)
    scheduler.start()
    logger.info(f"APScheduler initialized with schedule: {schedule}")


# Predefined reason codes for user corrections
VALID_REASON_CODES = {
    "application_confirmation": {
        "OBVIOUS_LANGUAGE": "Contains obvious confirmation language ('Thank you for applying', 'We received your application', 'application has been received')",
        "KNOWN_HR_PLATFORM": "From a known HR platform (ADP, Workday, Greenhouse, Lever) that was missed by rules",
        "CLEAR_SUBJECT": "Subject line clearly indicates application ('Indeed Application:', company name + role)",
        "LINKEDIN_PATTERN": "LinkedIn application confirmation pattern not matched",
        "BODY_TOO_VAGUE": "Body content was too sparse or junk-filled for Gemini to parse correctly",
    },
    "rejection": {
        "EXPLICIT_DENIAL": "Email explicitly states application was denied or rejected",
        "MOVE_FORWARD_LANGUAGE": "Contains 'move forward with other candidates' or similar",
        "CLEAR_REJECTION_SUBJECT": "Subject line contains 'rejection', 'denied', or 'not selected'",
    },
    "more_info_needed": {
        "REQUESTED_INFO": "Email asks for additional information or documents",
        "FOLLOW_UP_NEEDED": "Email indicates need to follow up with more details",
        "ASSESSMENT_PENDING": "Email indicates assessment or interview stage needs more from candidate",
    },
    "job_lead": {
        "JOB_RECOMMENDATIONS": "Email contains job recommendations sent to me",
        "JOB_ALERT": "Job alert from a job board I subscribed to",
        "RECRUITER_OUTREACH": "Recruiter outreach about job opportunities",
    },
    "unrelated": {
        "CONFIRMED_SPAM": "Spam or promotional email with no job relevance",
        "CONFIRMED_NOTIFICATION": "System notification unrelated to jobs",
        "CONFIRMED_PERSONAL": "Personal email with no job relevance",
        "WRONG_INBOX": "Misfiled / not job-related",
    }
}


# Deterministic email classifier (runs BEFORE Gemini to handle clear-cut cases)
def _classify_by_rules(subject: str, sender: str, body_excerpt: str):
    """Classify email using deterministic rules. Returns classification dict or None if no rule matches.

    Returns:
        Dict with keys: category, confidence, source, company_extracted, job_title_extracted, is_job_related
        Or None if no rule matches (caller should use Gemini)
    """
    subject_lower = subject.lower()
    sender_lower = sender.lower()
    body_lower = body_excerpt.lower()

    # ===== APPLICATION CONFIRMATION RULES (highest priority) =====

    # Rule 1: Indeed sender + any Indeed-related subject pattern
    if "indeedapply@indeed.com" in sender_lower or "no-reply@indeed.com" in sender_lower:
        # Parse job title from subject after "Indeed Application: " pattern
        job_title = None
        match = re.search(r'Indeed Application:\s*(.+?)(?:\s*$|\s*–)', subject)
        if match:
            job_title = match.group(1).strip()

        return {
            "category": "application_confirmation",
            "confidence": 1.0,
            "source": "rules",
            "company_extracted": "Indeed",
            "job_title_extracted": job_title or "Position from Indeed",
            "is_job_related": True,
        }

    # Rule 2: ADP sender (*.hr@adp.com) - parse company from sender prefix
    if ".hr@adp.com" in sender_lower:
        # Extract company name from sender (e.g., "InsourceServices" from "InsourceServices.hr@adp.com")
        company_match = re.search(r'^([^@\.]+)(?:\.hr)?@adp\.com', sender_lower)
        company_name = None
        if company_match:
            # Convert "insourceservices" to "Insource Services"
            raw = company_match.group(1)
            company_name = ' '.join(re.findall('[A-Z][a-z]*', raw)) if raw else None
            if not company_name:
                # Fallback for single-word companies
                company_name = raw.capitalize()

        # Parse job title from body ("application for the {Role} position")
        job_title = None
        job_match = re.search(r'application for (?:the )?(.+?)(?:\s+position)?[.!]', body_lower)
        if job_match:
            job_title = job_match.group(1).strip().title()

        return {
            "category": "application_confirmation",
            "confidence": 1.0,
            "source": "rules",
            "company_extracted": company_name or "ADP Employer",
            "job_title_extracted": job_title or "Position via ADP",
            "is_job_related": True,
        }

    # Rule 3: LinkedIn job confirmations ("your application was sent to {Company}")
    if "jobs-noreply@linkedin.com" in sender_lower:
        # Pattern 1: "your application was sent to {Company}"
        company_match = re.search(r'your application was sent to\s+(.+?)(?:\s+for|\s+as a|\s*$)', subject_lower, re.IGNORECASE)
        if company_match:
            company_name = company_match.group(1).strip().title()
            return {
                "category": "application_confirmation",
                "confidence": 1.0,
                "source": "rules",
                "company_extracted": company_name,
                "job_title_extracted": None,
                "is_job_related": True,
            }

        # Pattern 2: "Your application to {Role} at {Company}"
        app_match = re.search(r'your application to\s+(.+?)\s+at\s+(.+?)$', subject_lower, re.IGNORECASE)
        if app_match:
            job_title = app_match.group(1).strip().title()
            company_name = app_match.group(2).strip().title()
            return {
                "category": "application_confirmation",
                "confidence": 1.0,
                "source": "rules",
                "company_extracted": company_name,
                "job_title_extracted": job_title,
                "is_job_related": True,
            }

    # Rule 4: Other HR platforms (Workday, Greenhouse, Lever, etc.)
    hr_platform_patterns = [
        r"@workday\.com",
        r"@greenhouse\.io",
        r"@lever\.co",
        r"@smartrecruiters\.com",
        r"@taleo\.net",
        r"@icims\.com",
        r"@myworkdayjobs\.com",
        r"no\.reply@email\.roberthalf\.com"
    ]
    if any(re.search(pattern, sender_lower) for pattern in hr_platform_patterns):
        # HR platforms always send application confirmations when email is about applications
        if any(keyword in subject_lower for keyword in ["application", "applied", "received", "submitted"]):
            return {
                "category": "application_confirmation",
                "confidence": 1.0,
                "source": "rules",
                "company_extracted": None,
                "job_title_extracted": None,
                "is_job_related": True,
            }

    # Rule 5: Subject line patterns for confirmation
    confirmation_subject_patterns = [
        r"Indeed Application:",
        r"application received",
        r"application submitted",
        r"thank you for applying",
        r"thank you for your application",
        r"your application.*received",
    ]
    if any(re.search(pattern, subject_lower, re.IGNORECASE) for pattern in confirmation_subject_patterns):
        return {
            "category": "application_confirmation",
            "confidence": 0.95,
            "source": "rules",
            "company_extracted": None,
            "job_title_extracted": None,
            "is_job_related": True,
        }

    # ===== UNRELATED RULES (return early to skip Gemini) =====

    unrelated_senders = [
        r"@s\.kohls\.com",
        r"@adtcontrol\.com",
        r"@e\.ncl\.com",
        r"@thepointsguy\.com",
        r"@redditmail\.com",
        r"@medium\.com",
        r"@americanexpress\.com",
        r"@skool\.com",
        r"invitations@linkedin\.com",
        r"messaging-digest-noreply@linkedin\.com",
    ]
    if any(re.search(pattern, sender_lower) for pattern in unrelated_senders):
        return {
            "category": "unrelated",
            "confidence": 1.0,
            "source": "rules",
            "company_extracted": None,
            "job_title_extracted": None,
            "is_job_related": False,
        }

    unrelated_subject_patterns = [
        r"new notification since",
        r"Google Alert",
        r"sign-in detected",
        r"weekly digest",
    ]
    if any(re.search(pattern, subject, re.IGNORECASE) for pattern in unrelated_subject_patterns):
        return {
            "category": "unrelated",
            "confidence": 1.0,
            "source": "rules",
            "company_extracted": None,
            "job_title_extracted": None,
            "is_job_related": False,
        }

    # ===== JOB LEAD RULES =====

    if "noreply@glassdoor.com" in sender_lower and any(w in subject_lower for w in ["jobs", "hiring"]):
        return {
            "category": "job_lead",
            "confidence": 0.95,
            "source": "rules",
            "company_extracted": None,
            "job_title_extracted": None,
            "is_job_related": True,
        }

    if "monster@notifications.monster.com" in sender_lower:
        return {
            "category": "job_lead",
            "confidence": 0.95,
            "source": "rules",
            "company_extracted": None,
            "job_title_extracted": None,
            "is_job_related": True,
        }

    if "jobalerts-noreply@linkedin.com" in sender_lower:
        return {
            "category": "job_lead",
            "confidence": 0.95,
            "source": "rules",
            "company_extracted": None,
            "job_title_extracted": None,
            "is_job_related": True,
        }

    # No rule matched, return None so Gemini will be used
    return None


# API Routes

@app.route("/api/applications", methods=["GET"])
def get_applications():
    """Get applications with optional search and filters."""
    try:
        search_term = request.args.get("search", "").strip()
        status_filter = request.args.get("status", "").strip()
        email_type_filter = request.args.get("email_type", "").strip()

        apps = Application.get_all(db)

        # Apply search filter (company name, job title, or sender email)
        if search_term:
            search_lower = search_term.lower()
            filtered_apps = []
            for app in apps:
                # Check company name and job title
                if (search_lower in app.get("company_name", "").lower() or
                    search_lower in app.get("job_title", "").lower()):
                    filtered_apps.append(app)
                else:
                    # Check email senders for this application
                    try:
                        emails = Email.get_by_application(db, app["id"])
                        for email in emails:
                            if search_lower in email.get("sender", "").lower():
                                filtered_apps.append(app)
                                break
                    except:
                        pass
            apps = filtered_apps

        # Apply status filter
        if status_filter:
            apps = [app for app in apps if app.get("status") == status_filter]

        # Apply email type filter
        if email_type_filter:
            filtered_by_type = []
            for app in apps:
                try:
                    emails = Email.get_by_application(db, app["id"])
                    # Check if any email has the requested type
                    if any(email.get("email_type") == email_type_filter for email in emails):
                        filtered_by_type.append(app)
                except:
                    pass
            apps = filtered_by_type

        return jsonify(apps), 200
    except Exception as e:
        logger.error(f"Error fetching applications: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/applications", methods=["POST"])
def create_application():
    """Create a new application."""
    try:
        data = request.json or {}
        validate_required_fields(data, ["company_name", "job_title", "date_submitted"])

        # Sanitize inputs
        company_name = sanitize_text(data["company_name"], 255)
        job_title = sanitize_text(data["job_title"], 255)
        date_submitted = sanitize_text(data["date_submitted"], 50)

        app_id = Application.create(
            db,
            company_name=company_name,
            job_title=job_title,
            date_submitted=date_submitted,
            company_domain=data.get("company_domain"),
            job_url=data.get("job_url"),
        )

        app = Application.get_by_id(db, app_id)
        return jsonify(app), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error(f"Error creating application: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/filter-options", methods=["GET"])
def get_filter_options():
    """Get available filter options (statuses and email types)."""
    try:
        apps = Application.get_all(db)
        statuses = set()
        email_types = set()

        for app in apps:
            status = app.get("status")
            if status:
                statuses.add(status)
            try:
                emails = Email.get_by_application(db, app["id"])
                for email in emails:
                    email_type = email.get("email_type")
                    if email_type:
                        email_types.add(email_type)
            except:
                pass

        return jsonify({
            "statuses": sorted(list(statuses)),
            "email_types": sorted(list(email_types))
        }), 200
    except Exception as e:
        logger.error(f"Error fetching filter options: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/applications/<int:app_id>", methods=["GET"])
def get_application(app_id):
    """Get a specific application."""
    try:
        app = Application.get_by_id(db, app_id)
        if not app:
            return jsonify({"error": "Application not found"}), 404
        return jsonify(app), 200
    except Exception as e:
        logger.error(f"Error fetching application: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/applications/<int:app_id>", methods=["PATCH"])
def update_application(app_id):
    """Update an application (supports company_name, job_title, job_url, notes, salary_min, salary_max, status, company_domain)."""
    try:
        data = request.json or {}

        # Validate status if provided
        if "status" in data and data["status"]:
            validate_status(data["status"])

        # Use the generic update method which handles all whitelisted fields
        Application.update(db, app_id, data)

        app = Application.get_by_id(db, app_id)
        if not app:
            return jsonify({"error": "Application not found"}), 404
        return jsonify(app), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error(f"Error updating application: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/applications/reorder", methods=["POST"])
def reorder_applications():
    """Bulk update order_position for applications."""
    try:
        data = request.json or {}
        orders = data.get('orders', [])

        if not orders:
            return jsonify({"error": "No orders provided"}), 400

        # Update each application's order_position
        for order in orders:
            app_id = order.get('id')
            position = order.get('order_position')
            if app_id is not None and position is not None:
                Application.update(db, app_id, {'order_position': position})

        return jsonify({"message": "Applications reordered"}), 200
    except Exception as e:
        logger.error(f"Error reordering applications: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/applications/<int:app_id>", methods=["DELETE"])
def delete_application(app_id):
    """Delete an application."""
    try:
        Application.delete(db, app_id)
        return jsonify({"message": "Application deleted"}), 200
    except Exception as e:
        logger.error(f"Error deleting application: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/applications/<int:app_id>/emails", methods=["GET"])
def get_application_emails(app_id):
    """Get all emails for an application."""
    try:
        emails = Email.get_by_application(db, app_id)
        return jsonify(emails), 200
    except Exception as e:
        logger.error(f"Error fetching emails: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/applications/<int:app_id>/interactions", methods=["GET"])
def get_application_interactions(app_id):
    """Get all interactions for an application."""
    try:
        from models import Interaction
        interactions = Interaction.get_by_application(db, app_id)
        return jsonify(interactions), 200
    except Exception as e:
        logger.error(f"Error fetching interactions: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/applications/<int:app_id>/interactions", methods=["POST"])
def create_interaction(app_id):
    """Create an interaction for an application."""
    try:
        from models import Interaction
        data = request.json or {}
        validate_required_fields(data, ["type"])

        interaction_id = Interaction.create(
            db,
            app_id=app_id,
            type_=sanitize_text(data["type"], 100),
            content=data.get("content"),
            occurred_at=data.get("occurred_at"),
            suggested_stage_change=data.get("suggested_stage_change"),
        )

        return jsonify({"id": interaction_id, "message": "Interaction created"}), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error(f"Error creating interaction: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/stats", methods=["GET"])
def get_stats():
    """Get application statistics."""
    try:
        stats = Application.get_stats(db)
        return jsonify(stats), 200
    except Exception as e:
        logger.error(f"Error fetching stats: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/stage-suggestions", methods=["GET"])
def get_stage_suggestions():
    """Get pending stage suggestions."""
    try:
        suggestions = StageSuggestion.get_pending(db)
        return jsonify(suggestions), 200
    except Exception as e:
        logger.error(f"Error fetching suggestions: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/stage-suggestions/<int:suggestion_id>", methods=["PATCH"])
def update_stage_suggestion(suggestion_id):
    """Confirm or dismiss a stage suggestion."""
    try:
        data = request.json or {}
        validate_required_fields(data, ["action"])
        action = data.get("action")

        if action not in ["confirm", "dismiss"]:
            raise ValueError("action must be 'confirm' or 'dismiss'")

        if action == "confirm":
            app_id = data.get("app_id")
            if not app_id:
                return jsonify({"error": "app_id required for confirmation"}), 400
            StageSuggestion.confirm(db, suggestion_id, app_id)
            return jsonify({"message": "Suggestion confirmed"}), 200
        elif action == "dismiss":
            StageSuggestion.dismiss(db, suggestion_id)
            return jsonify({"message": "Suggestion dismissed"}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error(f"Error updating suggestion: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/emails/unlinked", methods=["GET"])
def get_unlinked_emails():
    """Get all unlinked emails."""
    try:
        emails = Email.get_unlinked(db)
        return jsonify(emails), 200
    except Exception as e:
        logger.error(f"Error fetching unlinked emails: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/emails/non-job-related", methods=["GET"])
def get_non_job_related_emails():
    """Get all emails marked as non-job-related."""
    try:
        cursor = db.execute("""
            SELECT * FROM emails
            WHERE gemini_classification LIKE '%unrelated%'
            AND application_id IS NULL
            AND (trashed IS NULL OR trashed = 0)
            ORDER BY date_received DESC
        """)
        emails = [dict(row) for row in cursor.fetchall()]
        return jsonify(emails), 200
    except Exception as e:
        logger.error(f"Error fetching non-job-related emails: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/emails/job-leads", methods=["GET"])
def get_job_leads():
    """Get all emails marked as job leads (recommendations)."""
    try:
        cursor = db.execute("""
            SELECT * FROM emails
            WHERE gemini_classification LIKE '%job_lead%'
            AND application_id IS NULL
            ORDER BY date_received DESC
        """)
        emails = [dict(row) for row in cursor.fetchall()]
        return jsonify(emails), 200
    except Exception as e:
        logger.error(f"Error fetching job leads: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/emails/<int:email_id>/link", methods=["PATCH"])
def link_email(email_id):
    """Manually link an email to an application."""
    try:
        data = request.json or {}
        validate_required_fields(data, ["app_id"])

        app_id = data.get("app_id")
        if not isinstance(app_id, int) or app_id <= 0:
            raise ValueError("app_id must be a positive integer")

        Email.link_to_application(db, email_id, app_id)
        return jsonify({"message": "Email linked to application"}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error(f"Error linking email: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/emails/process-unlinked", methods=["POST"])
def process_unlinked_emails():
    """Process unlinked emails with Gemini classification and auto-linking."""
    try:
        data = request.json or {}
        limit = data.get("limit", None)

        # Validate limit if provided
        if limit is not None:
            if not isinstance(limit, int) or limit <= 0:
                raise ValueError("limit must be a positive integer")

        # Get unlinked emails
        unlinked = Email.get_unlinked(db)
        if limit:
            emails_to_process = unlinked[:limit]
        else:
            emails_to_process = unlinked

        if not emails_to_process:
            return jsonify({
                "message": "No unlinked emails to process",
                "processed": 0,
                "linked": 0,
                "non_job_related": 0,
            }), 200

        # Process each email
        processor = EmailProcessor(db)
        stats = {
            "processed": 0,
            "linked": 0,
            "leads": 0,
            "unrelated": 0,
            "errors": [],
        }

        for email in emails_to_process:
            try:
                email_id = email["id"]
                subject = email["subject"] or ""
                body_excerpt = email["body_excerpt"] or ""
                sender = email["sender"] or ""

                # Try deterministic rules first (handles ~70% of emails without API calls)
                classification = _classify_by_rules(subject, sender, body_excerpt)

                # If no rule matched, use Gemini classifier
                if classification is None:
                    classification = processor.classifier.classify_email(
                        subject,
                        body_excerpt,
                        sender
                    )
                    logger.debug(f"Email {email_id} classified by Gemini: {classification.get('category')}")
                else:
                    logger.debug(f"Email {email_id} classified by rules: {classification.get('category')}")

                # Store classification result
                db.execute(
                    "UPDATE emails SET gemini_classification = ? WHERE id = ?",
                    (json.dumps(classification), email_id)
                )
                db.commit()

                category = classification.get("category", "unrelated")

                # Handle unrelated emails
                if category == "unrelated":
                    logger.info(f"Email {email_id} marked as unrelated")
                    stats["unrelated"] += 1
                    stats["processed"] += 1
                    continue

                # Handle job leads (recommendations)
                if category == "job_lead":
                    logger.info(f"Email {email_id} marked as job lead")
                    stats["leads"] += 1
                    stats["processed"] += 1
                    continue

                # Handle application confirmations - create or link application
                if category == "application_confirmation":
                    confidence = classification.get("confidence", 0.0)
                    if confidence >= 0.7:  # Minimum confidence threshold
                        # Get all applications to attempt linking
                        applications = Application.get_all(db)
                        best_match = None
                        best_score = 0.7  # Require confidence >= 0.7

                        # Use application linker to find best match
                        for app in applications:
                            # Calculate semantic match score
                            score = processor.linker.semantic_match_email_to_application(
                                subject, body_excerpt, app["company_name"], app["job_title"]
                            )

                            if score > best_score:
                                best_score = score
                                best_match = app

                        # If we found a good match, link it
                        if best_match:
                            Email.link_to_application(db, email_id, best_match["id"])
                            stats["linked"] += 1
                            logger.info(f"Linked email {email_id} to app {best_match['id']} (score: {best_score:.2f})")
                        else:
                            # No matching app found - create a new application from the email
                            # Extract company and job title from classification
                            company_name = classification.get("company_extracted") or "Unknown Company"
                            job_title = classification.get("job_title_extracted") or "Unknown Position"

                            # Create new application
                            app_id = Application.create(
                                db,
                                company_name=company_name,
                                job_title=job_title,
                                date_submitted=datetime.now().strftime("%Y-%m-%d"),
                                job_url=""
                            )

                            # Link email to the new application
                            Email.link_to_application(db, email_id, app_id)
                            stats["linked"] += 1
                            logger.info(f"Created new app '{company_name}' and linked email {email_id} to app {app_id}")

                    stats["processed"] += 1
                    continue

                # Other job-related categories (interview, rejection, etc.) - just mark as processed
                stats["processed"] += 1
            except Exception as e:
                logger.error(f"Error processing email {email_id}: {e}")
                stats["errors"].append(str(e))

        return jsonify({
            "message": f"Processed {stats['processed']} emails",
            **stats
        }), 200

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error(f"Error processing unlinked emails: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/emails/reclassify", methods=["POST"])
def reclassify_emails():
    """Re-classify emails that were previously marked as unrelated or job_lead using updated rules.

    This allows recovery of emails that were misclassified before the rule updates.
    """
    try:
        data = request.json or {}
        limit = data.get("limit", 20)  # Default to 20 emails per request
        category_filter = data.get("category", "unrelated")  # Which category to reclassify

        # Get emails in the specified category
        if category_filter == "unrelated":
            emails_to_reclassify = db.execute(
                "SELECT * FROM emails WHERE application_id IS NULL AND gemini_classification LIKE '%unrelated%' LIMIT ?",
                (limit,)
            ).fetchall()
        elif category_filter == "job_lead":
            emails_to_reclassify = db.execute(
                "SELECT * FROM emails WHERE application_id IS NULL AND gemini_classification LIKE '%job_lead%' LIMIT ?",
                (limit,)
            ).fetchall()
        else:
            emails_to_reclassify = []

        # Convert to dicts
        emails_to_reclassify = [dict(row) for row in emails_to_reclassify]

        if not emails_to_reclassify:
            return jsonify({
                "message": f"No {category_filter} emails to reclassify",
                "reclassified": 0,
                "application_confirmations": 0,
                "moved_to_leads": 0,
                "still_unrelated": 0,
            }), 200

        processor = EmailProcessor(db)
        stats = {
            "reclassified": 0,
            "application_confirmations": 0,
            "moved_to_leads": 0,
            "still_unrelated": 0,
            "errors": [],
        }

        for email in emails_to_reclassify:
            try:
                email_id = email["id"]
                subject = email["subject"] or ""
                body_excerpt = email["body_excerpt"] or ""
                sender = email["sender"] or ""

                # Try deterministic rules first
                classification = _classify_by_rules(subject, sender, body_excerpt)

                # If no rule matched, use Gemini
                if classification is None:
                    classification = processor.classifier.classify_email(
                        subject,
                        body_excerpt,
                        sender
                    )

                # Update classification in DB
                db.execute(
                    "UPDATE emails SET gemini_classification = ? WHERE id = ?",
                    (json.dumps(classification), email_id)
                )
                db.commit()

                new_category = classification.get("category", "unrelated")

                # Track reclassification results
                if new_category == "application_confirmation":
                    stats["application_confirmations"] += 1
                    # Link or create application
                    applications = Application.get_all(db)
                    best_match = None
                    best_score = 0.7

                    for app in applications:
                        score = processor.linker.semantic_match_email_to_application(
                            subject, body_excerpt, app["company_name"], app["job_title"]
                        )
                        if score > best_score:
                            best_score = score
                            best_match = app

                    if best_match:
                        Email.link_to_application(db, email_id, best_match["id"])
                        logger.info(f"Reclassified email {email_id}: linked to app {best_match['id']}")
                    else:
                        # Create new application from extraction
                        company_name = classification.get("company_extracted") or "Unknown Company"
                        job_title = classification.get("job_title_extracted") or "Unknown Position"

                        app_id = Application.create(
                            db,
                            company_name=company_name,
                            job_title=job_title,
                            date_submitted=datetime.now().strftime("%Y-%m-%d"),
                            job_url=""
                        )

                        Email.link_to_application(db, email_id, app_id)
                        logger.info(f"Reclassified email {email_id}: created new app {app_id}")

                elif new_category == "job_lead":
                    stats["moved_to_leads"] += 1
                    logger.info(f"Reclassified email {email_id} as job_lead")

                else:
                    stats["still_unrelated"] += 1
                    logger.info(f"Email {email_id} still unrelated after reclassification")

                stats["reclassified"] += 1

            except Exception as e:
                logger.error(f"Error reclassifying email {email['id']}: {e}")
                stats["errors"].append(str(e))

        return jsonify({
            "message": f"Reclassified {stats['reclassified']} emails",
            **stats
        }), 200

    except Exception as e:
        logger.error(f"Error reclassifying emails: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/emails/<int:email_id>/correct", methods=["POST"])
def correct_email_classification(email_id):
    """Submit a user correction for a misclassified email."""
    try:
        data = request.json or {}
        corrected_category = data.get("corrected_category")
        reason_code = data.get("reason_code")

        # Validate inputs
        if not corrected_category or not reason_code:
            return jsonify({"error": "corrected_category and reason_code are required"}), 400

        # Validate corrected_category
        if corrected_category not in VALID_REASON_CODES:
            return jsonify({
                "error": f"corrected_category must be one of: {list(VALID_REASON_CODES.keys())}"
            }), 400

        # Validate reason_code for that category
        valid_codes = VALID_REASON_CODES[corrected_category]
        if reason_code not in valid_codes:
            return jsonify({
                "error": f"reason_code '{reason_code}' invalid for category '{corrected_category}'"
            }), 400

        reason_label = valid_codes[reason_code]

        # Fetch the email
        email = Email.get_by_id(db, email_id)
        if not email:
            return jsonify({"error": "Email not found"}), 404

        # Determine original_category from stored gemini_classification
        original_category = "unrelated"
        if email.get("gemini_classification"):
            try:
                gc = json.loads(email["gemini_classification"])
                original_category = gc.get("category", "unrelated")
            except (json.JSONDecodeError, TypeError):
                pass

        # Store feedback
        feedback_id = ClassificationFeedback.create(
            db,
            email_id=email_id,
            original_category=original_category,
            corrected_category=corrected_category,
            reason_code=reason_code,
            reason_label=reason_label,
        )

        # Update the email's gemini_classification immediately to reflect the correction
        updated_classification = {
            "category": corrected_category,
            "is_job_related": True,
            "confidence": 1.0,
            "corrected_by_user": True,
            "reason_code": reason_code,
        }
        db.execute(
            "UPDATE emails SET gemini_classification = ? WHERE id = ?",
            (json.dumps(updated_classification), email_id)
        )

        # If corrected to application_confirmation, trigger linking/creation
        if corrected_category == "application_confirmation":
            processor = EmailProcessor(db)
            subject = email["subject"] or ""
            body_excerpt = email["body_excerpt"] or ""
            applications = Application.get_all(db)
            best_match = None
            best_score = 0.7

            # Use Gemini semantic matching to find best application
            match_result = processor.classifier.semantic_match_email_to_applications(
                subject, body_excerpt, email["sender"] or "", applications
            )

            # If matches found, pick the highest confidence one
            if match_result.get("matched_app_ids"):
                matched_id = match_result["matched_app_ids"][0]
                for app in applications:
                    if app["id"] == matched_id:
                        best_match = app
                        best_score = match_result.get("match_confidence", 0.8)
                        break

            if best_match:
                Email.link_to_application(db, email_id, best_match["id"])
                linked_to = best_match["id"]
                app_created = False
                logger.info(f"Corrected email {email_id} linked to existing app {best_match['id']}")
            else:
                # Attempt extraction with Gemini before creating Unknown Company
                company_name = "Unknown Company"
                job_title = "Unknown Position"

                try:
                    extraction = processor.classifier.extract_application_info(
                        subject, body_excerpt, email["sender"] or ""
                    )
                    if extraction:
                        company_name = extraction.get("company_name") or company_name
                        job_title = extraction.get("job_title") or job_title
                except Exception as e:
                    logger.warning(f"Gemini extraction failed: {e}, using fallback")

                # Fallback: try to extract from sender domain if still unknown
                if company_name == "Unknown Company" and email["sender"]:
                    try:
                        # Extract domain from sender email
                        sender = email["sender"]
                        if "@" in sender:
                            domain_part = sender.split("@")[1].split(".")[0]
                            if domain_part and domain_part != "noreply":
                                # Humanize domain: replace hyphens with spaces and title case
                                # e.g., "vishay-precision-group" -> "Vishay Precision Group"
                                company_name = domain_part.replace("-", " ").title()
                    except Exception:
                        pass

                # Fallback: try to extract from subject line
                if job_title == "Unknown Position":
                    try:
                        # Look for job title patterns in subject
                        # Patterns: "Thanks for applying for X", "application for X", "position of X", etc.
                        match = re.search(
                            r'(?:Thanks for applying for|application for|position of|role of|applying to|for the position of)\s+([^,\n]+)',
                            subject,
                            re.IGNORECASE
                        )
                        if match:
                            extracted_title = match.group(1).strip()
                            # Clean up common suffixes
                            extracted_title = re.sub(r'\s*at\s+.*$', '', extracted_title, flags=re.IGNORECASE).strip()
                            if extracted_title and len(extracted_title) < 100:
                                job_title = extracted_title
                    except Exception:
                        pass

                new_app_id = Application.create(
                    db,
                    company_name=company_name,
                    job_title=job_title,
                    date_submitted=datetime.now().strftime("%Y-%m-%d"),
                    job_url=""
                )
                Email.link_to_application(db, email_id, new_app_id)
                linked_to = new_app_id
                app_created = True
                logger.info(f"Corrected email {email_id} linked to new app {new_app_id} ({company_name})")

            db.commit()
            return jsonify({
                "feedback_id": feedback_id,
                "email_id": email_id,
                "corrected_category": corrected_category,
                "linked_to_app_id": linked_to,
                "app_created": app_created,
                "message": "Correction saved and email linked to application",
            }), 200

        # If corrected to job_lead, no linking needed — just category update
        db.commit()
        logger.info(f"Corrected email {email_id} to job_lead")
        return jsonify({
            "feedback_id": feedback_id,
            "email_id": email_id,
            "corrected_category": corrected_category,
            "message": "Correction saved, email reclassified as job lead",
        }), 200

    except Exception as e:
        logger.error(f"Error correcting email classification: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/emails/<int:email_id>", methods=["DELETE"])
def trash_email(email_id):
    """Soft-delete (trash) an unrelated email and record as confirmed-unrelated training signal."""
    try:
        data = request.json or {}
        reason_code = data.get("reason_code", "CONFIRMED_SPAM")

        email = Email.get_by_id(db, email_id)
        if not email:
            return jsonify({"error": "Email not found"}), 404

        # Record as training feedback: confirmed unrelated
        reason_label = VALID_REASON_CODES["unrelated"].get(reason_code, "Confirmed unrelated by user")
        original_category = "unrelated"
        if email.get("gemini_classification"):
            try:
                gc = json.loads(email["gemini_classification"])
                original_category = gc.get("category", "unrelated")
            except Exception:
                pass

        ClassificationFeedback.create(
            db,
            email_id=email_id,
            original_category=original_category,
            corrected_category="unrelated",
            reason_code=reason_code,
            reason_label=reason_label,
        )

        # Soft-delete the email
        Email.soft_delete(db, email_id)

        return jsonify({"email_id": email_id, "message": "Email trashed and used as training signal"}), 200

    except Exception as e:
        logger.error(f"Error trashing email: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/classifier/stats", methods=["GET"])
def get_classifier_stats():
    """Return classifier accuracy and training data metrics for the gauge."""
    try:
        stats = ClassificationFeedback.get_stats(db)
        return jsonify(stats), 200
    except Exception as e:
        logger.error(f"Error fetching classifier stats: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/sync-logs", methods=["GET"])
def get_sync_logs():
    """Get recent sync logs."""
    try:
        limit = request.args.get("limit", 10, type=int)
        logs = SyncLog.get_recent(db, limit=limit)
        return jsonify(logs), 200
    except Exception as e:
        logger.error(f"Error fetching sync logs: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/run-email-sync", methods=["POST"])
def run_email_sync():
    """Manually trigger an email sync (runs asynchronously)."""
    try:
        running = SyncLog.get_running(db)
        if running:
            return jsonify({
                "message": "Email sync already running",
                "status": "running",
                "sync_log_id": running.get("id"),
            }), 409

        # Use module-level scheduler (reuse instance instead of creating new one per request)
        if not scheduler.running:
            scheduler.start()
        scheduler.add_job(sync_emails_job, id=f"manual_sync_{datetime.now().timestamp()}", replace_existing=True)

        return jsonify({"message": "Email sync started", "status": "running"}), 202
    except Exception as e:
        logger.error(f"Error running email sync: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/cancel-email-sync", methods=["POST"])
def cancel_email_sync():
    """Cancel a running email sync."""
    try:
        running = SyncLog.get_running(db)
        if not running or not current_sync.get("cancel_event"):
            return jsonify({"message": "No running sync to cancel", "status": "idle"}), 409

        current_sync["cancel_event"].set()
        return jsonify({"message": "Cancel requested", "status": "cancelling"}), 202
    except Exception as e:
        logger.error(f"Error cancelling email sync: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/auth/status", methods=["GET"])
def auth_status():
    """Check if Outlook is connected."""
    try:
        from auth import MSGraphAuth
        auth = MSGraphAuth()
        return jsonify({"authenticated": auth.is_authenticated()}), 200
    except Exception as e:
        return jsonify({"authenticated": False, "error": str(e)}), 200


@app.route("/api/claude/health", methods=["GET"])
def claude_health():
    """Check Claude API health with a lightweight classification call."""
    try:
        from claude_classifier import ClaudeClassifier
        classifier = ClaudeClassifier()
        result = classifier.classify_email(
            subject="Application received for Software Engineer",
            body="Thanks for applying to Acme Corp for the Software Engineer role.",
            sender="jobs@acme.example"
        )
        return jsonify({
            "ok": True,
            "model": "claude-3-5-sonnet-20241022",
            "result": result,
        }), 200
    except Exception as e:
        logger.error(f"Claude health check failed: {e}")
        return jsonify({
            "ok": False,
            "model": "claude-3-5-sonnet-20241022",
            "error": str(e),
        }), 200


@app.route("/api/settings/sync-schedule", methods=["GET"])
def get_sync_schedule():
    """Get the current email sync schedule."""
    try:
        from models import AppConfig
        schedule = AppConfig.get_sync_schedule(db)
        next_sync = AppConfig.get_next_sync_time(db)
        return jsonify({
            "schedule": schedule,
            "next_sync_time": next_sync,
            "available_schedules": AppConfig.SCHEDULE_OPTIONS,
        }), 200
    except Exception as e:
        logger.error(f"Error getting sync schedule: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/settings/sync-schedule", methods=["POST"])
def set_sync_schedule():
    """Update the email sync schedule."""
    try:
        from models import AppConfig
        data = request.json or {}
        validate_required_fields(data, ["schedule"])
        schedule = data.get("schedule")

        allowed_schedules = ["daily", "every_4_hours", "manual_only"]
        if schedule not in allowed_schedules:
            raise ValueError(f"schedule must be one of: {', '.join(allowed_schedules)}")

        AppConfig.set_sync_schedule(db, schedule)

        # Update APScheduler jobs based on new schedule
        update_scheduler_for_schedule(schedule)

        logger.info(f"Sync schedule updated to: {schedule}")
        return jsonify({
            "schedule": schedule,
            "message": f"Sync schedule updated to {schedule}"
        }), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error(f"Error setting sync schedule: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/settings/gemini-keys", methods=["GET"])
def get_claude_api_status():
    """Get Claude API status information (migration endpoint from Gemini)."""
    try:
        # Claude uses a single API key with no rotation needed
        # Return simplified status for compatibility with frontend
        status = {
            "current_key": 1,
            "total_keys": 1,
            "quota_exhausted": [],
            "keys_available": 1,
            "api": "claude",
            "model": "claude-3-5-sonnet-20241022",
            "rate_limit": "100k tokens/minute",
            "status": "operational" if Config.CLAUDE_API_KEY else "not configured"
        }

        return jsonify(status), 200
    except Exception as e:
        logger.error(f"Error getting Claude API status: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/settings/gemini-keys/reset", methods=["POST"])
def reset_claude_quota():
    """No-op endpoint for compatibility (Claude doesn't need quota resets)."""
    try:
        logger.info("Claude API quota reset requested (no-op - Claude doesn't need key rotation)")
        status = {
            "current_key": 1,
            "total_keys": 1,
            "quota_exhausted": [],
            "keys_available": 1,
            "api": "claude",
            "status": "operational",
            "message": "Claude API doesn't require quota resets - always available"
        }

        return jsonify(status), 200
    except Exception as e:
        logger.error(f"Error in Claude quota reset endpoint: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/applications/<int:app_id>/prep/research", methods=["POST"])
def research_company_prep(app_id):
    """Research a company for interview prep with optional website crawling."""
    try:
        # Fetch application
        app = Application.get_by_id(db, app_id)
        if not app:
            return jsonify({"error": "Application not found"}), 404

        # Get company_website from request body or application
        data = request.get_json() or {}
        company_website = data.get("company_website") or app.get("company_website")

        # Validate required fields: company_name, job_title (job_url no longer required)
        if not app.get("company_name") or not app.get("company_name").strip():
            return jsonify({"error": "Company name is required"}), 400
        if not app.get("job_title") or not app.get("job_title").strip():
            return jsonify({"error": "Job title is required"}), 400

        # Get or create interview prep
        prep = InterviewPrep.get_or_create(db, app_id)

        # Research company using Claude API
        try:
            processor = EmailProcessor(db)
            research_result = processor.classifier.research_company_with_website(
                company_name=app["company_name"],
                job_title=app["job_title"],
                job_url=app.get("job_url", ""),
                company_website=company_website
            )
        except Exception as e:
            logger.error(f"Research error: {e}")
            return jsonify({"error": str(e)}), 500

        if research_result is None:
            return jsonify({"error": "Research failed - Claude API error"}), 500

        # Only save research if it succeeded (has actual data, not error state)
        if research_result.get("data_source") != "error" and (research_result.get("company_overview") or len(research_result.get("key_products", [])) > 0):
            # Save successful research to prep
            update_fields = {
                "company_research": json.dumps(research_result),
                "web_crawled": research_result.get("web_crawled", False),
                "data_source": research_result.get("data_source", "claude_knowledge")
            }
            InterviewPrep.update(db, prep["id"], update_fields)
            logger.info(f"✅ Research data saved for {app['company_name']} via Claude API")
        else:
            # Research failed (API error, quota exceeded, etc.) - don't overwrite existing data
            logger.warning(f"⚠️  Research failed - not overwriting existing data. Reason: {research_result.get('data_source')}")
            # If there's already good data from a previous research, return it
            if prep.get("company_research"):
                logger.info(f"Returning existing research data for {app['company_name']}")
                # Fetch updated prep
                updated_prep = InterviewPrep.get_by_id(db, prep["id"])
                # Return existing data with error status so frontend knows research failed
                return jsonify(updated_prep), 200
            else:
                # No existing data and new research failed
                return jsonify({
                    "error": "Research failed - Claude API error",
                    "retry_after": "try again in a few minutes"
                }), 500

        # Fetch updated prep
        updated_prep = InterviewPrep.get_by_id(db, prep["id"])
        return jsonify(updated_prep), 200

    except Exception as e:
        logger.error(f"Error researching company: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/applications/<int:app_id>/prep/research-markdown", methods=["POST"])
def upload_research_markdown(app_id):
    """Accept uploaded markdown research from user."""
    try:
        # Fetch application
        app = Application.get_by_id(db, app_id)
        if not app:
            return jsonify({"error": "Application not found"}), 404

        # Get the parsed markdown research from request
        data = request.get_json() or {}
        company_research = data.get("company_research", {})

        # Validate that company_overview is present
        if not company_research.get("company_overview"):
            return jsonify({"error": "Research must include Company Overview section"}), 400

        # Get or create prep record
        prep = InterviewPrep.get_or_create(db, app_id)

        # Save research with markdown_upload source
        InterviewPrep.update(db, prep["id"], {
            "company_research": json.dumps(company_research),
            "data_source": "markdown_upload",
            "web_crawled": False
        })

        logger.info(f"✅ Markdown research uploaded for {app['company_name']}")

        # Fetch and return updated prep
        updated_prep = InterviewPrep.get_by_id(db, prep["id"])
        return jsonify(updated_prep), 200

    except Exception as e:
        logger.error(f"Error uploading research markdown: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/applications/<int:app_id>/prep/generate", methods=["POST"])
def generate_interview_questions(app_id):
    """Generate interview questions and prep materials."""
    try:
        # Fetch application
        app = Application.get_by_id(db, app_id)
        if not app:
            return jsonify({"error": "Application not found"}), 404

        # Get prep (must exist with research done)
        prep = InterviewPrep.get_by_application(db, app_id)
        if not prep or not prep.get("company_research"):
            return jsonify({"error": "Company research must be completed first"}), 400

        # Parse company research
        company_research = {}
        if prep.get("company_research"):
            try:
                company_research = json.loads(prep["company_research"])
            except (json.JSONDecodeError, TypeError):
                pass

        # Call Gemini to generate questions
        processor = EmailProcessor(db)
        questions = processor.classifier.generate_interview_prep(
            company_name=app["company_name"],
            job_title=app["job_title"],
            company_research=company_research
        )

        # Save to prep
        InterviewPrep.update(db, prep["id"], {
            "interview_questions": json.dumps(questions.get("interview_questions", [])),
            "questions_to_ask": json.dumps(questions.get("questions_to_ask", []))
        })

        # Fetch updated prep
        updated_prep = InterviewPrep.get_by_id(db, prep["id"])
        return jsonify(updated_prep), 200

    except Exception as e:
        logger.error(f"Error generating interview questions: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/applications/<int:app_id>/prep/quiz", methods=["POST"])
def submit_quiz_answer(app_id):
    """Submit a quiz answer and get scoring/feedback."""
    try:
        data = request.json or {}
        question = data.get("question")
        user_answer = data.get("user_answer")

        if not question or not user_answer:
            return jsonify({"error": "question and user_answer are required"}), 400

        # Fetch application
        app = Application.get_by_id(db, app_id)
        if not app:
            return jsonify({"error": "Application not found"}), 404

        # Get prep
        prep = InterviewPrep.get_by_application(db, app_id)
        if not prep:
            return jsonify({"error": "Interview prep not started"}), 400

        # Parse company research
        company_research = {}
        if prep.get("company_research"):
            try:
                company_research = json.loads(prep["company_research"])
            except (json.JSONDecodeError, TypeError):
                pass

        # Call Gemini to score answer
        processor = EmailProcessor(db)
        quiz_result = processor.classifier.run_quiz(
            company_name=app["company_name"],
            job_title=app["job_title"],
            question=question,
            user_answer=user_answer,
            company_research=company_research
        )

        # Append to quiz results
        quiz_results = []
        if prep.get("quiz_results"):
            try:
                quiz_results = json.loads(prep["quiz_results"])
            except (json.JSONDecodeError, TypeError):
                pass

        quiz_results.append({
            "question": question,
            "user_answer": user_answer,
            "score": quiz_result.get("score"),
            "feedback": quiz_result.get("feedback"),
            "suggested_answer": quiz_result.get("suggested_answer"),
            "answered_at": datetime.now().isoformat()
        })

        # Save updated quiz results
        InterviewPrep.update(db, prep["id"], {"quiz_results": json.dumps(quiz_results)})

        return jsonify(quiz_result), 200

    except Exception as e:
        logger.error(f"Error submitting quiz answer: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/applications/<int:app_id>/prep", methods=["GET"])
def get_application_prep(app_id):
    """Get interview prep for an application."""
    try:
        prep = InterviewPrep.get_by_application(db, app_id)
        if not prep:
            return jsonify({"error": "No prep found for this application"}), 404

        return jsonify(prep), 200

    except Exception as e:
        logger.error(f"Error fetching prep: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/applications/<int:app_id>/prep", methods=["DELETE"])
def delete_application_prep(app_id):
    """Delete interview prep for an application."""
    try:
        InterviewPrep.delete_by_application(db, app_id)
        return jsonify({"message": "Interview prep deleted"}), 200

    except Exception as e:
        logger.error(f"Error deleting prep: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/prep/history", methods=["GET"])
def get_prep_history():
    """Get all interview prep sessions with application info."""
    try:
        preps = InterviewPrep.get_all_with_applications(db)
        return jsonify(preps), 200

    except Exception as e:
        logger.error(f"Error fetching prep history: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/auth/initiate", methods=["POST"])
def auth_initiate():
    """Start the device code login flow."""
    try:
        from auth import MSGraphAuth
        auth = MSGraphAuth()
        flow_info = auth.initiate_device_flow()
        return jsonify(flow_info), 200
    except Exception as e:
        logger.error(f"Error initiating auth: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/auth/poll", methods=["POST"])
def auth_poll():
    """Poll for device code login completion."""
    try:
        from auth import MSGraphAuth
        auth = MSGraphAuth()
        result = auth.poll_device_flow()
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Error polling auth: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({"status": "ok"}), 200


# Error handlers
@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Not found"}), 404


@app.errorhandler(500)
def internal_error(e):
    logger.error(f"Internal server error: {e}")
    return jsonify({"error": "Internal server error"}), 500


def validate_required_fields(data, required_fields):
    """Validate that all required fields are present."""
    missing = [f for f in required_fields if f not in data]
    if missing:
        raise ValueError(f"Missing required fields: {', '.join(missing)}")
    return True


def validate_status(status):
    """Validate application status."""
    allowed = ["Submitted", "Phone Screening", "1st Round", "2nd Round", "3rd Round", "Archived"]
    if status not in allowed:
        raise ValueError(f"Invalid status. Must be one of: {', '.join(allowed)}")


def sanitize_text(text, max_length=255):
    """Sanitize and validate text input."""
    if not isinstance(text, str) or not text.strip():
        raise ValueError("Text field cannot be empty")
    text = text.strip()
    if len(text) > max_length:
        raise ValueError(f"Text exceeds maximum length of {max_length}")
    # Check for suspicious characters
    if not all(c.isprintable() or c.isspace() for c in text):
        raise ValueError("Text contains non-printable characters")
    return text


# App initialization
if __name__ == "__main__":
    try:
        # Initialize scheduler
        init_scheduler()

        # Check if we should sync on startup
        check_and_sync_on_startup()

        # Run Flask app with use_reloader=False to avoid double-scheduling
        app.run(
            host="localhost",
            port=Config.FLASK_PORT,
            debug=Config.FLASK_DEBUG,
            use_reloader=False,
        )
    finally:
        scheduler.shutdown()
        db.close()
