"""
Observation endpoint for proactive AI hints
Analyzes user behavior and triggers interventions
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime
import difflib

from app.core.security import verify_api_key
from app.core.code_differentiator import RequestCodeExtractor
from app.services.chatbot_service import KidFriendlyChatbot
from app.models.chatbot_models import ChatbotRequest

router = APIRouter(prefix="", tags=["Observer"])

class BehaviorMetrics(BaseModel):
    """User behavior metrics for observation"""
    userId: str
    missionId: str
    sessionId: Optional[str] = None
    
    # Activity metrics
    idleTime: int  # seconds since last edit
    editsPerMinute: float
    consecutiveFailedRuns: int
    totalAttempts: int
    
    # Code quality signals
    codeSimilarity: float  # 0-1
    sameErrorCount: int
    lastErrorType: Optional[str] = None
    lastErrorMessage: Optional[str] = None
    
    # Behavioral signals
    cursorMovements: int
    hintDismissCount: int
    timeOnCurrentStep: int  # seconds
    
    # Context
    currentCode: str
    previousCode: Optional[str] = None
    weakConcepts: Optional[List[str]] = []
    strongConcepts: Optional[List[str]] = []
    masterySnapshot: Optional[Dict[str, float]] = None
    
    # Mission context for code differentiation
    missionContext: Optional[Dict] = None  # NEW: For identifying starter vs user code
    
    # State
    lastActivity: str  # ISO timestamp


class DetailedAnalysis(BaseModel):
    """Detailed behavioral analysis"""
    is_stuck: bool
    is_idle: bool
    is_repeating: bool
    is_frustrated: bool
    confidence_level: float  # 0-1
    struggling_concepts: List[str]
    recommendation: str


class ObservationResponse(BaseModel):
    """AI observation response"""
    intervention: bool
    intervention_type: Optional[str] = Field(None, alias="interventionType")
    message: Optional[str] = None
    hint_trigger: Optional[str] = Field(None, alias="hintTrigger")
    severity: str = "low"
    suggested_action: Optional[str] = Field(None, alias="suggestedAction")
    detailed_analysis: Optional[DetailedAnalysis] = Field(None, alias="detailedAnalysis")
    context_for_chatbot: Optional[Dict] = Field(None, alias="contextForChatbot")  # NEW: Full context for chatbot
    
    class Config:
        populate_by_name = True  # Allow both snake_case and camelCase


def calculate_code_similarity(code1: str, code2: str) -> float:
    """Calculate similarity between two code snippets"""
    if not code1 or not code2:
        return 0.0
    
    sequence = difflib.SequenceMatcher(None, code1, code2)
    return sequence.ratio()


def analyze_behavior(metrics: BehaviorMetrics) -> DetailedAnalysis:
    """
    Analyze user behavior and determine if intervention is needed
    """
    is_stuck = False
    is_idle = False
    is_repeating = False
    is_frustrated = False
    confidence_level = 0.5
    struggling_concepts = []
    recommendation = "Continue exploring!"
    
    # Check for stuck patterns
    if metrics.consecutiveFailedRuns >= 3 and metrics.codeSimilarity > 0.9:
        is_stuck = True
        is_repeating = True
        recommendation = "Try a different approach"
        confidence_level = 0.9
        
    # Check for idle behavior
    if metrics.idleTime > 60:
        is_idle = True
        recommendation = "Take your time thinking"
        confidence_level = 0.7
        
    # Check for frustration signals
    if metrics.hintDismissCount > 2 and metrics.consecutiveFailedRuns > 3:
        is_frustrated = True
        recommendation = "Take a short break"
        confidence_level = 0.8
        
    # Same error repeating
    if metrics.sameErrorCount >= 3:
        is_stuck = True
        struggling_concepts.append(metrics.lastErrorType or "syntax")
        recommendation = "Focus on understanding the error message"
        confidence_level = 0.85
        
    # Low activity but no progress
    if metrics.cursorMovements > 10 and metrics.totalAttempts == 0:
        is_stuck = True
        recommendation = "Try running your code to see what happens"
        confidence_level = 0.75
        
    # Add weak concepts to struggling list
    if metrics.weakConcepts:
        struggling_concepts.extend(metrics.weakConcepts[:3])
    
    return DetailedAnalysis(
        is_stuck=is_stuck,
        is_idle=is_idle,
        is_repeating=is_repeating,
        is_frustrated=is_frustrated,
        confidence_level=confidence_level,
        struggling_concepts=list(set(struggling_concepts)),
        recommendation=recommendation
    )


async def generate_proactive_message(
    metrics: BehaviorMetrics,
    analysis: DetailedAnalysis,
    chatbot: KidFriendlyChatbot,
    mission_context: Optional[Dict] = None,  # NEW: For code differentiation
) -> str:
    """
    Generate a proactive, kid-friendly intervention message using AI
    This should be VERY specific to what the student is struggling with
    """
    
    # 🔑 DIFFERENTIATE USER CODE FROM STARTER CODE
    user_code = metrics.currentCode
    user_line_numbers = None
    has_starter_code = False
    
    if mission_context:
        try:
            code_analysis = RequestCodeExtractor.process_request(
                {
                    'mission_context': mission_context,
                    'activity': {'codeSnapshot': metrics.currentCode}
                },
                service_type='behavior'
            )
            user_code = code_analysis.get('user_code', metrics.currentCode)
            user_line_numbers = code_analysis.get('user_line_numbers', [])
            has_starter_code = code_analysis.get('has_starter_code', False)
        except Exception as e:
            pass  # Fallback to full code if differentiation fails
    
    # Determine the specific struggle
    struggle_type = "general"
    if metrics.lastErrorType:
        if "Syntax" in metrics.lastErrorType:
            struggle_type = "syntax"
        elif "Name" in metrics.lastErrorType or "Undefined" in metrics.lastErrorType:
            struggle_type = "variable"
        elif "Type" in metrics.lastErrorType:
            struggle_type = "type"
        elif "Index" in metrics.lastErrorType:
            struggle_type = "indexing"
        elif "Math" in metrics.lastErrorType or "Division" in metrics.lastErrorType:
            struggle_type = "math"
        elif "Logic" in metrics.lastErrorType or "Condition" in metrics.lastErrorType:
            struggle_type = "logic"
    
    # Check if struggling with specific concepts
    concept_struggles = []
    if metrics.weakConcepts:
        if "loops" in str(metrics.weakConcepts).lower() or "iteration" in str(metrics.weakConcepts).lower():
            concept_struggles.append("loops")
        if "condition" in str(metrics.weakConcepts).lower() or "if" in str(metrics.weakConcepts).lower():
            concept_struggles.append("conditionals")
        if "function" in str(metrics.weakConcepts).lower():
            concept_struggles.append("functions")
        if "list" in str(metrics.weakConcepts).lower() or "array" in str(metrics.weakConcepts).lower():
            concept_struggles.append("lists")
        if "math" in str(metrics.weakConcepts).lower() or "arithmetic" in str(metrics.weakConcepts).lower():
            concept_struggles.append("math")
    
    starter_code_note = ""
    if has_starter_code and user_line_numbers:
        starter_code_note = f"⚠️ NOTE: Code has starter template. Focus on USER LINES {user_line_numbers} only."
    
    context = f"""
