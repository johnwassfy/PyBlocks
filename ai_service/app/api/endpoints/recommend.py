"""
Mission recommendation endpoint
Suggests next missions based on learning progress
"""
from fastapi import APIRouter, HTTPException, status, Depends
from app.models.requests import RecommendationRequest
from app.models.responses import RecommendationResponse, ErrorResponse
from app.services.recommender import recommender
from app.core.logger import logger, log_request, log_response
from app.core.security import verify_api_key
import time


router = APIRouter(prefix="/recommend", tags=["Recommendations"])


@router.post(
    "",
    response_model=RecommendationResponse,
    summary="Get mission recommendations",
    description="Generate personalized mission recommendations based on learning progress",
    responses={
        200: {"description": "Recommendations generated successfully"},
        400: {"model": ErrorResponse, "description": "Invalid request"},
        401: {"description": "Missing API Key"},
        403: {"description": "Invalid API Key"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
async def recommend_missions(
    request: RecommendationRequest,
    authenticated: bool = Depends(verify_api_key)
) -> RecommendationResponse:
    """
    Generate personalized mission recommendations
    
    Takes into account:
    - Weak concepts that need improvement
    - Strong concepts to build upon
    - Previously completed missions
    - Average score and learning velocity
    
    Example:
    ```json
    {
        "userId": "user456",
        "currentMissionId": "mission123",
        "weakConcepts": ["loops", "conditionals"],
        "strongConcepts": ["functions", "strings"],
        "completedMissions": ["mission1", "mission2"],
        "averageScore": 85.5,
        "learningVelocity": "fast"
    }
    ```
    """
    start_time = time.time()
    
    try:
        log_request("recommend", request.user_id, request.current_mission_id)
        
        # Generate recommendations
        recommendations = recommender.recommend_missions(
            weak_concepts=request.weak_concepts,
            strong_concepts=request.strong_concepts,
            completed_missions=request.completed_missions,
            average_score=request.average_score,
            learning_velocity=request.learning_velocity
        )
        
        duration_ms = (time.time() - start_time) * 1000
        log_response("recommend", True, duration_ms)
        
        logger.info(f"[RECOMMEND] Recommended {len(recommendations.recommended_missions)} missions for user {request.user_id}")
        
        return recommendations
        
    except Exception as e:
        logger.error(f"Error generating recommendations: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate recommendations: {str(e)}"
        )


@router.post(
    "/next",
    response_model=RecommendationResponse,
    summary="Get next mission",
    description="Quick recommendation for just the next mission"
)
async def get_next_mission(request: RecommendationRequest) -> RecommendationResponse:
    """
    Simplified endpoint that returns just the next recommended mission
    
    Useful for "What should I do next?" quick suggestions
    """
    try:
        recommendations = recommender.recommend_missions(
            weak_concepts=request.weak_concepts,
            strong_concepts=request.strong_concepts,
            completed_missions=request.completed_missions,
            average_score=request.average_score,
            learning_velocity=request.learning_velocity
        )
        
        # Return only the top recommendation
        if recommendations.recommended_missions:
            recommendations.recommended_missions = [recommendations.recommended_missions[0]]
        
        return recommendations
        
    except Exception as e:
        logger.error(f"Error getting next mission: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
