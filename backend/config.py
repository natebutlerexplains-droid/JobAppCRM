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

    # Flask settings
    FLASK_ENV = os.getenv("FLASK_ENV", "development")
    FLASK_DEBUG = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    FLASK_PORT = int(os.getenv("FLASK_PORT", "5000"))
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-key-change-in-production")

    # Logging
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    LOG_DIR = "./logs"

    # Gemini API
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")


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
