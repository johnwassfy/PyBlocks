"""
PyBlocks AI Service - Main Application
Production-ready FastAPI service for code analysis and adaptive learning
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
import time
from pathlib import Path

from app.core.config import settings
from app.core.logger import logger
from app.api.router import api_router


# Create necessary directories
Path("logs").mkdir(exist_ok=True)
Path("data").mkdir(exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifecycle manager for the application
    Handles startup and shutdown events
    """
    # Startup
    logger.info(f"[STARTUP] Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"[STARTUP] Environment: {settings.ENVIRONMENT}")
    logger.info(f"[STARTUP] AI Provider: {settings.AI_MODEL_PROVIDER}")
    logger.info(f"[STARTUP] Sandboxing: {'Enabled' if settings.ENABLE_SANDBOXING else 'Disabled'}")
    logger.info(f"[STARTUP] Code Timeout: {settings.CODE_TIMEOUT}s")
    
    # Initialize services
    from app.services.code_executor import executor
    from app.services.feedback_engine import feedback_engine
    from app.services.recommender import recommender
    
    logger.info("[STARTUP] All services initialized successfully")
    
    yield  # Application runs here
    
    # Shutdown
    logger.info("[SHUTDOWN] Shutting down AI service...")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
    ## PyBlocks AI Service
    
    **Intelligent code analysis and adaptive learning system**
    
    ### Features:
    - 🔒 **Secure Code Execution**: Sandboxed Python code execution with timeout protection
    - 🧠 **AI-Powered Feedback**: Intelligent analysis and personalized feedback
    - 💡 **Smart Hints**: Context-aware hints that adapt to student progress
    - 🎯 **Adaptive Recommendations**: Personalized mission suggestions based on learning patterns
    - ⚡ **High Performance**: Fast analysis with caching and optimization
    
    ### Endpoints:
    - `/health` - Service health and status
    - `/analyze` - Comprehensive code analysis
    - `/hint` - Get coding hints
    - `/recommend` - Get mission recommendations
    
    ### Integration:
    This service integrates seamlessly with the NestJS backend via the `ai-connector` module.
    
    ### 🔥 AI Model Integration:
    To integrate your AI model (OpenAI, HuggingFace, Claude, Gemini):
    1. Set API key in environment variables
    2. Configure `AI_MODEL_PROVIDER` in settings
    3. The service will automatically use your model for feedback generation
    """,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
    debug=settings.DEBUG
)


# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """Add processing time to response headers"""
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = f"{process_time:.4f}s"
    return response


# Global exception handler
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors"""
    logger.error(f"Validation error: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={
            "error": "ValidationError",
            "message": "Invalid request data",
            "detail": exc.errors()
        }
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle unexpected errors"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": type(exc).__name__,
            "message": "Internal server error",
            "detail": str(exc) if settings.DEBUG else "An unexpected error occurred"
        }
    )


# Include API router
app.include_router(api_router, prefix="/api/v1")


# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """
    Root endpoint with service information
    """
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs",
        "health": "/api/v1/health",
        "ai_provider": settings.AI_MODEL_PROVIDER,
        "message": "🎓 Welcome to PyBlocks AI Service! Visit /docs for API documentation."
    }


# Legacy endpoint for backwards compatibility with old main.py
@app.get("/analytics", tags=["Legacy"])
async def legacy_analytics():
    """Legacy analytics endpoint (backwards compatibility)"""
    return {
        "message": "This endpoint is deprecated. Use /api/v1/health/metrics instead",
        "redirect": "/api/v1/health/metrics"
    }


if __name__ == "__main__":
    import uvicorn
    
    logger.info(f"🚀 Starting {settings.APP_NAME}...")
    logger.info(f"📊 Swagger UI: http://{settings.HOST}:{settings.PORT}/docs")
    logger.info(f"📚 ReDoc: http://{settings.HOST}:{settings.PORT}/redoc")
    logger.info(f"🔗 Backend integration: {settings.BACKEND_URL}")
    
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )
