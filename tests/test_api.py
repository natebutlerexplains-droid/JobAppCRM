import pytest
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app import app as flask_app


@pytest.fixture
def client():
    """Create a test client for the Flask app."""
    flask_app.config['TESTING'] = True
    with flask_app.test_client() as client:
        yield client


class TestApplicationAPI:
    """Tests for application API endpoints."""

    def test_health_check(self, client):
        """Test health check endpoint."""
        response = client.get('/health')
        assert response.status_code == 200
        assert response.json['status'] == 'ok'

    def test_create_application(self, client):
        """Test creating an application."""
        data = {
            'company_name': 'Google',
            'job_title': 'Software Engineer',
            'date_submitted': '2025-03-15',
            'company_domain': 'google.com',
            'job_url': 'https://google.com/jobs/123'
        }
        response = client.post('/api/applications', json=data)
        assert response.status_code == 201
        assert response.json['company_name'] == 'Google'
        assert response.json['id'] > 0

    def test_create_application_missing_fields(self, client):
        """Test creating application with missing required fields."""
        data = {
            'company_name': 'Google',
            # Missing job_title and date_submitted
        }
        response = client.post('/api/applications', json=data)
        assert response.status_code == 400
        assert 'error' in response.json

    def test_get_applications(self, client):
        """Test getting all applications."""
        # Create a few applications
        client.post('/api/applications', json={
            'company_name': 'Google',
            'job_title': 'SWE',
            'date_submitted': '2025-03-15'
        })
        client.post('/api/applications', json={
            'company_name': 'Amazon',
            'job_title': 'SDE',
            'date_submitted': '2025-03-14'
        })

        response = client.get('/api/applications')
        assert response.status_code == 200
        assert len(response.json) >= 2

    def test_get_application(self, client):
        """Test getting a specific application."""
        # Create an application
        create_response = client.post('/api/applications', json={
            'company_name': 'Microsoft',
            'job_title': 'Engineer',
            'date_submitted': '2025-03-15'
        })
        app_id = create_response.json['id']

        # Get the application
        response = client.get(f'/api/applications/{app_id}')
        assert response.status_code == 200
        assert response.json['company_name'] == 'Microsoft'

    def test_get_nonexistent_application(self, client):
        """Test getting a non-existent application."""
        response = client.get('/api/applications/99999')
        assert response.status_code == 404

    def test_update_application_status(self, client):
        """Test updating application status."""
        # Create an application
        create_response = client.post('/api/applications', json={
            'company_name': 'Google',
            'job_title': 'SWE',
            'date_submitted': '2025-03-15'
        })
        app_id = create_response.json['id']

        # Update status
        response = client.patch(f'/api/applications/{app_id}', json={
            'status': 'Interview Started'
        })
        assert response.status_code == 200
        assert response.json['status'] == 'Interview Started'

    def test_delete_application(self, client):
        """Test deleting an application."""
        # Create an application
        create_response = client.post('/api/applications', json={
            'company_name': 'Google',
            'job_title': 'SWE',
            'date_submitted': '2025-03-15'
        })
        app_id = create_response.json['id']

        # Delete it
        response = client.delete(f'/api/applications/{app_id}')
        assert response.status_code == 200

        # Verify it's deleted
        get_response = client.get(f'/api/applications/{app_id}')
        assert get_response.status_code == 404


class TestStatsAPI:
    """Tests for stats API."""

    def test_get_stats(self, client):
        """Test getting application statistics."""
        # Create applications with different statuses
        client.post('/api/applications', json={
            'company_name': 'Google',
            'job_title': 'SWE',
            'date_submitted': '2025-03-15'
        })

        create_response = client.post('/api/applications', json={
            'company_name': 'Amazon',
            'job_title': 'SDE',
            'date_submitted': '2025-03-14'
        })
        app_id = create_response.json['id']

        # Update one to different status
        client.patch(f'/api/applications/{app_id}', json={
            'status': 'Interview Started'
        })

        # Get stats
        response = client.get('/api/stats')
        assert response.status_code == 200
        assert response.json['Submitted'] >= 1
        assert response.json['Interview Started'] >= 1


class TestStageSuggestionAPI:
    """Tests for stage suggestion API."""

    def test_get_stage_suggestions(self, client):
        """Test getting pending stage suggestions."""
        response = client.get('/api/stage-suggestions')
        assert response.status_code == 200
        assert isinstance(response.json, list)


class TestErrorHandling:
    """Tests for error handling."""

    def test_404_not_found(self, client):
        """Test 404 error handling."""
        response = client.get('/nonexistent-endpoint')
        assert response.status_code == 404
        assert 'error' in response.json

    def test_post_without_json(self, client):
        """Test POST without JSON data."""
        response = client.post('/api/applications')
        assert response.status_code in [400, 500]  # Either missing data or other error
