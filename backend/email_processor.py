"""
Email processor module stub.
Handles email fetching, classification, and application linking.
"""

import logging

logger = logging.getLogger(__name__)


def _decode_safelinks(text: str) -> str:
    """Replace Microsoft SafeLinks URLs with their original destination URLs."""
    from urllib.parse import urlparse, parse_qs, unquote

    def _replace(m):
        try:
            url = m.group(0)
            parsed = urlparse(url)
            params = parse_qs(parsed.query)
            original = params.get('url', [url])[0]
            return unquote(original)
        except Exception:
            return m.group(0)

    return re.sub(r'https?://[^\s]*safelinks\.protection\.outlook\.com[^\s]*', _replace, text)


def _clean_body(text: str) -> str:
    """Clean email body for classification: remove tracking junk and normalize whitespace.

    Removes:
    - Zero-width and invisible Unicode chars (U+200B-U+200F, U+2028-U+202E, U+034F, U+FEFF)
    - URLs and bracketed URL labels (tracking links add nothing for classification)
    - Excessive whitespace

    Args:
        text: Raw email body text

    Returns:
        Cleaned text suitable for Gemini classification
    """
    # Remove zero-width and invisible unicode chars
    text = re.sub(r'[\u200b-\u200f\u2028\u2029\u202a-\u202e\u034f\ufeff]', '', text)
    # Decode SafeLinks before stripping — preserve destination URL text
    text = _decode_safelinks(text)
    # Remove URLs (tracking links add nothing for classification)
    text = re.sub(r'https?://\S+', '', text)
    # Remove bracketed URL labels like [Indeed] or [https://...]
    text = re.sub(r'\[https?://[^\]]*\]', '', text)
    text = re.sub(r'\[[A-Z][a-z]+\]\s*', '', text)
    # Collapse whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text


class EmailProcessor:
    """Processes emails: fetch, classify, link to applications."""

    def __init__(self, db, cancel_event=None):
        """Initialize email processor."""
        self.db = db
        self.cancel_event = cancel_event
        # Note: ClaudeClassifier removed - using manual markdown upload workflow
        logger.info("📧 EmailProcessor initialized")

    def process_emails(self, days_back=7):
        """
        Process unlinked emails (stub).
        TODO: Implement full email fetch + classify + link logic
        """
        logger.warning("📧 Email processing not yet fully implemented")
        return {
            "processed": 0,
            "linked": 0,
            "non_job_related": 0,
        }
