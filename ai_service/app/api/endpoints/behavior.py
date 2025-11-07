"""
Behavior analysis endpoint for live AI observation
Analyzes student coding behavior in real-time to provide proactive hints
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from app.core.security import verify_api_key
from app.core.logger import logger
import os

router = APIRouter(prefix="/behavior", tags=["Behavior Analysis"])


class BehaviorActivity(BaseModel):
    """Activity metrics from student coding session"""
    blocksCreated: int = Field(default=0, description="Number of blocks created")
    blocksDeleted: int = Field(default=0, description="Number of blocks deleted")
    blocksModified: int = Field(default=0, description="Number of blocks modified")
    idleTime: int = Field(default=0, description="Seconds since last edit")
    totalEdits: int = Field(default=0, description="Total edit count")
    errorCount: int = Field(default=0, description="Number of errors encountered")
    lastError: Optional[str] = Field(None, description="Last error message")
    codeSnapshot: str = Field(default="", description="Current code state")
    concepts: List[str] = Field(default_factory=list, description="Mission concepts")
    difficulty: str = Field(default="easy", description="Mission difficulty")


class BehaviorSummary(BaseModel):
    """Complete behavior summary for analysis"""
    userId: str = Field(..., description="User identifier")
    missionId: str = Field(..., description="Mission identifier")
    step: int = Field(default=0, description="Current step number")
    activity: BehaviorActivity


class BehaviorHintResponse(BaseModel):
    """Response with AI-generated hint"""
    hint: Optional[str] = Field(None, description="Live hint for the student")
    type: str = Field(default="encouragement", description="Hint type: encouragement, suggestion, warning")
    priority: str = Field(default="low", description="Priority: low, medium, high")


def _detect_behavior_pattern(activity: BehaviorActivity) -> str:
    """
    Detect behavioral patterns from activity metrics
    Returns pattern type: idle, confused, frustrated, confident, etc.
    """
    # Idle pattern: No activity for a while
    if activity.idleTime > 20 and activity.totalEdits == 0:
        return "idle_stuck"
    
    # Confusion pattern: Many edits with deletions
    if activity.blocksDeleted > activity.blocksCreated and activity.totalEdits > 5:
        return "confused_trial_error"
    
    # Frustration pattern: Repeated errors
    if activity.errorCount >= 3:
        return "frustrated_errors"
    
    # Active learning pattern: Steady progress
    if activity.totalEdits > 3 and activity.blocksDeleted < activity.blocksCreated:
        return "confident_progress"
    
    # Rapid changes: Experimenting
    if activity.totalEdits > 8 and activity.idleTime < 10:
        return "experimenting_rapid"
    
    return "normal"


def _generate_hint_prompt(pattern: str, activity: BehaviorActivity, mission_concepts: List[str]) -> str:
    """
    Generate prompt for AI to create context-aware hint
    """
    base_context = f"""
You are a friendly AI coding companion for kids learning Python. 
The student is working on a mission about: {', '.join(mission_concepts) if mission_concepts else 'basic coding'}.
Difficulty level: {activity.difficulty}

Current code snapshot:
```python
{activity.codeSnapshot[:500]}  # Limited to first 500 chars
```

Behavioral pattern detected: {pattern}
"""

    pattern_prompts = {
        "idle_stuck": f"""
The student has been idle for {activity.idleTime} seconds with no code changes.
They might be stuck or confused about what to do next.

Generate a SHORT, ENCOURAGING hint (1-2 sentences max) that:
- Gently asks if they need help
- Suggests looking at the mission objectives
- Keeps it friendly and non-judgmental
- Uses emojis to be kid-friendly 🌟
""",
        "confused_trial_error": f"""
The student is creating and deleting many blocks ({activity.blocksCreated} created, {activity.blocksDeleted} deleted).
This suggests they're experimenting but might not understand the concept.

Generate a SHORT hint that:
- Acknowledges experimentation is good
- Gently guides toward the right concept
- Asks if they want to see an example
- Uses encouraging language 💡
""",
        "frustrated_errors": f"""
The student has encountered {activity.errorCount} errors.
Last error: {activity.lastError or 'Unknown'}

They might be frustrated. Generate a SHORT, SUPPORTIVE hint that:
- Acknowledges their effort
- Normalizes making mistakes
- Offers specific help with the error
- Encourages them to take a breath 🌈
""",
        "confident_progress": """
The student is making good progress! Generate a SHORT encouragement (1 sentence) that:
- Celebrates their progress
- Keeps them motivated
- Uses positive emojis ✨
""",
        "experimenting_rapid": """
The student is rapidly changing code, experimenting actively.
Generate a SHORT hint that:
- Encourages their exploration
- Reminds them to test their code
- Keeps it brief and positive 🚀
""",
        "normal": """
