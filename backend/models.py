import sqlite3
import json
from datetime import datetime
from typing import Optional, List, Dict, Any
import os

class Database:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.connection = None
        self._ensure_db_dir()
        self.init_connection()

    def _ensure_db_dir(self):
        """Ensure the database directory exists."""
        db_dir = os.path.dirname(self.db_path) or "."
        os.makedirs(db_dir, exist_ok=True)

    def init_connection(self):
        """Initialize database connection with WAL mode."""
        self.connection = sqlite3.connect(self.db_path, check_same_thread=False)
        self.connection.row_factory = sqlite3.Row
        # Enable WAL mode for concurrent access
        self.connection.execute("PRAGMA journal_mode=WAL")
        self.connection.execute("PRAGMA synchronous=NORMAL")
        self.create_tables()
        self._migrate_sync_logs_status()

    def create_tables(self):
        """Create all database tables."""
        cursor = self.connection.cursor()

        # APPLICATIONS table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_name TEXT NOT NULL,
            company_domain TEXT,
            job_title TEXT NOT NULL,
            job_url TEXT,
            date_submitted DATE NOT NULL,
            status TEXT NOT NULL DEFAULT 'Submitted'
                CHECK(status IN ('Submitted', 'More Info Required', 'Interview Started', 'Denied', 'Offered')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)

        # EMAILS table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS emails (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            application_id INTEGER,
            ms_message_id TEXT UNIQUE NOT NULL,
            sender TEXT NOT NULL,
            subject TEXT NOT NULL,
            body_excerpt TEXT,
            date_received TIMESTAMP NOT NULL,
            email_type TEXT DEFAULT 'other'
                CHECK(email_type IN ('application_confirmation', 'interview_request', 'rejection', 'more_info_needed', 'other', 'unclassified')),
            gemini_classification TEXT,
            linked_confidence REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
        )
        """)

        # INTERACTIONS table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS interactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            application_id INTEGER NOT NULL,
            type TEXT NOT NULL
                CHECK(type IN ('email_received', 'phone_call', 'text_message', 'manual_note')),
            content TEXT,
            occurred_at TIMESTAMP NOT NULL,
            logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            suggested_stage_change TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
        )
        """)

        # STAGE_SUGGESTIONS table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS stage_suggestions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            application_id INTEGER NOT NULL,
            from_stage TEXT NOT NULL,
            to_stage TEXT NOT NULL,
            reason TEXT,
            confidence REAL NOT NULL,
            status TEXT DEFAULT 'pending'
                CHECK(status IN ('pending', 'confirmed', 'dismissed')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
        )
        """)

        # PROCESSED_EMAILS table (dedup tracking)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS processed_emails (
            ms_message_id TEXT PRIMARY KEY
        )
        """)

        # SYNC_LOGS table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS sync_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            started_at TIMESTAMP NOT NULL,
            finished_at TIMESTAMP,
            emails_fetched INTEGER DEFAULT 0,
            emails_processed INTEGER DEFAULT 0,
            apps_created INTEGER DEFAULT 0,
            errors TEXT,
            status TEXT DEFAULT 'running'
                CHECK(status IN ('running', 'completed', 'failed', 'cancelled')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)

        # CONFIG table (key-value store for app settings)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS config (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)

        self.connection.commit()

    def _sync_logs_allows_cancelled(self) -> bool:
        cursor = self.connection.execute(
            "SELECT sql FROM sqlite_master WHERE type='table' AND name='sync_logs'"
        )
        row = cursor.fetchone()
        if not row or not row["sql"]:
            return True
        return "cancelled" in row["sql"]

    def _migrate_sync_logs_status(self):
        if self._sync_logs_allows_cancelled():
            return
        try:
            self.connection.execute("BEGIN")
            self.connection.execute("""
            CREATE TABLE sync_logs_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                started_at TIMESTAMP NOT NULL,
                finished_at TIMESTAMP,
                emails_fetched INTEGER DEFAULT 0,
                emails_processed INTEGER DEFAULT 0,
                apps_created INTEGER DEFAULT 0,
                errors TEXT,
                status TEXT DEFAULT 'running'
                    CHECK(status IN ('running', 'completed', 'failed', 'cancelled')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """)
            self.connection.execute("""
            INSERT INTO sync_logs_new (
                id, started_at, finished_at, emails_fetched, emails_processed,
                apps_created, errors, status, created_at
            )
            SELECT
                id, started_at, finished_at, emails_fetched, emails_processed,
                apps_created, errors, status, created_at
            FROM sync_logs
            """)
            self.connection.execute("DROP TABLE sync_logs")
            self.connection.execute("ALTER TABLE sync_logs_new RENAME TO sync_logs")
            self.connection.execute("COMMIT")
        except Exception:
            self.connection.execute("ROLLBACK")
            raise

        self.connection.commit()

    def execute(self, query: str, params: tuple = ()):
        """Execute a query and return the cursor."""
        cursor = self.connection.cursor()
        cursor.execute(query, params)
        return cursor

    def commit(self):
        """Commit the transaction."""
        self.connection.commit()

    def close(self):
        """Close the database connection."""
        if self.connection:
            self.connection.close()


