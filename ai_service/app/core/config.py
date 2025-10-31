"""
Core configuration for PyBlocks AI Service
Loads environment variables and provides centralized settings
"""
import os
from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    # Service Info
    APP_NAME: str = "PyBlocks AI Service"
    APP_VERSION: str = "2.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"
    
    # Server Configuration
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # CORS Settings
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",  # Next.js frontend
        "http://localhost:3001",  # Backend NestJS
        "http://localhost:5000",  # Alternative backend port
    ]
    
    # Backend Integration
    BACKEND_URL: str = os.getenv("BACKEND_URL", "http://localhost:3001")
    BACKEND_API_KEY: str = os.getenv("BACKEND_API_KEY", "")  # For secure communication
    
    # Code Execution Settings
    CODE_TIMEOUT: int = int(os.getenv("CODE_TIMEOUT", "5"))  # seconds
    MAX_OUTPUT_LENGTH: int = int(os.getenv("MAX_OUTPUT_LENGTH", "10000"))  # characters
    ENABLE_SANDBOXING: bool = os.getenv("ENABLE_SANDBOXING", "true").lower() == "true"
    
    # AI/ML Model Settings
    # 🔥 ADD YOUR AI MODEL API KEY HERE
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "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")  # For OpenRouter (cheap models)
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")  # For OpenAI GPT models
    HUGGINGFACE_API_KEY: str = os.getenv("HUGGINGFACE_API_KEY", "")  # For HuggingFace models
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")  # For Claude models
    GOOGLE_AI_API_KEY: str = os.getenv("GOOGLE_AI_API_KEY", "")  # For Gemini models
    
    # Model Configuration
    AI_MODEL_PROVIDER: str = os.getenv("AI_MODEL_PROVIDER", "rule-based")  # Options: "openrouter", "openai", "huggingface", "anthropic", "google", "rule-based"
    AI_MODEL_NAME: str = os.getenv("AI_MODEL_NAME", "z-ai/glm-4.5-air")  # Specific model to use
    AI_TEMPERATURE: float = float(os.getenv("AI_TEMPERATURE", "0.7"))  # Creativity level
    AI_MAX_TOKENS: int = int(os.getenv("AI_MAX_TOKENS", "500"))  # Response length
    
    # Feedback Settings
    FEEDBACK_MIN_LENGTH: int = 20  # Minimum feedback message length
    FEEDBACK_MAX_LENGTH: int = 500  # Maximum feedback message length
    ENABLE_HINTS: bool = True
    ENABLE_ENCOURAGEMENT: bool = True
    
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE: str = os.getenv("LOG_FILE", "logs/ai_service.log")
    ENABLE_FILE_LOGGING: bool = os.getenv("ENABLE_FILE_LOGGING", "true").lower() == "true"
    
    # Analytics
    EVENT_LOG_FILE: str = "data/student_events.json"
    ENABLE_ANALYTICS: bool = True
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))
    
    # Cache Settings
    ENABLE_CACHING: bool = os.getenv("ENABLE_CACHING", "true").lower() == "true"
    CACHE_TTL: int = int(os.getenv("CACHE_TTL", "300"))  # seconds
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """
    Create cached settings instance
    This ensures we only load environment variables once
    """
    return Settings()


# Convenience accessor
settings = get_settings()
