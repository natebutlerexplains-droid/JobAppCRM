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
                CHECK(status IN ('Submitted', 'More Info Required', 'Interview Started', 'Denied', 'Offered', 'Archived')),
            salary_min REAL,
            salary_max REAL,
            salary_negotiation_target REAL,
            employment_type TEXT,
            pay_type TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)

        # Migrate existing DBs — add new columns if missing
        new_cols = [
            ("salary_min", "REAL"),
            ("salary_max", "REAL"),
            ("salary_negotiation_target", "REAL"),
            ("employment_type", "TEXT"),
            ("pay_type", "TEXT"),
        ]
        for col_name, col_type in new_cols:
            try:
                cursor.execute(f"ALTER TABLE applications ADD COLUMN {col_name} {col_type}")
            except Exception:
                pass  # Column already exists

        # EMAILS table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS emails (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            application_id INTEGER,
            sender TEXT NOT NULL,
            subject TEXT NOT NULL,
            body_excerpt TEXT,
            date_received TIMESTAMP NOT NULL,
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
               company_domain: Optional[str] = None, job_url: Optional[str] = None,
               employment_type: Optional[str] = None, pay_type: Optional[str] = None,
               salary_min: Optional[float] = None, salary_max: Optional[float] = None,
               salary_negotiation_target: Optional[float] = None) -> int:
        """Create a new application."""
        cursor = db.execute(
            """INSERT INTO applications
               (company_name, company_domain, job_title, job_url, date_submitted,
                employment_type, pay_type, salary_min, salary_max, salary_negotiation_target)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (company_name, company_domain, job_title, job_url, date_submitted,
             employment_type, pay_type, salary_min, salary_max, salary_negotiation_target)
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
    def update(db: Database, app_id: int, fields: dict):
        """Update allowed fields on an application."""
        allowed = {
            'company_name', 'job_title', 'job_url', 'company_domain', 'status',
            'salary_min', 'salary_max', 'salary_negotiation_target',
            'employment_type', 'pay_type',
        }
        updates = {k: v for k, v in fields.items() if k in allowed}
        if not updates:
            return
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [app_id]
        db.execute(
            f"UPDATE applications SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            values
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
    def create(db: Database, sender: str, subject: str,
               body_excerpt: Optional[str] = None, date_received: Optional[str] = None,
               application_id: Optional[int] = None) -> int:
        """Create a new email record."""
        cursor = db.execute(
            """INSERT INTO emails (sender, subject, body_excerpt, date_received, application_id)
               VALUES (?, ?, ?, ?, ?)""",
            (sender, subject, body_excerpt, date_received or datetime.now().isoformat(), application_id)
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
