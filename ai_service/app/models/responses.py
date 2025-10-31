"""
Response models for API endpoints
Matches the backend's AiAnalysisResponseDto
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class TestResult(BaseModel):
    """Individual test case result"""
    test_case: str = Field(..., alias="testCase", description="Test case expression")
    passed: bool = Field(..., description="Whether the test passed")
    expected: Optional[Any] = Field(None, description="Expected output")
    actual: Optional[Any] = Field(None, description="Actual output")
    error: Optional[str] = Field(None, description="Error message if failed")
    
    class Config:
        populate_by_name = True


class CodeAnalysisResponse(BaseModel):
    """
    Response model for code analysis
    This matches the backend's AiAnalysisResponseDto
    """
    success: bool = Field(..., description="Whether code executed successfully")
    score: int = Field(..., ge=0, le=100, description="Score out of 100")
    feedback: str = Field(..., description="Detailed feedback message")
    weak_concepts: List[str] = Field(default_factory=list, alias="weakConcepts", description="Concepts user struggles with")
    strong_concepts: List[str] = Field(default_factory=list, alias="strongConcepts", description="Concepts user excels at")
    hints: List[str] = Field(default_factory=list, description="Helpful hints for improvement")
    suggestions: List[str] = Field(default_factory=list, description="Code improvement suggestions")
    test_results: List[TestResult] = Field(default_factory=list, alias="testResults", description="Individual test results")
    execution_time: float = Field(..., alias="executionTime", description="Code execution time in seconds")
    detected_concepts: List[str] = Field(default_factory=list, alias="detectedConcepts", description="Concepts detected in code")
    complexity_score: Optional[int] = Field(None, alias="complexityScore", ge=0, le=10, description="Code complexity (0-10)")
    error_type: Optional[str] = Field(None, alias="errorType", description="Type of error if any")
    error_message: Optional[str] = Field(None, alias="errorMessage", description="Error message if any")
    
    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "success": True,
                "score": 95,
                "feedback": "Excellent work! Your code is clean and efficient.",
                "weakConcepts": [],
                "strongConcepts": ["function-definition", "return-statement"],
                "hints": ["Consider adding error handling"],
                "suggestions": ["You could add input validation"],
                "testResults": [
                    {"testCase": "greet('Alice') == 'Hello, Alice!'", "passed": True, "expected": "Hello, Alice!", "actual": "Hello, Alice!"}
                ],
                "executionTime": 0.023,
                "detectedConcepts": ["function-definition", "return-statement", "string-formatting"],
                "complexityScore": 2
            }
        }


class HintResponse(BaseModel):
    """Response model for hint requests"""
    hint: str = Field(..., description="Helpful hint")
    hint_type: str = Field(default="general", alias="hintType", description="Type of hint: syntax, logic, concept, encouragement")
    related_concepts: List[str] = Field(default_factory=list, alias="relatedConcepts", description="Related concepts")
    example: Optional[str] = Field(None, description="Example code snippet")
    difficulty_level: int = Field(default=1, alias="difficultyLevel", ge=1, le=3, description="Hint difficulty: 1=gentle, 2=moderate, 3=direct")
    
    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "hint": "Remember to include a colon (:) at the end of function definitions",
                "hintType": "syntax",
                "relatedConcepts": ["function-definition"],
                "example": "def greet(name):\n    return f'Hello, {name}!'",
                "difficultyLevel": 1
            }
        }


class MissionRecommendation(BaseModel):
    """Individual mission recommendation"""
    mission_id: str = Field(..., alias="missionId", description="Recommended mission ID")
    title: str = Field(..., description="Mission title")
    difficulty: int = Field(..., ge=1, le=10, description="Mission difficulty")
    reason: str = Field(..., description="Why this mission is recommended")
    concepts: List[str] = Field(default_factory=list, description="Concepts covered")
    estimated_time: Optional[int] = Field(None, alias="estimatedTime", description="Estimated completion time in minutes")
    priority: int = Field(default=1, ge=1, le=3, description="Recommendation priority: 1=high, 2=medium, 3=low")
    
    class Config:
        populate_by_name = True


class RecommendationResponse(BaseModel):
    """Response model for mission recommendations"""
    recommended_missions: List[MissionRecommendation] = Field(..., alias="recommendedMissions", description="List of recommended missions")
    focus_areas: List[str] = Field(default_factory=list, alias="focusAreas", description="Areas to focus on")
    learning_path: str = Field(..., alias="learningPath", description="Suggested learning path")
    encouragement: str = Field(..., description="Motivational message")
    next_milestone: Optional[str] = Field(None, alias="nextMilestone", description="Next achievement to aim for")
    
    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "recommendedMissions": [
                    {
                        "missionId": "mission_loops_basic",
                        "title": "Loop Mastery",
                        "difficulty": 3,
                        "reason": "Build on your loop understanding",
                        "concepts": ["for-loop", "while-loop"],
                        "estimatedTime": 15,
                        "priority": 1
                    }
                ],
                "focusAreas": ["loops", "conditionals"],
                "learningPath": "Focus on control structures before moving to data structures",
                "encouragement": "You're making great progress! Keep up the excellent work!",
                "nextMilestone": "Complete 5 loop missions to unlock the Functions badge"
            }
        }


class HealthResponse(BaseModel):
    """Health check response"""
    status: str = Field(default="healthy", description="Service status")
    service: str = Field(..., description="Service name")
    version: str = Field(..., description="Service version")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Current timestamp")
    uptime_seconds: Optional[float] = Field(None, alias="uptimeSeconds", description="Service uptime in seconds")
    ai_provider: str = Field(..., alias="aiProvider", description="Current AI provider")
    features: Dict[str, bool] = Field(default_factory=dict, description="Enabled features")
    
    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "status": "healthy",
                "service": "PyBlocks AI Service",
                "version": "2.0.0",
                "timestamp": "2025-01-15T10:30:00Z",
                "uptimeSeconds": 3600.5,
                "aiProvider": "rule-based",
                "features": {
                    "sandboxing": True,
                    "caching": True,
                    "analytics": True
                }
            }
        }


class ErrorResponse(BaseModel):
    """Error response model"""
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Error message")
    detail: Optional[str] = Field(None, description="Detailed error information")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Error timestamp")
    
    class Config:
        json_schema_extra = {
            "example": {
                "error": "ValidationError",
                "message": "Invalid request data",
                "detail": "Code field cannot be empty",
                "timestamp": "2025-01-15T10:30:00Z"
            }
        }
