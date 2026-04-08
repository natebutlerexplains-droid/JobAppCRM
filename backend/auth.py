import json
import logging
import os
from datetime import datetime
import requests
from msal import PublicClientApplication

from config import Config

logger = logging.getLogger(__name__)

# Global device flow state (used between initiate and poll endpoints)
_pending_device_flow = None


class MSGraphAuth:
    """Handles Microsoft Graph OAuth2 device code authentication."""

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
        """Load the cached token."""
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

    def is_authenticated(self) -> bool:
        """Check if we have a valid cached token."""
        token = self._load_cached_token()
        if not token:
            return False
        expires_on = token.get("expires_on", 0)
        if isinstance(expires_on, str):
            expires_on = int(expires_on)
        # Token still valid (or has refresh token)
        return token.get("refresh_token") is not None or expires_on > datetime.now().timestamp()

    def get_access_token(self) -> str:
        """Get a valid access token, refreshing if necessary."""
        cached_token = self._load_cached_token()

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

        raise Exception("Not authenticated. Please connect your Outlook account first via the Settings page.")

    def initiate_device_flow(self) -> dict:
        """Start the device code flow. Returns the flow info to show the user."""
        global _pending_device_flow
        flow = self.app.initiate_device_flow(scopes=Config.MS_GRAPH_SCOPE)
        if "user_code" not in flow:
            raise Exception(f"Failed to initiate device flow: {flow.get('error_description', 'Unknown error')}")
        _pending_device_flow = flow
        logger.info(f"Device flow initiated. Code: {flow['user_code']}, URL: {flow['verification_uri']}")
        return {
            "user_code": flow["user_code"],
            "verification_uri": flow["verification_uri"],
            "message": flow.get("message", f"Go to {flow['verification_uri']} and enter code {flow['user_code']}"),
            "expires_in": flow.get("expires_in", 900),
        }

    def poll_device_flow(self) -> dict:
        """Poll for device flow completion. Returns status."""
        global _pending_device_flow
        if not _pending_device_flow:
            return {"status": "no_flow", "message": "No active device flow. Please initiate login first."}

        result = self.app.acquire_token_by_device_flow(_pending_device_flow)

        if "access_token" in result:
            self._save_token(result)
            _pending_device_flow = None
            logger.info("Device flow authentication successful")
            return {"status": "success", "message": "Successfully authenticated with Microsoft"}
        elif result.get("error") == "authorization_pending":
            return {"status": "pending", "message": "Waiting for you to complete login in the browser..."}
        else:
            _pending_device_flow = None
            error = result.get("error_description", result.get("error", "Unknown error"))
            return {"status": "error", "message": f"Authentication failed: {error}"}


class MSGraphAPI:
    """Wrapper for Microsoft Graph API calls."""

    def __init__(self, access_token: str):
        self.access_token = access_token
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "Prefer": "outlook.body-content-type=text",
            "Content-Type": "application/json",
        }

    def get_emails(self, days_back: int = 30, max_results: int = None) -> list:
        """Fetch emails from the past N days from Inbox."""
        emails = []

        from datetime import datetime, timedelta
        date_cutoff = (datetime.utcnow() - timedelta(days=days_back)).strftime("%Y-%m-%dT%H:%M:%SZ")

        # Build initial URL with params
        url = f"{Config.MS_GRAPH_API_ENDPOINT}/me/mailFolders/inbox/messages"
        params = {
            "$filter": f"receivedDateTime ge {date_cutoff}",
            "$select": "id,subject,from,receivedDateTime,bodyPreview,body",
            "$orderby": "receivedDateTime desc",
            "$top": 50,
        }

        while url:
            try:
                if params:
                    response = requests.get(url, headers=self.headers, params=params, timeout=30)
                    params = None  # Only pass params on first request; nextLink has them baked in
                else:
                    response = requests.get(url, headers=self.headers, timeout=30)

                if response.status_code == 429:
                    retry_after = int(response.headers.get("Retry-After", 60))
                    logger.warning(f"Rate limited. Waiting {retry_after} seconds...")
                    return emails

                response.raise_for_status()
                data = response.json()

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

                # nextLink is a full URL — use it directly for the next page
                url = data.get("@odata.nextLink")

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
    """Get an authenticated MS Graph API instance."""
    auth = MSGraphAuth()
    try:
        access_token = auth.get_access_token()
        return MSGraphAPI(access_token)
    except Exception as e:
        logger.error(f"Failed to authenticate with Microsoft Graph: {e}")
        raise
