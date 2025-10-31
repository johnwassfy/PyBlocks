"""
Code analysis endpoint
Receives code from backend, analyzes it, and returns structured feedback
"""
from fastapi import APIRouter, HTTPException, status, Depends
from app.models.requests import CodeAnalysisRequest
from app.models.responses import CodeAnalysisResponse, ErrorResponse
from app.services.code_executor import executor
from app.services.feedback_engine import feedback_engine
from app.services.backend_client import backend_client
from app.core.logger import logger, log_request, log_response, log_ai_analysis
from app.core.utils import timing_decorator
from app.core.security import verify_api_key
import time


router = APIRouter(prefix="/analyze", tags=["Analysis"])


@router.post(
    "",
    response_model=CodeAnalysisResponse,
    summary="Analyze student code",
    description="Execute code, run tests, and generate AI-powered feedback",
    responses={
        200: {"description": "Analysis completed successfully"},
        400: {"model": ErrorResponse, "description": "Invalid request"},
        401: {"description": "Missing API Key"},
        403: {"description": "Invalid API Key"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
@timing_decorator
async def analyze_code(
    request: CodeAnalysisRequest,
    authenticated: bool = Depends(verify_api_key)
) -> CodeAnalysisResponse:
    """
    Main endpoint for code analysis
    
    This endpoint:
    1. Receives code from backend
    2. Executes it safely with timeout protection
    3. Runs test cases
    4. Generates AI feedback
    5. Returns structured analysis
    
    Example:
    ```json
    {
        "code": "def greet(name):\\n    return f'Hello, {name}!'",
        "missionId": "mission123",
        "userId": "user456",
        "testCases": ["greet('Alice') == 'Hello, Alice!'"],
        "concepts": ["function-definition", "string-formatting"],
        "difficulty": 3
    }
    ```
    """
    start_time = time.time()
    
    try:
        # Log request
        log_request("analyze", request.user_id, request.mission_id)
        
        # Validate syntax first (fast check)
        is_valid, syntax_error = executor.validate_syntax(request.code)
        if not is_valid:
            logger.warning(f"Syntax error detected: {syntax_error}")
            return CodeAnalysisResponse(
                success=False,
                score=0,
                feedback=f"❌ {syntax_error}",
                weak_concepts=request.concepts or [],
                strong_concepts=[],
                hints=["Check your code syntax carefully"],
                suggestions=["Make sure all parentheses, brackets, and quotes are properly closed"],
                test_results=[],
                execution_time=0.0,
                detected_concepts=[],
                complexity_score=0,
                error_type="SyntaxError",
                error_message=syntax_error
            )
        
        # Execute code
        execution_result = executor.execute(
            request.code,
            request.test_cases
        )
        
        # Generate AI feedback
        analysis = feedback_engine.generate_analysis(
            code=request.code,
            execution_result=execution_result,
            expected_concepts=request.concepts,
            difficulty=request.difficulty
        )
        
        # Log analysis results
        log_ai_analysis(
            request.user_id or "anonymous",
            analysis.score,
            analysis.weak_concepts
        )
        
        # Update learning state in backend database (non-blocking)
        if request.user_id and request.submission_id:
            try:
                # Calculate concept scores for detected concepts
                concept_scores = {}
                for concept in analysis.detected_concepts:
                    # Score concepts based on success and presence
                    if analysis.success:
                        # High score if concept is used successfully
                        base_score = 80 + (analysis.score / 5)  # 80-100 range
                        concept_scores[concept] = min(100, int(base_score))
                    else:
                        # Lower score if execution failed
                        concept_scores[concept] = max(40, int(analysis.score * 0.6))
                
                # For expected concepts not detected, assign low scores
                for concept in (request.concepts or []):
                    if concept not in concept_scores:
                        concept_scores[concept] = 30  # Missing expected concept
                
                # Build analysis payload for backend
                analysis_payload = {
                    "detectedConcepts": analysis.detected_concepts,
                    "weaknesses": analysis.weak_concepts,
                    "strengths": analysis.strong_concepts,
                    "suggestions": analysis.suggestions,
                    "conceptScores": concept_scores,
                    "isSuccessful": analysis.success,
                    "score": analysis.score
                }
                
                # Call backend to update learning state
                await backend_client.update_learning_state(
                    user_id=request.user_id,
                    submission_id=request.submission_id,
                    analysis=analysis_payload
                )
                logger.info(f"[ANALYZE] Learning state updated for user {request.user_id}")
                
            except Exception as update_error:
                # Don't fail analysis if update fails
                logger.error(f"[ANALYZE] Failed to update learning state: {update_error}")
        
        # Log response time
        duration_ms = (time.time() - start_time) * 1000
        log_response("analyze", analysis.success, duration_ms)
        
        return analysis
        
    except Exception as e:
        logger.error(f"Error analyzing code: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis failed: {str(e)}"
        )


@router.post(
    "/quick",
    response_model=CodeAnalysisResponse,
    summary="Quick syntax check",
    description="Fast syntax validation without full execution"
)
async def quick_check(request: CodeAnalysisRequest) -> CodeAnalysisResponse:
    """
    Quick endpoint for syntax checking only (no execution)
    
    Use this for live syntax checking as user types
    """
    try:
        is_valid, error = executor.validate_syntax(request.code)
        
        if is_valid:
            return CodeAnalysisResponse(
                success=True,
                score=100,
                feedback="✅ Syntax looks good!",
                weak_concepts=[],
                strong_concepts=[],
                hints=[],
                suggestions=[],
                test_results=[],
                execution_time=0.0,
                detected_concepts=[],
                complexity_score=0
            )
        else:
            return CodeAnalysisResponse(
                success=False,
                score=0,
                feedback=f"❌ {error}",
                weak_concepts=[],
                strong_concepts=[],
                hints=["Check your syntax"],
                suggestions=[],
                test_results=[],
                execution_time=0.0,
                detected_concepts=[],
                complexity_score=0,
                error_type="SyntaxError",
                error_message=error
            )
            
    except Exception as e:
        logger.error(f"Quick check error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
