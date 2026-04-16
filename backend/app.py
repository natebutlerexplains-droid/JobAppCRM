import logging
from flask import Flask, jsonify, request
from flask_cors import CORS

from config import Config, logger
from models import Database, Application, Email, Interaction, StageSuggestion

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
            employment_type=data.get("employment_type"),
            pay_type=data.get("pay_type"),
            salary_min=data.get("salary_min"),
            salary_max=data.get("salary_max"),
            salary_negotiation_target=data.get("salary_negotiation_target"),
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

        Application.update(db, app_id, data)

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
        interactions = Interaction.get_by_application(db, app_id)
        return jsonify(interactions), 200
    except Exception as e:
        logger.error(f"Error fetching interactions: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/applications/<int:app_id>/interactions", methods=["POST"])
def create_interaction(app_id):
    """Create an interaction for an application."""
    try:
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


@app.route("/api/applications/<int:app_id>/prep/research", methods=["POST"])
def research_company_prep(app_id):
    """Research a company for interview prep using Gemini."""
    try:
        app = Application.get_by_id(db, app_id)
        if not app:
            return jsonify({"error": "Application not found"}), 404

        # Validate core trio
        if not app.get("company_name") or not app.get("company_name").strip():
            return jsonify({"error": "Company name is required"}), 400
        if not app.get("job_title") or not app.get("job_title").strip():
            return jsonify({"error": "Job title is required"}), 400
        if not app.get("job_url") or not app.get("job_url").strip():
            return jsonify({"error": "Job URL is required"}), 400

        # Mock research data (in production, would call Gemini)
        research = {
            "company_overview": f"Leading company in the tech industry - {app['company_name']}",
            "key_products": ["Product 1", "Product 2", "Product 3"],
            "company_culture": "Innovation-focused, collaborative environment",
            "recent_news": "Recently expanded to new markets",
            "growth_trajectory": "Strong growth in recent quarters"
        }

        return jsonify({
            "app_id": app_id,
            "company_research": research,
            "timestamp": "2026-04-15"
        }), 200

    except Exception as e:
        logger.error(f"Error researching company: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/applications/<int:app_id>/prep/questions", methods=["POST"])
def generate_interview_questions(app_id):
    """Generate interview questions for preparation."""
    try:
        app = Application.get_by_id(db, app_id)
        if not app:
            return jsonify({"error": "Application not found"}), 404

        # Mock question generation (in production, would call Gemini)
        questions = {
            "interview_questions": [
                {
                    "question": "Tell us about your background and experience with " + app.get("job_title", "this role"),
                    "category": "Background",
                    "difficulty": "Easy"
                },
                {
                    "question": f"What attracted you to {app.get('company_name', 'our company')}?",
                    "category": "Motivation",
                    "difficulty": "Easy"
                },
                {
                    "question": "Describe a challenging project you worked on and how you overcame obstacles",
                    "category": "Technical",
                    "difficulty": "Medium"
                },
                {
                    "question": f"How do you see yourself growing in this {app.get('job_title', 'role')}?",
                    "category": "Career",
                    "difficulty": "Medium"
                }
            ],
            "questions_to_ask": [
                "What does success look like in this role?",
                "How is performance measured?",
                "What are the main challenges facing this team?",
                "What opportunities for growth exist?"
            ]
        }

        return jsonify({
            "app_id": app_id,
            "prep_questions": questions,
            "timestamp": "2026-04-15"
        }), 200

    except Exception as e:
        logger.error(f"Error generating interview questions: {e}")
        return jsonify({"error": str(e)}), 500


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
        # Run Flask app
        app.run(
            host="localhost",
            port=Config.FLASK_PORT,
            debug=Config.FLASK_DEBUG,
            use_reloader=False,
        )
    finally:
        db.close()
