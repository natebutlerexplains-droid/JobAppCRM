import os
import logging
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configuration class
class Config:
    # Database
    DATABASE_PATH = os.getenv("DATABASE_PATH", "./jobs.db")

    # Microsoft Graph API
    MS_GRAPH_CLIENT_ID = os.getenv("MS_GRAPH_CLIENT_ID")
    MS_GRAPH_CLIENT_SECRET = os.getenv("MS_GRAPH_CLIENT_SECRET")
    MS_GRAPH_USERNAME = os.getenv("MS_GRAPH_USERNAME")
    MS_GRAPH_PASSWORD = os.getenv("MS_GRAPH_PASSWORD")
    MS_GRAPH_AUTHORITY = "https://login.microsoftonline.com/consumers"
    MS_GRAPH_SCOPE = ["Mail.Read"]
    MS_GRAPH_REDIRECT_URI = "http://localhost:5001"
    MS_GRAPH_API_ENDPOINT = "https://graph.microsoft.com/v1.0"

    # Token storage
    TOKEN_CACHE_PATH = os.path.expanduser("~/.jobcrm/token.json")

    # Google Gemini API
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

    # Email sync settings
    EMAIL_SYNC_DAYS_BACK = int(os.getenv("EMAIL_SYNC_DAYS_BACK", "30"))
    CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.7"))

    # Scheduler settings
    SYNC_SCHEDULE_HOUR = 2  # 2 AM daily
    SYNC_SCHEDULE_MINUTE = 0
    STARTUP_SYNC_THRESHOLD_HOURS = 4  # Run on startup if >4 hours since last sync
    SYNC_PROGRESS_EVERY = int(os.getenv("SYNC_PROGRESS_EVERY", "1"))

    # Flask settings
    FLASK_ENV = os.getenv("FLASK_ENV", "development")
    FLASK_DEBUG = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    FLASK_PORT = int(os.getenv("FLASK_PORT", "5001"))
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-key-change-in-production")

    # Logging
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    LOG_DIR = "./logs"

    @staticmethod
    def validate():
        """Validate that required environment variables are set."""
        if not Config.MS_GRAPH_CLIENT_ID:
            raise ValueError("MS_GRAPH_CLIENT_ID not set in .env")
        if not Config.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY not set in .env")


def setup_logging():
    """Set up logging configuration."""
    os.makedirs(Config.LOG_DIR, exist_ok=True)

    log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(Config.LOG_LEVEL)
    console_formatter = logging.Formatter(log_format)
    console_handler.setFormatter(console_formatter)

    # File handler
    file_handler = logging.FileHandler(os.path.join(Config.LOG_DIR, "app.log"))
    file_handler.setLevel(Config.LOG_LEVEL)
    file_formatter = logging.Formatter(log_format)
    file_handler.setFormatter(file_formatter)

    # Root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(Config.LOG_LEVEL)
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)

    return root_logger


# Set up logging when module is imported
logger = setup_logging()
