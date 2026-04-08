import logging
import os
import threading
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
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001"],
        "methods": ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type"],
        "supports_credentials": True
    }
})

# Initialize database
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
def init_scheduler():
    """Initialize APScheduler jobs."""
    # Add the 2 AM daily cron job
    scheduler.add_job(
        sync_emails_job,
        trigger=CronTrigger(hour=Config.SYNC_SCHEDULE_HOUR, minute=Config.SYNC_SCHEDULE_MINUTE),
        id="daily_email_sync",
        name="Daily email sync at 2 AM",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("APScheduler initialized with daily 2 AM sync job")


# API Routes

@app.route("/api/applications", methods=["GET"])
def get_applications():
    """Get all applications."""
    try:
        apps = Application.get_all(db)
        return jsonify(apps), 200
    except Exception as e:
        logger.error(f"Error fetching applications: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/applications", methods=["POST"])
def create_application():
    """Create a new application."""
    try:
        data = request.json
        required = ["company_name", "job_title", "date_submitted"]
        if not all(k in data for k in required):
            return jsonify({"error": f"Missing required fields: {required}"}), 400

        app_id = Application.create(
            db,
            company_name=data["company_name"],
            job_title=data["job_title"],
            date_submitted=data["date_submitted"],
            company_domain=data.get("company_domain"),
            job_url=data.get("job_url"),
        )

        app = Application.get_by_id(db, app_id)
        return jsonify(app), 201
    except Exception as e:
        logger.error(f"Error creating application: {e}")
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
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400

        # Update status if provided
        if "status" in data:
            Application.update_status(db, app_id, data["status"])

        app = Application.get_by_id(db, app_id)
        if not app:
            return jsonify({"error": "Application not found"}), 404
        return jsonify(app), 200
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
        data = request.json
        required = ["type"]
        if not all(k in data for k in required):
            return jsonify({"error": f"Missing required fields: {required}"}), 400

        interaction_id = Interaction.create(
            db,
            app_id=app_id,
            type_=data["type"],
            content=data.get("content"),
            occurred_at=data.get("occurred_at"),
            suggested_stage_change=data.get("suggested_stage_change"),
        )

        return jsonify({"id": interaction_id, "message": "Interaction created"}), 201
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
        data = request.json
        action = data.get("action")

        if action == "confirm":
            app_id = data.get("app_id")
            if not app_id:
                return jsonify({"error": "app_id required for confirmation"}), 400
            StageSuggestion.confirm(db, suggestion_id, app_id)
            return jsonify({"message": "Suggestion confirmed"}), 200
        elif action == "dismiss":
            StageSuggestion.dismiss(db, suggestion_id)
            return jsonify({"message": "Suggestion dismissed"}), 200
        else:
            return jsonify({"error": "Invalid action"}), 400
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


@app.route("/api/emails/<int:email_id>/link", methods=["PATCH"])
def link_email(email_id):
    """Manually link an email to an application."""
    try:
        data = request.json
        app_id = data.get("app_id")
        if not app_id:
            return jsonify({"error": "app_id required"}), 400

        Email.link_to_application(db, email_id, app_id)
        return jsonify({"message": "Email linked to application"}), 200
    except Exception as e:
        logger.error(f"Error linking email: {e}")
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
