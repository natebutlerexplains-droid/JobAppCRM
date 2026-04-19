import pytest
from datetime import datetime

from models import Application, Email, Interaction, StageSuggestion


class TestApplication:
    """Tests for Application model."""

    def test_create_application(self, temp_db):
        """Test creating an application."""
        app_id = Application.create(
            temp_db,
            company_name="Google",
            job_title="Senior Engineer",
            date_submitted="2025-03-15",
        )
        assert app_id > 0

        app = Application.get_by_id(temp_db, app_id)
        assert app["company_name"] == "Google"
        assert app["job_title"] == "Senior Engineer"
        assert app["status"] == "Submitted"

    def test_get_all_applications(self, temp_db, sample_applications):
        """Test getting all applications."""
        apps = Application.get_all(temp_db)
        assert len(apps) == 3
        assert all(app["company_name"] in ["Google", "Amazon", "Meta"] for app in apps)

    def test_update_status(self, temp_db, sample_application):
        """Test updating application status."""
        app_id = sample_application["id"]
        Application.update_status(temp_db, app_id, "Interview Started")

        app = Application.get_by_id(temp_db, app_id)
        assert app["status"] == "Interview Started"

    def test_delete_application(self, temp_db, sample_application):
        """Test deleting an application."""
        app_id = sample_application["id"]
        Application.delete(temp_db, app_id)

        app = Application.get_by_id(temp_db, app_id)
        assert app is None

    def test_get_stats(self, temp_db):
        """Test getting application statistics."""
        # Create applications with different statuses
        Application.create(temp_db, "Company A", "Role A", "2025-03-15")
        app_id = Application.create(temp_db, "Company B", "Role B", "2025-03-14")
        Application.update_status(temp_db, app_id, "Interview Started")

        stats = Application.get_stats(temp_db)
        assert stats["Submitted"] == 1
        assert stats["Interview Started"] == 1
        assert stats["More Info Required"] == 0

    def test_invalid_status(self, temp_db, sample_application):
        """Test that invalid status is rejected."""
        with pytest.raises(Exception):
            Application.update_status(temp_db, sample_application["id"], "Invalid Status")


class TestEmail:
    """Tests for Email model."""

    def test_create_email(self, temp_db, sample_application):
        """Test creating an email."""
        email_id = Email.create(
            temp_db,
            sender="recruiter@company.com",
            subject="Interview Request",
            body_excerpt="We'd like to schedule an interview",
            date_received="2025-03-15T10:00:00",
            application_id=sample_application["id"],
        )
        assert email_id > 0

    def test_get_by_id(self, temp_db, sample_email):
        """Test getting an email by ID."""
        email = Email.get_by_id(temp_db, sample_email["id"])
        assert email is not None
        assert email["sender"] == "recruiter@google.com"

    def test_link_email(self, temp_db, sample_application):
        """Test linking an email to an application."""
        email_id = Email.create(
            temp_db,
            sender="recruiter@company.com",
            subject="Interview",
            date_received="2025-03-15T10:00:00",
        )

        Email.link_to_application(temp_db, email_id, sample_application["id"])

        # Check that email is linked
        email = Email.get_by_id(temp_db, email_id)
        assert email["application_id"] == sample_application["id"]


class TestInteraction:
    """Tests for Interaction model."""

    def test_create_interaction(self, temp_db, sample_application):
        """Test creating an interaction."""
        interaction_id = Interaction.create(
            temp_db,
            app_id=sample_application["id"],
            type_="phone_call",
            content="Discussed role responsibilities",
            occurred_at="2025-03-15T14:00:00",
        )
        assert interaction_id > 0

    def test_get_interactions_by_application(self, temp_db, sample_application):
        """Test getting interactions for an application."""
        app_id = sample_application["id"]

        # Create multiple interactions
        Interaction.create(temp_db, app_id, "phone_call", "Phone interview")
        Interaction.create(temp_db, app_id, "manual_note", "Good fit for team")

        interactions = Interaction.get_by_application(temp_db, app_id)
        assert len(interactions) == 2


class TestStageSuggestion:
    """Tests for StageSuggestion model."""

    def test_create_suggestion(self, temp_db, sample_application):
        """Test creating a stage suggestion."""
        suggestion_id = StageSuggestion.create(
            temp_db,
            app_id=sample_application["id"],
            from_stage="Submitted",
            to_stage="Interview Started",
            reason="Interview request received",
            confidence=0.85,
        )
        assert suggestion_id > 0

    def test_get_pending_suggestions(self, temp_db, sample_application):
        """Test getting pending suggestions."""
        # Create a suggestion
        StageSuggestion.create(
            temp_db,
            app_id=sample_application["id"],
            from_stage="Submitted",
            to_stage="Interview Started",
            reason="Test",
            confidence=0.8,
        )

        pending = StageSuggestion.get_pending(temp_db)
        assert len(pending) == 1
        assert pending[0]["status"] == "pending"

    def test_confirm_suggestion(self, temp_db, sample_application):
        """Test confirming a stage suggestion."""
        app_id = sample_application["id"]
        suggestion_id = StageSuggestion.create(
            temp_db,
            app_id=app_id,
            from_stage="Submitted",
            to_stage="Interview Started",
            reason="Test",
            confidence=0.8,
        )

        StageSuggestion.confirm(temp_db, suggestion_id, app_id)

        # Check that application status was updated
        app = Application.get_by_id(temp_db, app_id)
        assert app["status"] == "Interview Started"

        # Check that suggestion status is confirmed
        pending = StageSuggestion.get_pending(temp_db)
        assert len(pending) == 0

    def test_dismiss_suggestion(self, temp_db, sample_application):
        """Test dismissing a stage suggestion."""
        app_id = sample_application["id"]
        suggestion_id = StageSuggestion.create(
            temp_db,
            app_id=app_id,
            from_stage="Submitted",
            to_stage="Interview Started",
            reason="Test",
            confidence=0.8,
        )

        StageSuggestion.dismiss(temp_db, suggestion_id)

        # Check that suggestion is dismissed
        pending = StageSuggestion.get_pending(temp_db)
        assert len(pending) == 0
