import pytest
from unittest.mock import Mock, patch

from application_linker import ApplicationLinker
from models import Application


class TestApplicationLinker:
    """Tests for ApplicationLinker model."""

    def test_extract_domain_from_email(self, temp_db):
        """Test extracting domain from email address."""
        classifier_mock = Mock()
        linker = ApplicationLinker(temp_db, classifier_mock)

        assert linker._extract_domain_from_email("test@google.com") == "google.com"
        assert linker._extract_domain_from_email("user@company.co.uk") == "company.co.uk"
        assert linker._extract_domain_from_email("invalid_email") == ""

    def test_extract_domain_from_url(self, temp_db):
        """Test extracting domain from URL."""
        classifier_mock = Mock()
        linker = ApplicationLinker(temp_db, classifier_mock)

        assert linker._extract_domain_from_url("https://google.com/jobs") == "google.com"
        assert linker._extract_domain_from_url("https://www.amazon.com") == "amazon.com"
        assert linker._extract_domain_from_url("invalid_url") == ""

    def test_domains_match(self, temp_db):
        """Test domain matching logic."""
        classifier_mock = Mock()
        linker = ApplicationLinker(temp_db, classifier_mock)

        # Exact match
        assert linker._domains_match("google.com", "google.com")

        # No match
        assert not linker._domains_match("google.com", "amazon.com")

        # Subdomain match
        assert linker._domains_match("mail.google.com", "google.com")

        # Empty domains
        assert not linker._domains_match("", "google.com")
        assert not linker._domains_match("google.com", "")

    def test_domain_match_confidence(self, temp_db, sample_application):
        """Test domain matching confidence scoring."""
        classifier_mock = Mock()
        linker = ApplicationLinker(temp_db, classifier_mock)

        # Update application with domain
        Application.update_status(temp_db, sample_application["id"], "Submitted")

        # Email from matching domain
        confidence = linker._domain_match("recruiter@google.com", sample_application)
        assert confidence == 0.9

        # Email from non-matching domain
        confidence = linker._domain_match("recruiter@microsoft.com", sample_application)
        assert confidence == 0.0

    def test_keyword_match(self, temp_db, sample_application):
        """Test keyword matching."""
        classifier_mock = Mock()
        linker = ApplicationLinker(temp_db, classifier_mock)

        # Company name in subject
        confidence = linker._keyword_match(
            "Interview with Google",
            "Thanks for your application",
            sample_application
        )
        assert confidence >= 0.6

        # Company name in body
        confidence = linker._keyword_match(
            "Interview Request",
            "Google has scheduled your interview",
            sample_application
        )
        assert confidence >= 0.6

        # No match
        confidence = linker._keyword_match(
            "Spam",
            "Buy our product",
            sample_application
        )
        assert confidence == 0.0

    def test_link_email_domain_match(self, temp_db, sample_application):
        """Test linking email via domain match."""
        classifier_mock = Mock()
        linker = ApplicationLinker(temp_db, classifier_mock)

        # Email from matching domain should link with high confidence
        result = linker.link_email(
            subject="Interview Request",
            body="We'd like to schedule an interview",
            sender="recruiter@google.com"
        )

        assert result is not None
        assert result["app_id"] == sample_application["id"]
        assert result["confidence"] == 0.9
        assert result["method"] == "domain"

    def test_link_email_no_match(self, temp_db, sample_application):
        """Test that low-confidence emails are not linked."""
        classifier_mock = Mock()
        classifier_mock.semantic_match_email_to_applications.return_value = {
            "matched_app_ids": [],
            "match_confidence": 0.3
        }
        linker = ApplicationLinker(temp_db, classifier_mock)

        # Email with no clear match
        result = linker.link_email(
            subject="Random Subject",
            body="Random content",
            sender="unknown@example.com"
        )

        assert result is None

    def test_link_email_ambiguous_match(self, temp_db, sample_applications):
        """Test handling of ambiguous matches (multiple apps with same confidence)."""
        classifier_mock = Mock()

        # Mock semantic matching to return multiple matches
        classifier_mock.semantic_match_email_to_applications.return_value = {
            "matched_app_ids": [sample_applications[0]["id"], sample_applications[1]["id"]],
            "match_confidence": 0.8
        }

        linker = ApplicationLinker(temp_db, classifier_mock)

        # Email that matches multiple applications
        result = linker.link_email(
            subject="Interview",
            body="We'd like to schedule",
            sender="unknown@example.com"
        )

        # Should return None (for manual review) when ambiguous
        assert result is None

    def test_get_matching_applications(self, temp_db, sample_applications):
        """Test retrieving matching applications."""
        classifier_mock = Mock()
        linker = ApplicationLinker(temp_db, classifier_mock)

        apps = linker.get_matching_applications(
            subject="Test",
            body="Test",
            sender="test@example.com"
        )

        assert len(apps) == 3
        assert all(app["company_name"] in ["Google", "Amazon", "Meta"] for app in apps)
