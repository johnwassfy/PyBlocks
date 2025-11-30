"""
Centralized logging configuration for the AI service
"""
import logging
import sys
import os
import re
from pathlib import Path
from datetime import datetime
from app.core.config import settings


def safe_log_message(message: str) -> str:
    """
    Sanitize log messages for Windows console encoding issues
    Removes emojis and non-ASCII characters if stdout doesn't support UTF-8
    """
    if sys.platform == 'win32' and sys.stdout.encoding and sys.stdout.encoding.lower() not in ('utf-8', 'utf8'):
        try:
            # Test if message can be encoded
            message.encode(sys.stdout.encoding)
            return message
        except (UnicodeEncodeError, UnicodeDecodeError):
            # Remove emojis and non-ASCII characters
            return re.sub(r'[^\x00-\x7F]+', '', message)
    return message


class SafeFormatter(logging.Formatter):
    """Custom formatter that handles Unicode encoding errors on Windows"""
    
    def format(self, record):
        # Format the record normally
        formatted = super().format(record)
        
        # On Windows, if we detect encoding issues, sanitize the message
        if sys.platform == 'win32' and sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
            try:
                # Test if the message can be encoded with the console encoding
                formatted.encode(sys.stdout.encoding)
            except (UnicodeEncodeError, UnicodeDecodeError):
                # Remove emojis and other problematic characters
                formatted = re.sub(r'[^\x00-\x7F]+', '', formatted)
        
        return formatted


def setup_logger(name: str = "ai_service") -> logging.Logger:
    """
    Configure and return a logger with console and file handlers
    
    Args:
        name: Logger name
        
    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, settings.LOG_LEVEL.upper()))
    
    # Prevent duplicate handlers
    if logger.handlers:
        return logger
    
    # Try to force UTF-8 encoding on Windows
    if sys.platform == 'win32':
        try:
            # Set console to UTF-8 mode
            os.system('chcp 65001 >nul 2>&1')
            if hasattr(sys.stdout, 'reconfigure'):
                sys.stdout.reconfigure(encoding='utf-8', errors='replace')
            if hasattr(sys.stderr, 'reconfigure'):
                sys.stderr.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass  # Fallback if reconfigure fails
    
    # Console Handler with safe formatting
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.DEBUG if settings.DEBUG else logging.INFO)
    
    console_formatter = SafeFormatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)
    
    # File Handler (if enabled) - always use UTF-8 for files
    if settings.ENABLE_FILE_LOGGING:
        log_file = Path(settings.LOG_FILE)
        log_file.parent.mkdir(parents=True, exist_ok=True)
        
        file_handler = logging.FileHandler(log_file, encoding='utf-8')
        file_handler.setLevel(logging.DEBUG)
        file_formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        file_handler.setFormatter(file_formatter)
        logger.addHandler(file_handler)
    
    return logger


# Create global logger instance
logger = setup_logger()


def log_request(endpoint: str, user_id: str = None, mission_id: str = None):
    """Log incoming API request"""
    logger.info(f"[REQUEST] Endpoint: {endpoint} | User: {user_id} | Mission: {mission_id}")


def log_response(endpoint: str, success: bool, duration_ms: float):
    """Log API response"""
    status = "[SUCCESS]" if success else "[FAILURE]"
    logger.info(f"{status} Endpoint: {endpoint} | Duration: {duration_ms:.2f}ms")


def log_error(error: Exception, context: str = ""):
    """Log error with context"""
    logger.error(f"[ERROR] Context: {context} | Error: {str(error)}", exc_info=True)


def log_ai_analysis(user_id: str, score: int, weak_concepts: list):
    """Log AI analysis results"""
    logger.info(f"[ANALYSIS] User: {user_id} | Score: {score} | Weak: {weak_concepts}")


def log_code_execution(success: bool, execution_time: float):
    """Log code execution"""
    status = "[EXECUTED]" if success else "[FAILED]"
    logger.debug(f"{status} Execution Time: {execution_time:.3f}s")
