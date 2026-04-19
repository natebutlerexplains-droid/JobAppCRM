import pytest
import tempfile
from datetime import datetime, timedelta
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from models import Database, Application, Email, Interaction, StageSuggestion


@pytest.fixture
def temp_db():
    """Create an in-memory SQLite database for testing."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = f.name

    db = Database(db_path)
    yield db
    db.close()


@pytest.fixture
def sample_application(temp_db):
    """Create a sample application."""
    app_id = Application.create(
        temp_db,
        company_name="Google",
        job_title="Senior Software Engineer",
        date_submitted=datetime.now().date().isoformat(),
        company_domain="google.com",
        job_url="https://google.com/jobs/123",
    )
    return Application.get_by_id(temp_db, app_id)


@pytest.fixture
def sample_applications(temp_db):
    """Create multiple sample applications."""
    apps = []
    companies = [
        ("Google", "Senior Engineer", "google.com"),
        ("Amazon", "SDE II", "amazon.com"),
        ("Meta", "Software Engineer", "facebook.com"),
    ]

    for company, title, domain in companies:
        app_id = Application.create(
            temp_db,
            company_name=company,
            job_title=title,
            date_submitted=datetime.now().date().isoformat(),
            company_domain=domain,
        )
        apps.append(Application.get_by_id(temp_db, app_id))

    return apps


@pytest.fixture
def sample_email(temp_db, sample_application):
    """Create a sample email."""
    email_id = Email.create(
        temp_db,
        sender="recruiter@google.com",
        subject="We received your application",
        body_excerpt="Thank you for your application to Google",
        date_received=datetime.now().isoformat(),
        application_id=sample_application["id"],
    )
    return Email.get_by_id(temp_db, email_id)


@pytest.fixture
def sample_interaction(temp_db, sample_application):
    """Create a sample interaction."""
    interaction_id = Interaction.create(
        temp_db,
        app_id=sample_application["id"],
        type_="phone_call",
        content="Phone interview with hiring manager",
        occurred_at=(datetime.now() - timedelta(days=1)).isoformat(),
    )
    return interaction_id


@pytest.fixture
def sample_stage_suggestion(temp_db, sample_application):
    """Create a sample stage suggestion."""
    suggestion_id = StageSuggestion.create(
        temp_db,
        app_id=sample_application["id"],
        from_stage="Submitted",
        to_stage="Interview Started",
        reason="Interview request received",
        confidence=0.85,
    )
    return suggestion_id
