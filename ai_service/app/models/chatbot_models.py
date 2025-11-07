"""
Chatbot request and response models
Kid-friendly chatbot with predefined prompts
"""
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict
from enum import Enum


class PromptCategory(str, Enum):
    """Predefined prompt categories for kids"""
    STUCK = "stuck"
    ERROR = "error"
    UNDERSTANDING = "understanding"
    IDEAS = "ideas"
    EXPLAIN = "explain"
    GENERAL = "general"


class PredefinedPrompt(BaseModel):
    """Predefined prompt options for kids"""
    id: str
    category: PromptCategory
    text: str
    kid_friendly_text: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "stuck_1",
                "category": "stuck",
                "text": "I don't know how to start",
                "kid_friendly_text": "😕 I'm not sure how to begin!"
            }
        }


# Predefined prompts for easy selection
PREDEFINED_PROMPTS: List[PredefinedPrompt] = [
    # STUCK - When kids don't know what to do
    PredefinedPrompt(
        id="stuck_1",
        category=PromptCategory.STUCK,
        text="I don't know how to start",
        kid_friendly_text="😕 I'm not sure how to begin!"
    ),
    PredefinedPrompt(
        id="stuck_2",
        category=PromptCategory.STUCK,
        text="I'm confused about what to do next",
        kid_friendly_text="🤔 What should I do next?"
    ),
    PredefinedPrompt(
        id="stuck_3",
        category=PromptCategory.STUCK,
        text="This is too hard for me",
        kid_friendly_text="😰 This feels really tricky!"
    ),
    PredefinedPrompt(
        id="stuck_4",
        category=PromptCategory.STUCK,
        text="I need a hint",
        kid_friendly_text="💡 Can I get a hint?"
    ),
    
    # ERROR - When kids get errors
    PredefinedPrompt(
        id="error_1",
        category=PromptCategory.ERROR,
        text="I got an error but don't understand it",
        kid_friendly_text="❌ My code shows an error - what does it mean?"
    ),
    PredefinedPrompt(
        id="error_2",
        category=PromptCategory.ERROR,
        text="Why isn't my code working?",
        kid_friendly_text="🐛 Why doesn't this work?"
    ),
    PredefinedPrompt(
        id="error_3",
        category=PromptCategory.ERROR,
        text="How do I fix this mistake?",
        kid_friendly_text="🔧 How can I fix this?"
    ),
    
    # UNDERSTANDING - When kids want to learn
    PredefinedPrompt(
        id="understand_1",
        category=PromptCategory.UNDERSTANDING,
        text="What does this code do?",
        kid_friendly_text="🤓 What does this part do?"
    ),
    PredefinedPrompt(
        id="understand_2",
        category=PromptCategory.UNDERSTANDING,
        text="Why do I need to use this?",
        kid_friendly_text="❓ Why do I need this?"
    ),
    PredefinedPrompt(
        id="understand_3",
        category=PromptCategory.UNDERSTANDING,
        text="Can you explain this differently?",
        kid_friendly_text="🗣️ Can you explain it another way?"
    ),
    
    # IDEAS - When kids need inspiration
    PredefinedPrompt(
        id="ideas_1",
        category=PromptCategory.IDEAS,
        text="Give me an example",
        kid_friendly_text="📝 Show me an example!"
    ),
    PredefinedPrompt(
        id="ideas_2",
        category=PromptCategory.IDEAS,
        text="What can I try?",
        kid_friendly_text="💭 What could I try?"
    ),
    PredefinedPrompt(
        id="ideas_3",
        category=PromptCategory.IDEAS,
        text="Is this the right way?",
        kid_friendly_text="✅ Am I on the right track?"
    ),
    
    # EXPLAIN - When kids want concept explanations
    PredefinedPrompt(
        id="explain_1",
        category=PromptCategory.EXPLAIN,
        text="What is a function?",
        kid_friendly_text="🎯 What's a function?"
    ),
    PredefinedPrompt(
        id="explain_2",
        category=PromptCategory.EXPLAIN,
        text="What is a loop?",
        kid_friendly_text="🔄 What's a loop?"
    ),
    PredefinedPrompt(
        id="explain_3",
        category=PromptCategory.EXPLAIN,
        text="What is a variable?",
        kid_friendly_text="📦 What's a variable?"
    ),
    
    # GENERAL - General questions
    PredefinedPrompt(
        id="general_1",
        category=PromptCategory.GENERAL,
        text="I have a question",
        kid_friendly_text="👋 I have a question!"
    ),
    PredefinedPrompt(
        id="general_2",
        category=PromptCategory.GENERAL,
        text="Can you help me?",
        kid_friendly_text="🙋 Can you help me?"
    ),
]


class ChatMessage(BaseModel):
    """Single chat message"""
    role: str = Field(..., description="'user' or 'assistant'")
    content: str = Field(..., description="Message content")
    timestamp: Optional[str] = Field(None, description="ISO timestamp")
    emoji: Optional[str] = Field(None, description="Emoji for the message")