You are a supportive Python tutor detecting when a student needs help. Generate ONE specific, actionable hint.

{starter_code_note}

**ANALYSIS OF STUDENT'S SITUATION:**
- Stuck/Repeating same code: {analysis.is_stuck}
- Idle time: {metrics.idleTime}s (been thinking without coding)
- Failed runs: {metrics.consecutiveFailedRuns} in a row
- Same error repeated: {metrics.sameErrorCount} times
- Code similarity to last attempt: {metrics.codeSimilarity:.0%}

**WHAT THEY'RE STRUGGLING WITH:**
- Error type: {metrics.lastErrorType or 'No error yet - just stuck'}
- Error message: {metrics.lastErrorMessage or 'None'}
- Difficulty category: {struggle_type}
- Weak concepts: {', '.join(concept_struggles[:3]) if concept_struggles else 'Not yet identified'}
- Learning gaps: {', '.join(metrics.weakConcepts[:3]) if metrics.weakConcepts else 'None'}

**THEIR USER-WRITTEN CODE (last 200 chars):**
```python
{user_code[-200:] if len(user_code) > 200 else user_code}
```

**YOUR TASK:**
Write ONE SHORT message (max 2 sentences, ~100 chars) that:
1. Shows you understand their SPECIFIC problem (mention the concept/error/code pattern)
2. Offers concrete help (not generic encouragement)
3. Uses a relevant emoji
4. Makes them want to click for help

**GOOD EXAMPLES:**
✅ "I see you keep getting 'NameError' with that variable! Want help making sure it's defined first? 🔧"
✅ "Your loop looks close but line 3 needs a small fix! Should I show you what's missing? 🔄"
✅ "You've been staring at this for a while! Want me to break it into smaller steps? 🧩"
✅ "That 'range' spelling is tricky - want to see what's wrong? 🎯"

