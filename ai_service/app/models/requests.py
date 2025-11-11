"""
Request models for code analysis
Enhanced with rich context for adaptive AI feedback
"""
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any


class MissionContext(BaseModel):
    """Rich semantic data about the learning goal"""
    title: str = Field(..., description="Mission title")
    description: str = Field(..., description="Mission description")
    objectives: Optional[List[str]] = Field(default_factory=list, description="Learning objectives")
    concepts: Optional[List[str]] = Field(default_factory=list, description="Required concepts")
    validation_mode: Optional[str] = Field(default="strict", alias="validationMode", description="Validation mode: strict, creative, line-count, concept-only")
    expected_output: Optional[str] = Field(None, alias="expectedOutput", description="Expected program output")
    expected_line_count: Optional[int] = Field(None, alias="expectedLineCount", description="Expected number of output lines")
    is_story_based: Optional[bool] = Field(default=False, alias="isStoryBased", description="Whether this is a storytelling mission")
    difficulty: Optional[int] = Field(default=1, ge=1, le=10, description="Difficulty level (1-10)")
    
    class Config:
        populate_by_name = True


class StudentContext(BaseModel):
    """Personalization data for adaptive feedback"""
    user_id: str = Field(..., alias="userId", description="User identifier")
    level: Optional[int] = Field(default=1, description="Student level")
    xp: Optional[int] = Field(default=0, description="Experience points")
    weak_skills: Optional[List[str]] = Field(default_factory=list, alias="weakSkills", description="Skills student struggles with")
    strong_skills: Optional[List[str]] = Field(default_factory=list, alias="strongSkills", description="Skills student excels at")
    learning_style: Optional[str] = Field(default="hands-on", alias="learningStyle", description="Learning style preference")
    feedback_preference: Optional[str] = Field(default="short", alias="feedbackPreference", description="Feedback preference: short, detailed, visual")
    ai_tone: Optional[str] = Field(default="friendly", alias="aiTone", description="AI tone: friendly, formal, encouraging, challenging")
    attempt_number: Optional[int] = Field(default=1, alias="attemptNumber", description="Current attempt number for this mission")
    time_spent: Optional[float] = Field(default=0, alias="timeSpent", description="Time spent in seconds")
    previous_feedback: Optional[str] = Field(None, alias="previousFeedback", description="Feedback from last attempt")
    
    class Config:
        populate_by_name = True


class SubmissionContext(BaseModel):
    """Technical data about code and execution"""
    code: str = Field(..., description="Student's code", min_length=1)
    output: Optional[str] = Field(None, description="Actual program output")
    execution_result: Optional[Dict[str, Any]] = Field(None, alias="executionResult", description="Execution result details")
    test_cases: Optional[List[str]] = Field(default_factory=list, alias="testCases", description="Test cases to run")
    complexity_score: Optional[int] = Field(None, alias="complexityScore", description="Code complexity score")
    syntax_score: Optional[int] = Field(default=100, alias="syntaxScore", description="Syntax correctness score")
    code_length: Optional[int] = Field(None, alias="codeLength", description="Number of characters in code")
    concepts_detected: Optional[List[str]] = Field(default_factory=list, alias="conceptsDetected", description="Detected concepts in code")
    line_count: Optional[int] = Field(None, alias="lineCount", description="Number of lines in code")
    
    class Config:
        populate_by_name = True


class BehaviorMetrics(BaseModel):
    """Engagement and frustration patterns"""
    idle_time: Optional[float] = Field(default=0, alias="idleTime", description="Idle time in seconds")
    corrections_made: Optional[int] = Field(default=0, alias="correctionsMade", description="Number of corrections made")
    errors_last_attempt: Optional[int] = Field(default=0, alias="errorsLastAttempt", description="Errors in last attempt")
    ai_hints_used: Optional[int] = Field(default=0, alias="aiHintsUsed", description="Number of AI hints used")
    proactive_help_triggered: Optional[bool] = Field(default=False, alias="proactiveHelpTriggered", description="Whether proactive help was triggered")
    
    class Config:
        populate_by_name = True


class ValidationContext(BaseModel):
    """How the AI should judge correctness"""
    check_exact_output: Optional[bool] = Field(default=True, alias="checkExactOutput", description="Check for exact output match")
    check_line_count: Optional[bool] = Field(default=False, alias="checkLineCount", description="Check line count instead of exact match")
    check_concepts: Optional[bool] = Field(default=True, alias="checkConcepts", description="Check for required concepts")
    disallow_hardcoded_output: Optional[bool] = Field(default=True, alias="disallowHardcodedOutput", description="Detect hardcoded solutions")
    allow_creativity: Optional[bool] = Field(default=False, alias="allowCreativity", description="Allow creative answers")
    forbidden_patterns: Optional[List[str]] = Field(default_factory=list, alias="forbiddenPatterns", description="Forbidden code patterns")
    
    class Config:
        populate_by_name = True


