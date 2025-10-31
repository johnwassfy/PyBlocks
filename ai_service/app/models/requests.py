"""
Request models for code analysis
Matches the backend's AiAnalysisRequestDto
"""
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any


class CodeAnalysisRequest(BaseModel):
    """
    Request model for code analysis
    This matches the backend's AiAnalysisRequestDto
    """
    code: str = Field(..., description="Python code to analyze", min_length=1)
    mission_id: str = Field(..., alias="missionId", description="Mission identifier")
    user_id: Optional[str] = Field(None, alias="userId", description="User identifier")
    submission_id: Optional[str] = Field(None, alias="submissionId", description="Submission identifier for tracking learning state")
    test_cases: List[str] = Field(default_factory=list, alias="testCases", description="Test cases to run")
    concepts: Optional[List[str]] = Field(default_factory=list, description="Expected programming concepts")
    difficulty: Optional[int] = Field(default=5, ge=1, le=10, description="Mission difficulty (1-10)")
    max_attempts: Optional[int] = Field(default=None, alias="maxAttempts", description="Maximum allowed attempts")
    time_limit: Optional[int] = Field(default=None, alias="timeLimit", description="Time limit in seconds")
    
    class Config:
        populate_by_name = True  # Allow both camelCase and snake_case
        json_schema_extra = {
            "example": {
                "code": "def greet(name):\n    return f'Hello, {name}!'",
                "missionId": "507f1f77bcf86cd799439012",
                "userId": "507f1f77bcf86cd799439011",
                "testCases": ["greet('Alice') == 'Hello, Alice!'", "greet('Bob') == 'Hello, Bob!'"],
                "concepts": ["function-definition", "return-statement", "string-formatting"],
                "difficulty": 3
            }
        }
    
    @validator('code')
    def code_not_empty(cls, v):
        if not v.strip():
            raise ValueError('Code cannot be empty or just whitespace')
        return v


class HintRequest(BaseModel):
    """Request model for getting hints"""
    code: str = Field(..., description="Current code")
    mission_id: str = Field(..., alias="missionId", description="Mission identifier")
    user_id: Optional[str] = Field(None, alias="userId", description="User identifier")
    error_message: Optional[str] = Field(None, alias="errorMessage", description="Current error message")
    concepts: Optional[List[str]] = Field(default_factory=list, description="Expected concepts")
    attempt_number: int = Field(default=1, alias="attemptNumber", ge=1, description="Current attempt number")
    
    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "code": "def greet(name)\n    return f'Hello, {name}!'",
                "missionId": "507f1f77bcf86cd799439012",
                "userId": "507f1f77bcf86cd799439011",
                "errorMessage": "SyntaxError: invalid syntax",
                "attemptNumber": 2
            }
        }


class RecommendationRequest(BaseModel):
    """Request model for mission recommendations"""
    user_id: str = Field(..., alias="userId", description="User identifier")
    current_mission_id: Optional[str] = Field(None, alias="currentMissionId", description="Current mission")
    weak_concepts: Optional[List[str]] = Field(default_factory=list, alias="weakConcepts", description="Concepts user struggles with")
    strong_concepts: Optional[List[str]] = Field(default_factory=list, alias="strongConcepts", description="Concepts user excels at")
    completed_missions: Optional[List[str]] = Field(default_factory=list, alias="completedMissions", description="List of completed mission IDs")
    average_score: Optional[float] = Field(default=0.0, alias="averageScore", ge=0, le=100, description="User's average score")
    learning_velocity: Optional[str] = Field(default="medium", alias="learningVelocity", description="Learning speed: slow, medium, fast")
    
    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "userId": "507f1f77bcf86cd799439011",
                "currentMissionId": "507f1f77bcf86cd799439012",
                "weakConcepts": ["loops", "conditionals"],
                "strongConcepts": ["functions", "strings"],
                "completedMissions": ["mission1", "mission2", "mission3"],
                "averageScore": 85.5,
                "learningVelocity": "fast"
            }
        }