class ChatbotRequest(BaseModel):
    """Request model for chatbot conversation"""
    user_id: str = Field(..., alias="userId", description="User identifier")
    mission_id: str = Field(..., alias="missionId", description="Current mission ID")
    submission_id: Optional[str] = Field(None, alias="submissionId", description="Current submission ID")
    
    # Question details
    question: str = Field(..., description="User's question (can be from predefined prompt)")
    prompt_id: Optional[str] = Field(None, alias="promptId", description="ID of predefined prompt used")
    
    # Code context
    code: Optional[str] = Field(None, description="Current code being worked on")
    error_message: Optional[str] = Field(None, alias="errorMessage", description="Current error if any")
    
    # Conversation history
    conversation_history: List[ChatMessage] = Field(
        default_factory=list,
        alias="conversationHistory",
        description="Previous messages in conversation"
    )
    
    # Learning context
    weak_concepts: Optional[List[str]] = Field(
        default_factory=list,
        alias="weakConcepts",
        description="User's weak concepts for personalization"
    )
    strong_concepts: Optional[List[str]] = Field(
        default_factory=list,
        alias="strongConcepts",
        description="User's strong concepts for personalization"
    )
    mastery_snapshot: Optional[Dict[str, int]] = Field(
        default=None,
        alias="masterySnapshot",
        description="Concept mastery scores (0-100)"
    )
    streak: Optional[int] = Field(
        default=None,
        description="Current learning streak"
    )
    level: Optional[int] = Field(
        default=None,
        description="Learner level for tone adjustments"
    )
    attempt_number: int = Field(default=1, alias="attemptNumber", ge=1, description="Attempt number")
    
    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "userId": "user123",
                "missionId": "mission456",
                "question": "I'm not sure how to begin!",
                "promptId": "stuck_1",
                "code": "# My code here",
                "conversationHistory": [
                    {
                        "role": "user",
                        "content": "Hi!",
                        "emoji": "👋"
                    }
                ],
                "weakConcepts": ["loops"],
                "strongConcepts": ["variables"],
                "masterySnapshot": {"loops": 40, "functions": 80},
                "streak": 3,
                "level": 2,
                "attemptNumber": 2
            }
        }


class DifficultyAnalysis(BaseModel):
    """Analysis of what concepts the user finds difficult"""
    difficult_concepts: List[str] = Field(..., description="Concepts user struggles with")
    easy_concepts: List[str] = Field(..., description="Concepts user finds easy")
    question_patterns: List[str] = Field(..., description="Types of questions asked")
    help_frequency: str = Field(..., description="How often help is requested: low, medium, high")


class ChatbotResponse(BaseModel):
    """Response model for chatbot"""
    success: bool = Field(default=True, description="Whether response was generated successfully")
    
    # Response content
    response: str = Field(..., description="Kid-friendly response (no solutions!)")
    emoji: str = Field(default="🤖", description="Emoji for the response")
    
    # Hints and guidance
    hint_type: str = Field(..., description="Type of hint: gentle, directional, conceptual")
    next_steps: List[str] = Field(default_factory=list, description="Suggested next steps")
    
    # Learning support
    related_concepts: List[str] = Field(default_factory=list, description="Related concepts to explore")
    encouragement: str = Field(..., description="Encouraging message")
    
    # Question analysis
    difficulty_analysis: Optional[DifficultyAnalysis] = Field(
        None,
        description="Analysis of difficulty patterns"
    )
    
    # Follow-up prompts
    suggested_prompts: List[PredefinedPrompt] = Field(
        default_factory=list,
        description="Suggested follow-up prompts"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "response": "Great question! Let me help you get started...",
                "emoji": "🤖",
                "hint_type": "gentle",
                "next_steps": [
                    "Think about what your function needs to do",
                    "Try writing the 'def' keyword first"
                ],
                "related_concepts": ["functions", "parameters"],
                "encouragement": "You're doing amazing! Keep going! 🌟",
                "suggested_prompts": []
            }
        }


class ConversationSummary(BaseModel):
    """Summary of a conversation for learning state updates"""
    user_id: str
    mission_id: str
    submission_id: Optional[str]
    total_questions: int
    difficult_concepts: List[str]
    easy_concepts: List[str]
    help_frequency: str
    conversation_quality: str  # "productive", "struggling", "exploring"
    key_issues: List[str]


class GetPromptsResponse(BaseModel):
    """Response for getting predefined prompts"""
    prompts: Dict[str, List[PredefinedPrompt]] = Field(
        ...,
        description="Prompts organized by category"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "prompts": {
                    "stuck": [
                        {
                            "id": "stuck_1",
                            "category": "stuck",
                            "text": "I don't know how to start",
                            "kid_friendly_text": "😕 I'm not sure how to begin!"
                        }
                    ]
                }
            }
        }
