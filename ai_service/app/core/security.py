"""
Security middleware for API authentication
Protects AI service endpoints from unauthorized access
"""
from fastapi import Security, HTTPException, status
from fastapi.security import APIKeyHeader
from app.core.config import settings
from app.core.logger import logger

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(api_key: str = Security(api_key_header)) -> bool:
    """
    Verify API key from request header
    
    Args:
        api_key: API key from X-API-Key header
        
    Returns:
        True if authenticated
        
    Raises:
        HTTPException: 401 if missing key, 403 if invalid key
    """
    # If no API key configured, allow all requests (development mode)
    if not settings.BACKEND_API_KEY:
        logger.warning("[SECURITY] No API key configured - allowing all requests (DEVELOPMENT MODE)")
        return True
    
    # Check if API key is present
    if not api_key:
        logger.warning("[SECURITY] Request rejected - Missing API Key")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API Key. Please provide X-API-Key header."
        )
    
    # Verify API key matches configured value
    if api_key != settings.BACKEND_API_KEY:
        logger.warning(f"[SECURITY] Request rejected - Invalid API Key: {api_key[:8]}...")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API Key"
        )
    
    logger.debug("[SECURITY] Request authenticated successfully")
    return True


async def verify_api_key_optional(api_key: str = Security(api_key_header)) -> bool:
    """
    Optional API key verification (for public endpoints)
    
    Args:
        api_key: API key from X-API-Key header
        
    Returns:
        True if authenticated or no key required, False if key invalid
    """
    if not settings.BACKEND_API_KEY:
        return True
    
    if not api_key:
        return True  # Allow request without key if it's optional
    
    if api_key != settings.BACKEND_API_KEY:
        logger.warning(f"[SECURITY] Invalid API Key provided: {api_key[:8]}...")
        return False
    
    return True
