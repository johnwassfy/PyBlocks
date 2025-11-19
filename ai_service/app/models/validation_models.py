"""
AI-Powered Code Validation Models
Comprehensive request/response models for mission-focused code validation
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class CreativityLevel(str, Enum):
    """Creativity detection levels"""
    NOT_CREATIVE = "not_creative"
    SLIGHTLY_CREATIVE = "slightly_creative"
    MODERATELY_CREATIVE = "moderately_creative"
    HIGHLY_CREATIVE = "highly_creative"


class ObjectiveValidation(BaseModel):
    """Individual objective validation result"""
    objective: str = Field(..., description="The objective statement")
    met: bool = Field(..., description="Whether this objective was met")
    confidence: float = Field(..., ge=0, le=1, description="Confidence score (0-1)")
    evidence: str = Field(..., description="Code evidence for this determination")
    suggestions: Optional[List[str]] = Field(default_factory=list, description="How to improve if not met")

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "objective": "Use a for loop to iterate through a list",
                "met": True,
                "confidence": 0.95,
                "evidence": "Lines 5-7 contain a for loop iterating over the list",
                "suggestions": []
            }
        }


class CreativityIndicator(BaseModel):
    """Creativity detection in solution"""
    level: CreativityLevel = Field(..., description="Overall creativity level")
    score: float = Field(..., ge=0, le=100, description="Creativity score (0-100)")
    features: List[str] = Field(default_factory=list, description="Creative features detected")
    explanation: str = Field(..., description="Explanation of creativity assessment")
    examples: Optional[List[str]] = Field(default_factory=list, description="Examples of creative approaches")

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "level": "moderately_creative",
                "score": 72,
                "features": ["efficient_algorithm", "extended_functionality", "improved_readability"],
                "explanation": "Solution goes beyond requirements with optimized approach",
                "examples": ["Uses list comprehension instead of loop", "Adds error handling not required"]
            }
        }


class ConceptUsage(BaseModel):
    """Detected concept usage in code"""
    concept: str = Field(..., description="Concept name")
    detected: bool = Field(..., description="Whether concept was used")
    line_numbers: List[int] = Field(default_factory=list, description="Lines where concept appears")
    proficiency: float = Field(..., ge=0, le=1, description="Proficiency with concept (0-1)")
    explanation: str = Field(..., description="How the concept was used")

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "concept": "function-definition",
                "detected": True,
                "line_numbers": [2, 3, 4],
                "proficiency": 0.85,
                "explanation": "Function properly defined with parameters and return statement"
            }
        }


class AIValidationResult(BaseModel):
    """Comprehensive validation result from AI analysis"""
    success: bool = Field(..., description="Whether code meets mission objectives")
    overall_score: float = Field(..., ge=0, le=100, description="Overall validation score (0-100)")
    confidence: float = Field(..., ge=0, le=1, description="Confidence in the validation result")
    
    # Objective validation
    objectives_validated: List[ObjectiveValidation] = Field(default_factory=list, description="Individual objective validations")
    objectives_met_count: int = Field(..., ge=0, description="Number of objectives met")
    objectives_total_count: int = Field(..., ge=0, description="Total number of objectives")
    
    # Concept analysis
    concepts_detected: List[ConceptUsage] = Field(default_factory=list, description="Detected concepts and their usage")
    required_concepts_missing: List[str] = Field(default_factory=list, description="Required concepts not found")
    
    # Creativity assessment
    creativity: CreativityIndicator = Field(..., description="Creativity analysis")
    
    # Code quality
    code_quality_score: float = Field(..., ge=0, le=100, description="Code quality assessment")
    code_quality_feedback: str = Field(..., description="Feedback on code quality")
    code_clarity_issues: List[str] = Field(default_factory=list, description="Clarity and readability issues")
    
    # Feedback and suggestions
    strengths: List[str] = Field(default_factory=list, description="What the student did well")
    areas_for_improvement: List[str] = Field(default_factory=list, description="Areas to improve")
    specific_suggestions: List[str] = Field(default_factory=list, description="Specific actionable suggestions")
    
    # Educational guidance
    learning_points: List[str] = Field(default_factory=list, description="Key learning points for student")
    next_steps: Optional[str] = Field(None, description="Recommended next steps or challenges")
    
    # Execution and testing
    executed_successfully: bool = Field(..., description="Whether code executed without errors")
    execution_error: Optional[str] = Field(None, description="Any execution error message")
    test_cases_passed: int = Field(default=0, ge=0, description="Number of test cases passed")
    test_cases_total: int = Field(default=0, ge=0, description="Total number of test cases")
    
    # Metadata
    analysis_time_ms: float = Field(..., ge=0, description="Analysis time in milliseconds")
    ai_model_used: str = Field(..., description="AI model that performed the analysis")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Analysis timestamp")

    class Config:
        populate_by_name = True


class ValidationRequest(BaseModel):
    """Request model for AI code validation"""
    mission_id: str = Field(..., alias="missionId", description="Mission identifier")
    
    # Mission context
    mission_title: str = Field(..., alias="missionTitle", description="Mission title")
    mission_description: str = Field(..., alias="missionDescription", description="Mission description")
    objectives: List[str] = Field(default_factory=list, description="Mission learning objectives")
    required_concepts: List[str] = Field(default_factory=list, alias="requiredConcepts", description="Concepts that should be used")
    
    # Code to validate
    student_code: str = Field(..., alias="studentCode", description="Student's code to validate")
    expected_output: Optional[str] = Field(None, alias="expectedOutput", description="Expected program output")
    test_cases: Optional[List[str]] = Field(default_factory=list, alias="testCases", description="Test cases in format: 'input|expected_output'")
    
    # Difficulty and context
    difficulty: int = Field(default=1, ge=1, le=10, description="Mission difficulty level")
    allow_creativity: bool = Field(default=True, alias="allowCreativity", description="Whether to reward creative solutions")
    
    # Student context
    user_id: Optional[str] = Field(None, alias="userId", description="Student user ID")
    student_level: Optional[int] = Field(None, alias="studentLevel", description="Student skill level")
    
    # Validation options
    check_exact_output: bool = Field(default=True, alias="checkExactOutput", description="Require exact output match")
    check_concepts: bool = Field(default=True, alias="checkConcepts", description="Validate concept usage")
    allow_hardcoded: bool = Field(default=False, alias="allowHardcoded", description="Whether hardcoded solutions are acceptable")
    
    # AI model selection
    ai_model: Optional[str] = Field(None, alias="aiModel", description="Specific AI model to use")

    class Config:
        populate_by_name = True


class ValidationResponse(BaseModel):
    """Response model for validation requests"""
    request_id: str = Field(..., alias="requestId", description="Unique request identifier")
    mission_id: str = Field(..., alias="missionId", description="Mission identifier")
    validation_result: AIValidationResult = Field(..., alias="validationResult", description="Comprehensive validation result")
    
    # Success indicator
    passed: bool = Field(..., description="Whether validation passed")
    
    # Human-readable summary
    summary: str = Field(..., description="Short human-readable summary")
    detailed_feedback: str = Field(..., alias="detailedFeedback", description="Detailed feedback for student")
    
    # Next actions
    should_advance: bool = Field(..., alias="shouldAdvance", description="Whether student should advance to next mission")
    suggested_review: Optional[List[str]] = Field(None, alias="suggestedReview", description="Topics to review before advancing")

    class Config:
        populate_by_name = True
