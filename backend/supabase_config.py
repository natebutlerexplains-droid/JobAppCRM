"""Supabase configuration and connection management."""

import os
from typing import Optional

SUPABASE_URL = "https://fbrmhmudkzgwbxllbwkd.supabase.co"
SUPABASE_KEY = "sb_publishable_ywC7VVzks9fuc4txlzjI2Q_qsSkhP4i"
SUPABASE_CONNECTION_STRING = "postgresql://postgres:Semo4735!$!@db.fbrmhmudkzgwbxllbwkd.supabase.co:5432/postgres"

def get_supabase_connection_string() -> str:
    """Get Supabase PostgreSQL connection string."""
    return os.getenv("DATABASE_URL", SUPABASE_CONNECTION_STRING)