# CRUD Operations

class Application:
    @staticmethod
    def create(db: Database, company_name: str, job_title: str, date_submitted: str,
               company_domain: Optional[str] = None, job_url: Optional[str] = None) -> int:
        """Create a new application."""
        cursor = db.execute(
            """INSERT INTO applications (company_name, company_domain, job_title, job_url, date_submitted)
               VALUES (?, ?, ?, ?, ?)""",
            (company_name, company_domain, job_title, job_url, date_submitted)
        )
        db.commit()
        return cursor.lastrowid

    @staticmethod
    def get_by_id(db: Database, app_id: int) -> Optional[Dict[str, Any]]:
        """Get an application by ID."""
        cursor = db.execute("SELECT * FROM applications WHERE id = ?", (app_id,))
        row = cursor.fetchone()
        return dict(row) if row else None

    @staticmethod
    def get_all(db: Database) -> List[Dict[str, Any]]:
        """Get all applications."""
        cursor = db.execute("SELECT * FROM applications ORDER BY date_submitted DESC")
        return [dict(row) for row in cursor.fetchall()]

    @staticmethod
    def update_status(db: Database, app_id: int, status: str):
        """Update application status."""
        db.execute(
            "UPDATE applications SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (status, app_id)
        )
        db.commit()

    @staticmethod
    def delete(db: Database, app_id: int):
        """Delete an application."""
        db.execute("DELETE FROM applications WHERE id = ?", (app_id,))
        db.commit()

    @staticmethod
    def get_stats(db: Database) -> Dict[str, int]:
        """Get count of applications per status."""
        cursor = db.execute("""
            SELECT status, COUNT(*) as count
            FROM applications
            GROUP BY status
        """)
        result = {"Submitted": 0, "More Info Required": 0, "Interview Started": 0, "Denied": 0, "Offered": 0}
        for row in cursor.fetchall():
            result[row["status"]] = row["count"]
        return result


