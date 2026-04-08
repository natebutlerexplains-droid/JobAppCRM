import logging
import os
import threading
import json
from datetime import datetime, timedelta
from flask import Flask, jsonify, request
from flask_cors import CORS
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from config import Config, logger
from models import Database, Application, Email, StageSuggestion, SyncLog
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
            "http://127.0.0.1:3000",
            "http://127.0.0.1:3001"
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
        stats = processor.process_emails(days_back=Config.EMAIL_SYNC_DAYS_BACK)
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
    """Update an application."""
    try:
        data = request.json or {}

        # Update status if provided
        if "status" in data and data["status"]:
            validate_status(data["status"])
            Application.update_status(db, app_id, data["status"])

        app = Application.get_by_id(db, app_id)
        if not app:
            return jsonify({"error": "Application not found"}), 404
        return jsonify(app), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error(f"Error updating application: {e}")
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
            WHERE gemini_classification LIKE '%"category": "unrelated"%'
            AND application_id IS NULL
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
            WHERE gemini_classification LIKE '%"category": "job_lead"%'
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

                # Classify email
                classification = processor.classifier.classify_email(
                    subject,
                    body_excerpt,
                    sender
                )

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


@app.route("/api/gemini/health", methods=["GET"])
def gemini_health():
    """Check Gemini API health with a lightweight classification call."""
    try:
        from gemini_classifier import GeminiClassifier
        classifier = GeminiClassifier()
        result = classifier.classify_email(
            subject="Application received for Software Engineer",
            body="Thanks for applying to Acme Corp for the Software Engineer role.",
            sender="jobs@acme.example"
        )
        return jsonify({
            "ok": True,
            "model": Config.GEMINI_MODEL,
            "result": result,
        }), 200
    except Exception as e:
        logger.error(f"Gemini health check failed: {e}")
        return jsonify({
            "ok": False,
            "model": Config.GEMINI_MODEL,
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
    allowed = ["Submitted", "More Info Required", "Interview Started", "Denied", "Offered"]
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
