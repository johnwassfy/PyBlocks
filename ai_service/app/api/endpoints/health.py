"""
Health check and service status endpoints
"""
from fastapi import APIRouter
from app.models.responses import HealthResponse
from app.core.config import settings
from app.core.logger import logger
from datetime import datetime
import time


router = APIRouter(prefix="/health", tags=["Health"])


# Track service start time
_service_start_time = time.time()


@router.get(
    "",
    response_model=HealthResponse,
    summary="Health check",
    description="Check if the AI service is running properly"
)
async def health_check() -> HealthResponse:
    """
    Health check endpoint
    
    Returns service status, version, and configuration
    """
    uptime = time.time() - _service_start_time
    
    return HealthResponse(
        status="healthy",
        service=settings.APP_NAME,
        version=settings.APP_VERSION,
        timestamp=datetime.utcnow(),
        uptime_seconds=uptime,
        ai_provider=settings.AI_MODEL_PROVIDER,
        features={
            "sandboxing": settings.ENABLE_SANDBOXING,
            "caching": settings.ENABLE_CACHING,
            "analytics": settings.ENABLE_ANALYTICS,
            "hints": settings.ENABLE_HINTS,
            "encouragement": settings.ENABLE_ENCOURAGEMENT,
        }
    )


@router.get(
    "/ping",
    summary="Simple ping",
    description="Quick ping to check if service is responsive"
)
async def ping() -> dict:
    """
    Simple ping endpoint
    
    Returns immediately with minimal processing
    """
    return {"ping": "pong", "timestamp": datetime.utcnow().isoformat()}


@router.get(
    "/ready",
    summary="Readiness check",
    description="Check if service is ready to accept requests"
)
async def ready() -> dict:
    """
    Kubernetes-style readiness probe
    
    Checks if all dependencies are available
    """
    try:
        # Check if critical components are initialized
        from app.services.code_executor import executor
        from app.services.feedback_engine import feedback_engine
        from app.services.recommender import recommender
        
        # Simple validation
        assert executor is not None
        assert feedback_engine is not None
        assert recommender is not None
        
        return {
            "ready": True,
            "status": "All systems operational",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Readiness check failed: {str(e)}")
        return {
            "ready": False,
            "status": f"Service not ready: {str(e)}",
            "timestamp": datetime.utcnow().isoformat()
        }


@router.get(
    "/metrics",
    summary="Service metrics",
    description="Get basic metrics about service usage"
)
async def metrics() -> dict:
    """
    Basic metrics endpoint
    
    In production, integrate with Prometheus or similar
    """
    return {
        "service": settings.APP_NAME,
        "uptime_seconds": time.time() - _service_start_time,
        "ai_provider": settings.AI_MODEL_PROVIDER,
        "code_timeout": settings.CODE_TIMEOUT,
        "enable_sandboxing": settings.ENABLE_SANDBOXING,
        "timestamp": datetime.utcnow().isoformat()
    }