class Email:
    @staticmethod
    def create(db: Database, ms_message_id: str, sender: str, subject: str,
               body_excerpt: Optional[str] = None, date_received: Optional[str] = None,
               email_type: str = "other", gemini_classification: Optional[Dict] = None,
               application_id: Optional[int] = None, linked_confidence: Optional[float] = None) -> int:
        """Create a new email record."""
        classification_json = json.dumps(gemini_classification) if gemini_classification else None
        cursor = db.execute(
            """INSERT INTO emails (ms_message_id, sender, subject, body_excerpt, date_received, email_type,
                                   gemini_classification, application_id, linked_confidence)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (ms_message_id, sender, subject, body_excerpt, date_received or datetime.now().isoformat(),
             email_type, classification_json, application_id, linked_confidence)
        )
        db.commit()
        return cursor.lastrowid

    @staticmethod
    def get_by_id(db: Database, email_id: int) -> Optional[Dict[str, Any]]:
        """Get an email by ID."""
        cursor = db.execute("SELECT * FROM emails WHERE id = ?", (email_id,))
        row = cursor.fetchone()
        return dict(row) if row else None

    @staticmethod
    def get_unlinked(db: Database) -> List[Dict[str, Any]]:
        """Get all unlinked emails (application_id IS NULL)."""
        cursor = db.execute(
            "SELECT * FROM emails WHERE application_id IS NULL ORDER BY date_received DESC"
        )
        return [dict(row) for row in cursor.fetchall()]

    @staticmethod
    def get_by_application(db: Database, app_id: int) -> List[Dict[str, Any]]:
        """Get all emails for an application."""
        cursor = db.execute(
            "SELECT * FROM emails WHERE application_id = ? ORDER BY date_received DESC",
            (app_id,)
        )
        return [dict(row) for row in cursor.fetchall()]

    @staticmethod
    def link_to_application(db: Database, email_id: int, app_id: int):
        """Link an email to an application."""
        db.execute(
            "UPDATE emails SET application_id = ? WHERE id = ?",
            (app_id, email_id)
        )
        db.commit()

    @staticmethod
    def mark_as_processed(db: Database, ms_message_id: str):
        """Mark an email as processed."""
        db.execute(
            "INSERT OR IGNORE INTO processed_emails (ms_message_id) VALUES (?)",
            (ms_message_id,)
        )
        db.commit()

    @staticmethod
    def is_processed(db: Database, ms_message_id: str) -> bool:
        """Check if an email has been processed."""
        cursor = db.execute(
            "SELECT 1 FROM processed_emails WHERE ms_message_id = ?",
            (ms_message_id,)
        )
        return cursor.fetchone() is not None


class Interaction:
    @staticmethod
    def create(db: Database, app_id: int, type_: str, content: Optional[str] = None,
               occurred_at: Optional[str] = None, suggested_stage_change: Optional[str] = None) -> int:
        """Create a new interaction."""
        cursor = db.execute(
            """INSERT INTO interactions (application_id, type, content, occurred_at, suggested_stage_change)
               VALUES (?, ?, ?, ?, ?)""",
            (app_id, type_, content, occurred_at or datetime.now().isoformat(), suggested_stage_change)
        )
        db.commit()
        return cursor.lastrowid

    @staticmethod
    def get_by_application(db: Database, app_id: int) -> List[Dict[str, Any]]:
        """Get all interactions for an application."""
        cursor = db.execute(
            "SELECT * FROM interactions WHERE application_id = ? ORDER BY occurred_at DESC",
            (app_id,)
        )
        return [dict(row) for row in cursor.fetchall()]


class StageSuggestion:
    @staticmethod
    def create(db: Database, app_id: int, from_stage: str, to_stage: str,
               reason: Optional[str] = None, confidence: float = 0.7) -> int:
        """Create a new stage suggestion."""
        cursor = db.execute(
            """INSERT INTO stage_suggestions (application_id, from_stage, to_stage, reason, confidence)
               VALUES (?, ?, ?, ?, ?)""",
            (app_id, from_stage, to_stage, reason, confidence)
        )
        db.commit()
        return cursor.lastrowid

    @staticmethod
    def get_pending(db: Database) -> List[Dict[str, Any]]:
        """Get all pending stage suggestions."""
        cursor = db.execute(
            "SELECT * FROM stage_suggestions WHERE status = 'pending' ORDER BY created_at DESC"
        )
        return [dict(row) for row in cursor.fetchall()]

    @staticmethod
    def confirm(db: Database, suggestion_id: int, app_id: int):
        """Confirm a stage suggestion and update the application."""
        cursor = db.execute(
            "SELECT to_stage FROM stage_suggestions WHERE id = ?", (suggestion_id,)
        )
        row = cursor.fetchone()
        if row:
            to_stage = row["to_stage"]
            db.execute(
                "UPDATE stage_suggestions SET status = 'confirmed' WHERE id = ?",
                (suggestion_id,)
            )
            Application.update_status(db, app_id, to_stage)
            db.commit()

    @staticmethod
    def dismiss(db: Database, suggestion_id: int):
        """Dismiss a stage suggestion."""
        db.execute(
            "UPDATE stage_suggestions SET status = 'dismissed' WHERE id = ?",
            (suggestion_id,)
        )
        db.commit()


class SyncLog:
    @staticmethod
    def create(db: Database) -> int:
        """Create a new sync log entry."""
        cursor = db.execute(
            "INSERT INTO sync_logs (started_at, status) VALUES (?, 'running')",
            (datetime.now().isoformat(),)
        )
        db.commit()
        return cursor.lastrowid

    @staticmethod
    def update(db: Database, log_id: int, emails_fetched: int = 0, emails_processed: int = 0,
               apps_created: int = 0, status: str = "completed", errors: Optional[List[str]] = None):
        """Update a sync log entry."""
        errors_json = json.dumps(errors) if errors else None
        db.execute(
            """UPDATE sync_logs SET finished_at = ?, emails_fetched = ?, emails_processed = ?,
                                    apps_created = ?, status = ?, errors = ?
               WHERE id = ?""",
            (datetime.now().isoformat(), emails_fetched, emails_processed, apps_created, status, errors_json, log_id)
        )
        db.commit()

    @staticmethod
    def update_progress(db: Database, log_id: int, emails_fetched: Optional[int] = None,
                        emails_processed: Optional[int] = None, apps_created: Optional[int] = None,
                        status: str = "running"):
        """Update progress for a running sync without setting finished_at."""
        db.execute(
            """UPDATE sync_logs
               SET emails_fetched = COALESCE(?, emails_fetched),
                   emails_processed = COALESCE(?, emails_processed),
                   apps_created = COALESCE(?, apps_created),
                   status = ?
               WHERE id = ?""",
            (emails_fetched, emails_processed, apps_created, status, log_id)
        )
        db.commit()

    @staticmethod
    def get_latest(db: Database) -> Optional[Dict[str, Any]]:
        """Get the latest sync log entry."""
        cursor = db.execute(
            "SELECT * FROM sync_logs ORDER BY created_at DESC LIMIT 1"
        )
        row = cursor.fetchone()
        return dict(row) if row else None

    @staticmethod
    def get_running(db: Database) -> Optional[Dict[str, Any]]:
        """Get the most recent running sync log entry."""
        cursor = db.execute(
            "SELECT * FROM sync_logs WHERE status = 'running' ORDER BY created_at DESC LIMIT 1"
        )
        row = cursor.fetchone()
        return dict(row) if row else None

    @staticmethod
    def get_recent(db: Database, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent sync logs."""
        cursor = db.execute(
            "SELECT * FROM sync_logs ORDER BY created_at DESC LIMIT ?",
            (limit,)
        )
        return [dict(row) for row in cursor.fetchall()]


class AppConfig:
    """Application configuration (key-value store)."""

    # Default sync schedule: daily at 2 AM
    DEFAULT_SCHEDULE = "daily"  # "daily", "every_4_hours", "manual_only"
    SCHEDULE_OPTIONS = ["daily", "every_4_hours", "manual_only"]

    @staticmethod
    def get(db: Database, key: str, default: str = None) -> str:
        """Get a config value."""
        cursor = db.execute(
            "SELECT value FROM config WHERE key = ?",
            (key,)
        )
        row = cursor.fetchone()
        return row["value"] if row else default

    @staticmethod
    def set(db: Database, key: str, value: str):
        """Set a config value."""
        cursor = db.execute(
            "SELECT value FROM config WHERE key = ?",
            (key,)
        )
        if cursor.fetchone():
            db.execute(
                "UPDATE config SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?",
                (value, key)
            )
        else:
            db.execute(
                "INSERT INTO config (key, value) VALUES (?, ?)",
                (key, value)
            )
        db.commit()

    @staticmethod
    def get_sync_schedule(db: Database) -> str:
        """Get the configured sync schedule."""
        return AppConfig.get(db, "sync_schedule", AppConfig.DEFAULT_SCHEDULE)

    @staticmethod
    def set_sync_schedule(db: Database, schedule: str):
        """Set the sync schedule."""
        if schedule not in AppConfig.SCHEDULE_OPTIONS:
            raise ValueError(f"Invalid schedule: {schedule}")
        AppConfig.set(db, "sync_schedule", schedule)

    @staticmethod
    def get_next_sync_time(db: Database) -> Optional[str]:
        """Get the next scheduled sync time (stored by scheduler)."""
        return AppConfig.get(db, "next_sync_time")

    @staticmethod
    def set_next_sync_time(db: Database, iso_time: str):
        """Update the next scheduled sync time."""
        AppConfig.set(db, "next_sync_time", iso_time)