class CodeAnalysisRequest(BaseModel):
    """
    Enhanced request model for code analysis with rich context
    Supports both new context-rich format and legacy format
    """
    # Primary mission identifier
    mission_id: str = Field(..., alias="missionId", description="Mission identifier")
    
    # Optional AI model selection
    ai_model: Optional[str] = Field(None, alias="aiModel", description="AI model to use")
    
    # Rich context objects (new format)
    mission_context: Optional[MissionContext] = Field(None, alias="missionContext", description="Mission context data")
    student_context: Optional[StudentContext] = Field(None, alias="studentContext", description="Student context data")
    submission_context: Optional[SubmissionContext] = Field(None, alias="submissionContext", description="Submission context data")
    behavior_metrics: Optional[BehaviorMetrics] = Field(None, alias="behaviorMetrics", description="Behavior metrics")
    validation_context: Optional[ValidationContext] = Field(None, alias="validationContext", description="Validation context")
    
    # Legacy fields (for backward compatibility)
    code: Optional[str] = Field(None, description="[LEGACY] Python code to analyze")
    user_id: Optional[str] = Field(None, alias="userId", description="[LEGACY] User identifier")
    submission_id: Optional[str] = Field(None, alias="submissionId", description="[LEGACY] Submission identifier")
    test_cases: Optional[List[str]] = Field(None, alias="testCases", description="[LEGACY] Test cases")
    expected_output: Optional[str] = Field(None, alias="expectedOutput", description="[LEGACY] Expected output")
    concepts: Optional[List[str]] = Field(None, description="[LEGACY] Expected concepts")
    difficulty: Optional[int] = Field(None, ge=1, le=10, description="[LEGACY] Difficulty")
    attempts: Optional[int] = Field(None, ge=1, description="[LEGACY] Attempt count")
    time_spent: Optional[float] = Field(None, alias="timeSpent", description="[LEGACY] Time spent")
    validation_rules: Optional[Dict[str, Any]] = Field(None, alias="validationRules", description="[LEGACY] Validation rules")
    ai_checkpoints: Optional[bool] = Field(True, alias="aiCheckpoints", description="[LEGACY] Enable AI checkpoints")
    current_step: Optional[int] = Field(None, alias="currentStep", description="[LEGACY] Current step number")
    
    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "missionId": "M_STORY_001",
                "aiModel": "z-ai/glm-4.5-air",
                "missionContext": {
                    "title": "The Storyteller",
                    "description": "Print three lines to tell a short story.",
                    "objectives": ["Use print statements", "Structure output in multiple lines"],
                    "concepts": ["print", "strings", "sequence"],
                    "validationMode": "creative",
                    "expectedOutput": "Once upon a time...\nThere was a tiny dragon.\nIt loved to code.",
                    "expectedLineCount": 3,
                    "isStoryBased": True,
                    "difficulty": 2
                },
                "studentContext": {
                    "userId": "user_123",
                    "level": 3,
                    "xp": 450,
                    "weakSkills": ["loops"],
                    "strongSkills": ["print", "strings"],
                    "learningStyle": "hands-on",
                    "feedbackPreference": "short",
                    "aiTone": "friendly",
                    "attemptNumber": 2,
                    "timeSpent": 183
                },
                "submissionContext": {
                    "code": "print('There was an idea...')\nprint('to bring together')\nprint('a group of remarkable people.')",
                    "output": "There was an idea...\nto bring together\na group of remarkable people.",
                    "lineCount": 3
                },
                "validationContext": {
                    "checkExactOutput": False,
                    "checkLineCount": True,
                    "checkConcepts": True,
                    "allowCreativity": True
                }
            }
        }
    
    @validator('code', always=True)
    def ensure_code(cls, v, values):
        """Ensure code is provided either in new or legacy format"""
        if v:
            return v
        # Check both snake_case and camelCase variants (API uses camelCase, internal uses snake_case)
        submission_ctx = values.get('submission_context') or values.get('submissionContext')
        if submission_ctx:
            # If it's already a SubmissionContext object
            if hasattr(submission_ctx, 'code'):
                return submission_ctx.code
            # If it's still a dict (during parsing)
            if isinstance(submission_ctx, dict) and 'code' in submission_ctx:
                return submission_ctx['code']
        raise ValueError('Code must be provided in either submission_context or legacy code field')
    
    def get_code(self) -> str:
        """Get code from either new or legacy format"""
        if self.submission_context and self.submission_context.code:
            return self.submission_context.code
        return self.code or ""
    
    def get_user_id(self) -> str:
        """Get user ID from either new or legacy format"""
        if self.student_context and self.student_context.user_id:
            return self.student_context.user_id
        return self.user_id or ""
    
    def get_validation_mode(self) -> str:
        """Get validation mode from mission context"""
        if self.mission_context:
            return self.mission_context.validation_mode or "strict"
        return "strict"


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
