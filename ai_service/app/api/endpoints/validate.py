"""
Code Validation API Endpoint
RESTful API for mission-focused code validation
"""
from fastapi import APIRouter, HTTPException, Depends, status
from typing import Optional
import uuid

from app.models.validation_models import ValidationRequest, ValidationResponse
from app.services.code_validation_service import CodeValidationService
from app.services.code_executor import CodeExecutor
from app.core.logger import get_logger

logger = get_logger(__name__)

# Create router
router = APIRouter(
    prefix="/api/v1",
    tags=["validation"]
)


def get_validation_service() -> CodeValidationService:
    """Dependency injection for validation service"""
    code_executor = CodeExecutor()
    return CodeValidationService(code_executor)


@router.post(
    "/validate",
    response_model=ValidationResponse,
    status_code=status.HTTP_200_OK,
    summary="Validate Student Code Against Mission",
    description="""
    Validates student code submission against mission objectives using AI-powered analysis.
    
    The validator analyzes whether the code:
    - Meets specified learning objectives
    - Uses required programming concepts
    - Demonstrates understanding through quality code
    - Shows creativity in problem-solving
    
    Returns a comprehensive report with:
    - Success/fail determination
    - Objective completion status
    - Detected concepts and proficiency
    - Creativity assessment
    - Specific feedback and suggestions
    - Next steps for learning
    """,
    responses={
        200: {
            "description": "Validation completed successfully",
            "content": {
                "application/json": {
                    "example": {
                        "requestId": "val_1234567890",
                        "missionId": "mission_python_loops",
                        "validationResult": {
                            "success": True,
                            "overall_score": 85,
                            "confidence": 0.92,
                            "objectives_validated": [
                                {
                                    "objective": "Use a for loop to iterate through a list",
                                    "met": True,
                                    "confidence": 0.95,
                                    "evidence": "Lines 5-7 contain for loop iterating over list",
                                    "suggestions": []
                                }
                            ],
                            "objectives_met_count": 2,
                            "objectives_total_count": 2,
                            "concepts_detected": [
                                {
                                    "concept": "for-loop",
                                    "detected": True,
                                    "line_numbers": [5, 6, 7],
                                    "proficiency": 0.9,
                                    "explanation": "Properly implemented for loop with list iteration"
                                }
                            ],
                            "required_concepts_missing": [],
                            "creativity": {
                                "level": "moderately_creative",
                                "score": 72,
                                "features": ["efficient_algorithm", "improved_readability"],
                                "explanation": "Solution goes beyond basic requirements",
                                "examples": ["Uses list comprehension", "Adds helpful comments"]
                            },
                            "code_quality_score": 82,
                            "code_quality_feedback": "Well-structured and readable code",
                            "code_clarity_issues": [],
                            "strengths": ["Clear variable names", "Proper indentation", "Good comments"],
                            "areas_for_improvement": [],
                            "specific_suggestions": ["Consider adding error handling for edge cases"],
                            "learning_points": ["Master loop control", "Learn about list operations"],
                            "next_steps": "Try the challenge with nested loops",
                            "executed_successfully": True,
                            "execution_error": None,
                            "test_cases_passed": 3,
                            "test_cases_total": 3,
                            "analysis_time_ms": 1234,
                            "ai_model_used": "gpt-4-turbo",
                            "timestamp": "2024-01-15T10:30:00Z"
                        },
                        "passed": True,
                        "summary": "Excellent work! Your code successfully meets all mission objectives.",
                        "detailed_feedback": "## Your Mission Progress\nYou've completed 2/2 objectives...",
                        "should_advance": True,
                        "suggested_review": None
                    }
                }
            }
        },
        400: {
            "description": "Invalid request - missing required fields or validation failed",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Student code cannot be empty"
                    }
                }
            }
        },
        422: {
            "description": "Validation error - request body format incorrect",
            "content": {
                "application/json": {
                    "example": {
                        "detail": [
                            {
                                "loc": ["body", "mission_id"],
                                "msg": "field required",
                                "type": "value_error.missing"
                            }
                        ]
                    }
                }
            }
        },
        500: {
            "description": "Server error during validation",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Validation service encountered an error"
                    }
                }
            }
        }
    }
)
async def validate_code(
    request: ValidationRequest,
    service: CodeValidationService = Depends(get_validation_service)
) -> ValidationResponse:
    """
    Validate student code submission against mission objectives.
    
    This endpoint performs comprehensive AI-powered code validation including:
    
    **Objective Validation:**
    - Checks if each learning objective is met
    - Provides confidence scores for each validation
    - Explains the evidence for determinations
    
    **Concept Analysis:**
    - Detects required programming concepts in code
    - Assesses proficiency level with each concept
    - Identifies missing or incompletely used concepts
    
    **Creativity Assessment:**
    - Evaluates creative problem-solving approaches
    - Assigns creativity level (not_creative to highly_creative)
    - Identifies specific creative features
    
    **Code Quality:**
    - Analyzes readability and structure
    - Identifies clarity issues
    - Provides specific improvement suggestions
    
    **Execution Validation:**
    - Tests if code runs without errors
    - Validates test case passes
    - Reports runtime issues
    
    Args:
        request: ValidationRequest containing:
            - mission context (title, description, objectives)
            - student code to validate
            - required concepts to check
            - optional test cases
            - validation options
    
    Returns:
        ValidationResponse with complete analysis and recommendations
        
    Raises:
        HTTPException 400: Invalid/missing request data
        HTTPException 422: Request format validation failed
        HTTPException 500: Server error during validation
        
    Example:
        ```json
        {
            "missionId": "py_loops_101",
            "missionTitle": "Master Python Loops",
            "missionDescription": "Learn how to use for and while loops",
            "objectives": [
                "Use a for loop to iterate through a list",
                "Print each element",
                "Calculate the sum using the loop"
            ],
            "requiredConcepts": ["for-loop", "variable-assignment"],
            "studentCode": "total = 0\\nfor item in [1,2,3]:\\n    total += item\\n    print(item)\\nprint(total)",
            "expectedOutput": "1\\n2\\n3\\n6",
            "allowCreativity": true
        }
        ```
    """
    
    try:
        # Validate request data
        if not request.student_code or not request.student_code.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Student code cannot be empty"
            )
        
        if not request.mission_id or not request.mission_id.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mission ID is required"
            )
        
        if not request.mission_title or not request.mission_title.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mission title is required"
            )
        
        if not request.objectives or len(request.objectives) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one learning objective is required"
            )
        
        # Check code length (reasonable limit)
        if len(request.student_code) > 100000:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Student code exceeds maximum length (100KB)"
            )
        
        # Log validation request
        logger.info(
            "Code validation requested",
            extra={
                "mission_id": request.mission_id,
                "objectives_count": len(request.objectives),
                "code_length": len(request.student_code),
                "user_id": request.user_id
            }
        )
        
        # Perform validation
        response = await service.validate(request)
        
        logger.info(
            "Code validation completed",
            extra={
                "request_id": response.request_id,
                "mission_id": response.mission_id,
                "passed": response.passed,
                "score": response.validation_result.overall_score
            }
        )
        
        return response
        
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation value error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Validation error: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Validation service error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during code validation. Please try again."
        )


@router.get(
    "/validate/health",
    summary="Check Validation Service Health",
    description="Returns the health status of the validation service",
    responses={
        200: {
            "description": "Service is healthy",
            "content": {
                "application/json": {
                    "example": {
                        "status": "healthy",
                        "ai_available": True,
                        "timestamp": "2024-01-15T10:30:00Z"
                    }
                }
            }
        }
    }
)
async def validate_health(
    service: CodeValidationService = Depends(get_validation_service)
):
    """Check if validation service is operational"""
    try:
        return {
            "status": "healthy",
            "ai_available": service.ai_available,
            "timestamp": str(__import__('datetime').datetime.utcnow())
        }
    except Exception as e:
        logger.error(f"Health check error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Validation service is unavailable"
        )