The student is working normally. Only generate a hint if the code shows obvious issues.
If code looks okay, return EXACTLY: "NO_HINT"
"""
    }

    return base_context + pattern_prompts.get(pattern, pattern_prompts["normal"])


async def _call_openai_for_hint(prompt: str) -> Optional[str]:
    """
    Call OpenAI/OpenRouter to generate contextual hint
    """
    try:
        # Use OpenRouter API (compatible with OpenAI client v1.x)
        from openai import OpenAI
        
        logger.info("🌐 [OPENROUTER] Connecting to OpenRouter API...")
        
        client = OpenAI(
            api_key=os.getenv("OPENROUTER_API_KEY", ""),
            base_url="https://openrouter.ai/api/v1"
        )
        
        logger.info("📤 [OPENROUTER] Sending request to gpt-3.5-turbo...")
        
        response = client.chat.completions.create(
            model="openai/gpt-3.5-turbo",  # Fast model for real-time hints
            messages=[
                {"role": "system", "content": "You are a friendly AI coding tutor for kids. Keep responses SHORT (1-2 sentences), encouraging, and use emojis."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=100,  # Keep hints concise
            temperature=0.7,
        )
        
        hint = response.choices[0].message.content.strip()
        
        logger.info(f"📥 [OPENROUTER] Received response: \"{hint[:100]}...\"")
        
        # Don't return hint if AI said no hint needed
        if "NO_HINT" in hint:
            logger.info("⚠️ [OPENROUTER] AI returned NO_HINT signal")
            return None
            
        logger.info(f"✅ [OPENROUTER] Successfully generated hint")
        return hint
    
    except Exception as e:
        logger.error(f"❌ [OPENROUTER] Hint generation failed: {e}", exc_info=True)
        # Return fallback hints based on pattern
        return None


@router.post(
    "/analyze",
    response_model=BehaviorHintResponse,
    summary="Analyze student behavior for live hints",
    description="Receive coding behavior metrics and return proactive AI hints"
)
async def analyze_behavior(
    summary: BehaviorSummary,
    authenticated: bool = Depends(verify_api_key)
) -> BehaviorHintResponse:
    """
    Analyze student coding behavior in real-time
    
    This endpoint:
    1. Receives behavioral metrics (edits, idle time, errors)
    2. Detects patterns (stuck, confused, frustrated, confident)
    3. Generates contextual hints using AI
    4. Returns proactive guidance
    
    Called periodically (every 5-10 seconds) from frontend
    """
    
    try:
        # Log incoming request
        logger.info("=" * 60)
        logger.info(f"🧠 [BEHAVIOR ANALYSIS] Request from user: {summary.userId}")
        logger.info(f"   Mission: {summary.missionId}, Step: {summary.step}")
        logger.info(f"   Activity Summary:")
        logger.info(f"     - Blocks Created: {summary.activity.blocksCreated}")
        logger.info(f"     - Blocks Deleted: {summary.activity.blocksDeleted}")
        logger.info(f"     - Blocks Modified: {summary.activity.blocksModified}")
        logger.info(f"     - Total Edits: {summary.activity.totalEdits}")
        logger.info(f"     - Idle Time: {summary.activity.idleTime}s")
        logger.info(f"     - Error Count: {summary.activity.errorCount}")
        if summary.activity.lastError:
            logger.info(f"     - Last Error: {summary.activity.lastError[:100]}")
        logger.info(f"   Code Length: {len(summary.activity.codeSnapshot)} chars")
        logger.info(f"   Concepts: {', '.join(summary.activity.concepts)}")
        
        # Detect behavioral pattern
        pattern = _detect_behavior_pattern(summary.activity)
        
        logger.info(f"🎯 [PATTERN DETECTED] {pattern.upper()}")
        
        # Don't generate hints for normal behavior
        if pattern == "normal" and summary.activity.totalEdits < 10:
            logger.info(f"✅ [NO HINT] Normal behavior, no intervention needed")
            return BehaviorHintResponse(
                hint=None,
                type="none",
                priority="low"
            )
        
        # Generate AI hint
        logger.info(f"🤖 [AI GENERATION] Generating hint for pattern: {pattern}")
        prompt = _generate_hint_prompt(pattern, summary.activity, summary.activity.concepts)
        logger.info(f"📝 [PROMPT] Sending prompt to OpenAI (length: {len(prompt)} chars)")
        
        hint = await _call_openai_for_hint(prompt)
        
        if hint:
            logger.info(f"💡 [HINT GENERATED] \"{hint}\"")
        else:
            logger.info(f"⚠️ [NO HINT] AI returned no hint")
        
        # Determine priority based on pattern
        priority_map = {
            "frustrated_errors": "high",
            "idle_stuck": "medium",
            "confused_trial_error": "medium",
            "confident_progress": "low",
            "experimenting_rapid": "low",
            "normal": "low"
        }
        
        # Determine hint type
        type_map = {
            "frustrated_errors": "support",
            "idle_stuck": "encouragement",
            "confused_trial_error": "suggestion",
            "confident_progress": "praise",
            "experimenting_rapid": "encouragement",
            "normal": "none"
        }
        
        response = BehaviorHintResponse(
            hint=hint,
            type=type_map.get(pattern, "encouragement"),
            priority=priority_map.get(pattern, "low")
        )
        
        logger.info(f"✅ [RESPONSE] Type: {response.type}, Priority: {response.priority}")
        logger.info("=" * 60)
        
        return response
    
    except Exception as e:
        logger.error(f"❌ [ERROR] Behavior analysis error: {e}", exc_info=True)
        # Return empty response on error (non-critical feature)
        return BehaviorHintResponse(
            hint=None,
            type="none",
            priority="low"
        )
