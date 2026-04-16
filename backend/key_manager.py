"""
Gemini API Key Manager
Handles key rotation when quotas are exhausted.
"""

import logging
from datetime import datetime
from config import Config

logger = logging.getLogger(__name__)


class GeminiKeyManager:
    """Manages Gemini API key rotation when quotas are exhausted."""

    def __init__(self):
        self.keys = Config.GEMINI_API_KEYS
        self.current_index = 0
        self.quota_exhausted = {}  # Track which keys (1-indexed) hit quota
        self.key_usage_count = {}  # Track requests per key for monitoring

        logger.info(f"🔑 GeminiKeyManager initialized with {len(self.keys)} key(s)")
        for i in range(len(self.keys)):
            key_id = i + 1
            masked_key = self.keys[i][:20] + "..." if len(self.keys[i]) > 20 else self.keys[i]
            logger.info(f"   Key {key_id}: {masked_key}")
            self.key_usage_count[key_id] = 0

    def get_current_key(self):
        """Get the currently active API key."""
        return self.keys[self.current_index]

    def get_current_key_id(self):
        """Get identifier for current key (1-indexed)."""
        return self.current_index + 1

    def record_request(self):
        """Record that a request was made with the current key."""
        key_id = self.get_current_key_id()
        self.key_usage_count[key_id] = self.key_usage_count.get(key_id, 0) + 1

    def rotate_to_next_key(self):
        """Switch to the next available key (skip exhausted ones).

        Returns:
            bool: True if rotated to a new available key, False if all keys exhausted
        """
        original_index = self.current_index
        attempts = 0

        while attempts < len(self.keys):
            self.current_index = (self.current_index + 1) % len(self.keys)
            key_id = self.current_index + 1

            if key_id not in self.quota_exhausted:
                logger.info(f"🔑 Rotated to API key {key_id}/{len(self.keys)}")
                return True

            attempts += 1

        # All keys exhausted
        logger.error("❌ All Gemini API keys have exhausted their daily quota!")
        self.current_index = original_index
        return False

    def mark_quota_exhausted(self):
        """Mark current key as having exhausted quota."""
        key_id = self.current_index + 1
        self.quota_exhausted[key_id] = True
        logger.warning(f"⚠️  API Key {key_id} quota exhausted, marking for rotation")

    def reset_daily(self):
        """Reset quota tracking (call at start of each day).

        This should be called when daily quota limits reset (UTC midnight).
        """
        old_count = len(self.quota_exhausted)
        self.quota_exhausted = {}
        logger.info(f"🔑 Daily quota reset - {old_count} keys now available again")

    def get_status(self):
        """Get detailed status of all keys.

        Returns:
            dict: Status including current key, total keys, exhausted list, and available count
        """
        return {
            "current_key": self.current_index + 1,
            "total_keys": len(self.keys),
            "quota_exhausted": sorted(list(self.quota_exhausted.keys())),
            "keys_available": len(self.keys) - len(self.quota_exhausted),
            "timestamp": datetime.now().isoformat(),
            "usage_count": self.key_usage_count.copy(),
        }

    def is_quota_available(self):
        """Check if any keys still have quota available."""
        return len(self.quota_exhausted) < len(self.keys)


# Global instance
key_manager = GeminiKeyManager()