**BAD EXAMPLES (too vague):**
❌ "Need some help?" (doesn't show understanding)
❌ "Looks like you're stuck!" (obvious, not helpful)
❌ "Want a hint?" (too generic)

Generate the message now (ONLY the message, no explanation):
"""
    
    try:
        # Create ChatbotRequest object
        chatbot_request = ChatbotRequest(
            question=context,  # Fixed: use 'question' instead of 'message'
            userId=metrics.userId,
            missionId=metrics.missionId,
            code=metrics.currentCode,  # Fixed: use 'code' instead of 'userCode'
            weakConcepts=metrics.weakConcepts or [],
            strongConcepts=metrics.strongConcepts or [],
            # Note: removed 'context' parameter as it's not in the ChatbotRequest model
        )
        
        response = await chatbot.generate_response(chatbot_request)
        message = response.response  # Get the response text
        
        # Ensure it's short (max 200 chars for the popup)
        if len(message) > 200:
            # Try to cut at sentence boundary
            sentences = message.split('.')
            message = sentences[0] + '.' if sentences else message[:200]
        
        return message
    except Exception as e:
        print(f"Error generating proactive message: {e}")
        
        # Contextual fallback messages based on analysis
        if analysis.is_idle and metrics.idleTime > 90:
            return "You've been thinking for a while! Want me to break down this problem into smaller steps? 🧩"
        elif analysis.is_repeating and metrics.sameErrorCount >= 3:
            return f"I see you keep getting the same '{metrics.lastErrorType}' error! Want help fixing it? 🔧"
        elif struggle_type == "syntax":
            return "Syntax can be tricky! Want me to show you the correct way to write this? ✏️"
        elif struggle_type == "loops" or "loops" in concept_struggles:
            return "Loops are confusing you a bit! Want a hint about how to make them work? 🔄"
        elif struggle_type == "math" or "math" in concept_struggles:
            return "Math operations are tricky! Should I explain how these numbers work? ➕"
        elif struggle_type == "logic" or "conditionals" in concept_struggles:
            return "Conditions (if/else) can be tough! Want me to explain when to use them? 🤔"
        elif analysis.is_frustrated:
            return "This is challenging! Want to try a different approach together? 🌟"
        else:
            return "Looks like you might be stuck! Want a helpful hint? 💡"


@router.post("/observe", response_model=ObservationResponse)
async def observe_user_behavior(
    metrics: BehaviorMetrics,
    api_key: str = Depends(verify_api_key)
):
    """
    Observe user behavior and determine if proactive intervention is needed
    """
    try:
        # Analyze behavior patterns
        analysis = analyze_behavior(metrics)
        
        # Determine if intervention is needed
        should_intervene = False
        intervention_type = None
        hint_trigger = None
        severity = "low"
        
        # Stuck pattern - HIGH priority
        if analysis.is_stuck and analysis.confidence_level >= 0.8:
            should_intervene = True
            intervention_type = "hint"
            hint_trigger = "stuck-repeating"
            severity = "high"
            
        # Idle too long - MEDIUM priority
        elif analysis.is_idle and metrics.idleTime > 90:
            should_intervene = True
            intervention_type = "encouragement"
            hint_trigger = "idle"
            severity = "medium"
            
        # Frustrated pattern - HIGH priority
        elif analysis.is_frustrated:
            should_intervene = True
            intervention_type = "encouragement"
            hint_trigger = "frustration"
            severity = "high"
            
        # Same error repeating - MEDIUM priority
        elif metrics.sameErrorCount >= 3:
            should_intervene = True
            intervention_type = "hint"
            hint_trigger = "same-error"
            severity = "medium"
        
        # Generate proactive message if intervention needed
        message = None
        suggested_action = None
        context_for_chatbot = None
        
        if should_intervene:
            # Initialize chatbot for message generation
            chatbot = KidFriendlyChatbot()
            message = await generate_proactive_message(
                metrics, 
                analysis, 
                chatbot,
                mission_context=metrics.missionContext  # NEW: Pass mission context
            )
            suggested_action = analysis.recommendation
            
            # Package full context for chatbot to use when user accepts help
            context_for_chatbot = {
                "metrics": metrics.dict(),
                "analysis": analysis.dict(),
                "interventionType": intervention_type,
                "hintTrigger": hint_trigger,
                "severity": severity,
                "suggestedAction": suggested_action,
                "timestamp": datetime.now().isoformat(),
                # Include specific problem details
                "problemContext": {
                    "errorType": metrics.lastErrorType,
                    "errorMessage": metrics.lastErrorMessage,
                    "codeSnapshot": metrics.currentCode,
                    "weakConcepts": metrics.weakConcepts,
                    "strongConcepts": metrics.strongConcepts,
                    "strugglingWith": analysis.struggling_concepts,
                }
            }
        
        return ObservationResponse(
            intervention=should_intervene,
            intervention_type=intervention_type,
            message=message,
            hint_trigger=hint_trigger,
            severity=severity,
            suggested_action=suggested_action,
            detailed_analysis=analysis,
            context_for_chatbot=context_for_chatbot  # NEW: Full context
        )
        
    except Exception as e:
        print(f"Error in observe_user_behavior: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class InterventionFeedback(BaseModel):
    """Record user response to intervention"""
    userId: str
    missionId: str
    interventionType: str
    accepted: bool
    hintTrigger: Optional[str] = None
    timestamp: str


@router.post("/intervention-feedback")
async def record_intervention_feedback(
    feedback: InterventionFeedback,
    api_key: str = Depends(verify_api_key)
):
    """
    Record whether user accepted or dismissed the intervention
    This data can be used to improve the observation algorithm
    """
    try:
        # TODO: Store in database for analysis
        # For now, just log it
        print(f"[Intervention Feedback] User {feedback.userId} "
              f"{'accepted' if feedback.accepted else 'dismissed'} "
              f"{feedback.interventionType} hint (trigger: {feedback.hintTrigger})")
        
        return {
            "success": True,
            "message": "Feedback recorded"
        }
    except Exception as e:
        print(f"Error recording intervention feedback: {e}")
        raise HTTPException(status_code=500, detail=str(e))
