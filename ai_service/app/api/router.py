"""
API Router
Combines all endpoint routers
"""
from fastapi import APIRouter
from app.api.endpoints import analyze, hint, recommend, health, chat, behavior, observer


# Create main API router
api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(health.router)
api_router.include_router(analyze.router)
api_router.include_router(hint.router)
api_router.include_router(recommend.router)
api_router.include_router(chat.router)
api_router.include_router(behavior.router)
api_router.include_router(observer.router)
