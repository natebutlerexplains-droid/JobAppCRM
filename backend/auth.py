import json
import logging
import os
import webbrowser
from pathlib import Path
from datetime import datetime
import requests
from msal import PublicClientApplication

from config import Config

logger = logging.getLogger(__name__)


class MSGraphAuth:
    """Handles Microsoft Graph OAuth2 PKCE authentication for personal Outlook accounts."""

    def __init__(self):
        self.app = PublicClientApplication(
            client_id=Config.MS_GRAPH_CLIENT_ID,
            authority=Config.MS_GRAPH_AUTHORITY,
        )
        self.token_cache_path = Config.TOKEN_CACHE_PATH
        self._ensure_token_cache_dir()

    def _ensure_token_cache_dir(self):
        """Ensure the token cache directory exists."""
        cache_dir = os.path.dirname(self.token_cache_path)
        os.makedirs(cache_dir, exist_ok=True)

    def _load_cached_token(self) -> dict:
        """Load the cached refresh token."""
        if os.path.exists(self.token_cache_path):
            try:
                with open(self.token_cache_path, "r") as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Failed to load cached token: {e}")
        return {}

    def _save_token(self, token: dict):
        """Save the token to cache."""
        try:
            with open(self.token_cache_path, "w") as f:
                json.dump(token, f)
        except Exception as e:
            logger.error(f"Failed to save token: {e}")

    def get_access_token(self) -> str:
        """Get a valid access token, refreshing if necessary."""
        # Try to get token from cache first
        cached_token = self._load_cached_token()

        # Try to refresh using the refresh token
        if cached_token.get("refresh_token"):
            try:
                result = self.app.acquire_token_by_refresh_token(
                    refresh_token=cached_token["refresh_token"],
                    scopes=Config.MS_GRAPH_SCOPE,
                )
                if "access_token" in result:
                    self._save_token(result)
                    return result["access_token"]
                else:
                    logger.warning(f"Refresh token invalid: {result.get('error_description', 'Unknown error')}")
            except Exception as e:
                logger.error(f"Error refreshing token: {e}")

        # If refresh failed, need to authenticate interactively
        logger.info("No valid token found. Starting interactive authentication...")
        return self._interactive_login()

    def _interactive_login(self) -> str:
        """Start an interactive login flow."""
        # Start the device flow (since we can't do interactive auth in a headless environment)
        # For a desktop app, we use the authorization code flow with PKCE
        result = self.app.acquire_token_interactive(
            scopes=Config.MS_GRAPH_SCOPE,
        )

        if "access_token" in result:
            self._save_token(result)
            logger.info("Successfully authenticated with Microsoft Graph")
            return result["access_token"]
        else:
            error = result.get("error_description", "Unknown error")
            raise Exception(f"Authentication failed: {error}")

    def refresh_token_if_needed(self) -> bool:
        """Check and refresh token if it's about to expire."""
        try:
            token = self._load_cached_token()
            if not token:
                return False

            # Check if token expires in the next 5 minutes
            expires_on = token.get("expires_on", 0)
            if isinstance(expires_on, str):
                expires_on = int(expires_on)

            current_time = datetime.now().timestamp()
            if expires_on - current_time < 300:  # Less than 5 minutes
                # Try to refresh
                if token.get("refresh_token"):
                    result = self.app.acquire_token_by_refresh_token(
                        refresh_token=token["refresh_token"],
                        scopes=Config.MS_GRAPH_SCOPE,
                    )
                    if "access_token" in result:
                        self._save_token(result)
                        return True
                return False
            return True
        except Exception as e:
            logger.error(f"Error checking token expiry: {e}")
            return False


class MSGraphAPI:
    """Wrapper for Microsoft Graph API calls."""

    def __init__(self, access_token: str):
        self.access_token = access_token
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "Prefer": "outlook.body-content-type=text",  # Request plain text body
            "Content-Type": "application/json",
        }

    def get_emails(self, days_back: int = 30, max_results: int = None) -> list:
        """Fetch emails from the past N days from Inbox."""
        emails = []
        skip_token = None
        page_count = 0
        max_pages = None

        # Build the filter for the last N days
        from datetime import datetime, timedelta
        date_cutoff = (datetime.now() - timedelta(days=days_back)).isoformat()
        filter_query = f"receivedDateTime ge {date_cutoff}"

        while True:
            page_count += 1
            if max_pages and page_count > max_pages:
                break

            url = f"{Config.MS_GRAPH_API_ENDPOINT}/me/mailFolders/inbox/messages"
            params = {
                "$filter": filter_query,
                "$select": "id,subject,from,receivedDateTime,bodyPreview,body",
                "$orderby": "receivedDateTime desc",
                "$top": 50,  # Max 50 per page
            }

            if skip_token:
                params["$skiptoken"] = skip_token

            try:
                response = requests.get(url, headers=self.headers, params=params, timeout=30)

                # Handle rate limiting
                if response.status_code == 429:
                    retry_after = int(response.headers.get("Retry-After", 60))
                    logger.warning(f"Rate limited. Waiting {retry_after} seconds...")
                    # For now, we'll just log and continue. The sync process will handle retries.
                    return emails

                response.raise_for_status()
                data = response.json()

                # Extract emails
                for msg in data.get("value", []):
                    emails.append({
                        "id": msg.get("id"),
                        "subject": msg.get("subject"),
                        "from": msg.get("from", {}).get("emailAddress", {}).get("address"),
                        "receivedDateTime": msg.get("receivedDateTime"),
                        "body": msg.get("body", {}).get("content", ""),
                    })

                    if max_results and len(emails) >= max_results:
                        return emails

                # Check for next page
                skip_token = data.get("@odata.nextLink")
                if not skip_token:
                    break

            except requests.exceptions.RequestException as e:
                logger.error(f"Error fetching emails: {e}")
                raise

        return emails

    def get_mailbox_info(self) -> dict:
        """Get info about the authenticated user's mailbox."""
        url = f"{Config.MS_GRAPH_API_ENDPOINT}/me"
        try:
            response = requests.get(url, headers=self.headers, timeout=10)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error getting mailbox info: {e}")
            raise


def get_authenticated_api() -> MSGraphAPI:
    """Get an authenticated MS Graph API instance, handling token refresh."""
    auth = MSGraphAuth()
    try:
        access_token = auth.get_access_token()
        return MSGraphAPI(access_token)
    except Exception as e:
        logger.error(f"Failed to authenticate with Microsoft Graph: {e}")
        raise
