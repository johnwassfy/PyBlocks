"""
Hint generation endpoint
Provides contextual hints to students
"""
from fastapi import APIRouter, HTTPException, status, Depends
from app.models.requests import HintRequest
from app.models.responses import HintResponse, ErrorResponse
from app.services.feedback_engine import feedback_engine
from app.core.logger import logger, log_request, log_response
from app.core.security import verify_api_key
import time


router = APIRouter(prefix="/hint", tags=["Hints"])


@router.post(
    "",
    response_model=HintResponse,
    summary="Get coding hint",
    description="Generate contextual hint based on current code and errors",
    responses={
        200: {"description": "Hint generated successfully"},
        400: {"model": ErrorResponse, "description": "Invalid request"},
        401: {"description": "Missing API Key"},
        403: {"description": "Invalid API Key"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
async def get_hint(
    request: HintRequest,
    authenticated: bool = Depends(verify_api_key)
) -> HintResponse:
    """
    Generate helpful hint for student
    
    Hints become more direct as attempt_number increases:
    - Attempts 1-2: Gentle guidance
    - Attempts 3-4: More specific hints
    - Attempts 5+: Direct hints with examples
    
    Example:
    ```json
    {
        "code": "def greet(name)\\n    return f'Hello, {name}!'",
        "missionId": "mission123",
        "userId": "user456",
        "errorMessage": "SyntaxError: invalid syntax",
        "attemptNumber": 2
    }
    ```
    """
    start_time = time.time()
    
    try:
        log_request("hint", request.user_id, request.mission_id)
        
        # Generate personalized hint
        hint = feedback_engine.generate_hint(
            code=request.code,
            error_message=request.error_message,
            expected_concepts=request.concepts,
            attempt_number=request.attempt_number
        )
        
        duration_ms = (time.time() - start_time) * 1000
        log_response("hint", True, duration_ms)
        
        return hint
        
    except Exception as e:
        logger.error(f"Error generating hint: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate hint: {str(e)}"
        )


@router.post(
    "/encouragement",
    response_model=HintResponse,
    summary="Get encouragement",
    description="Provide motivational message for struggling students"
)
async def get_encouragement(request: HintRequest) -> HintResponse:
    """
    Generate encouraging message without giving away the solution
    
    Use this when student is struggling but you want to boost morale
    """
    try:
        import random
        
        encouragements = [
            "💪 You're doing great! Programming is all about practice!",
            "🌟 Every error is a learning opportunity! Keep going!",
            "🚀 You're building valuable skills with each attempt!",
            "🎯 Progress, not perfection! You're on the right path!",
            "💡 Remember: even expert programmers make mistakes. That's how we learn!",
            "✨ You've got this! Break the problem into smaller steps.",
            "🔥 Persistence is key! You're closer than you think!",
            "⭐ Great coders aren't born, they're made through practice like this!",
        ]
        
        return HintResponse(
            hint=random.choice(encouragements),
            hint_type="encouragement",
            related_concepts=[],
            difficulty_level=1
        )
        
    except Exception as e:
        logger.error(f"Error generating encouragement: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
