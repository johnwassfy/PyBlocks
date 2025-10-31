"""
Chatbot endpoint for kid-friendly coding help
Provides hints without giving solutions
"""
from fastapi import APIRouter, HTTPException, status, Depends
from app.models.chatbot_models import (
    ChatbotRequest,
    ChatbotResponse,
    GetPromptsResponse,
    PREDEFINED_PROMPTS,
    PromptCategory
)
from app.services.chatbot_service import chatbot
from app.services.backend_client import backend_client
from app.core.logger import logger
from app.core.security import verify_api_key
from typing import Dict, List


router = APIRouter(prefix="/chat", tags=["Chatbot"])


@router.get(
    "/prompts",
    response_model=GetPromptsResponse,
    summary="Get predefined prompts",
    description="Get all predefined kid-friendly prompts organized by category"
)
async def get_prompts(
    authenticated: bool = Depends(verify_api_key)
) -> GetPromptsResponse:
    """
    Get predefined prompts for easy selection
    
    Returns prompts organized by category:
    - stuck: When kids don't know what to do
    - error: When kids encounter errors
    - understanding: When kids want to learn
    - ideas: When kids need inspiration
    - explain: When kids want concept explanations
    - general: General questions
    """
    try:
        prompts_by_category = chatbot.get_predefined_prompts()
        return GetPromptsResponse(prompts=prompts_by_category)
    except Exception as e:
        logger.error(f"[CHAT] Error getting prompts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get prompts"
        )


@router.post(
    "",
    response_model=ChatbotResponse,
    summary="Chat with kid-friendly coding helper",
    description="Get hints and guidance without direct solutions",
    responses={
        200: {"description": "Response generated successfully"},
        400: {"description": "Invalid request"},
        401: {"description": "Missing API Key"},
        403: {"description": "Invalid API Key"},
        500: {"description": "Internal server error"}
    }
)
async def chat(
    request: ChatbotRequest,
    authenticated: bool = Depends(verify_api_key)
) -> ChatbotResponse:
    """
    Main chatbot endpoint for kid-friendly coding help
    
    This endpoint:
    1. Receives student's question (can be from predefined prompt)
    2. Analyzes code context and learning state
    3. Generates kid-friendly hint (NO SOLUTIONS!)
    4. Tracks difficulty patterns for learning state updates
    5. Returns encouraging guidance with next steps
    
    Key Features:
    - Uses simple, kid-friendly language
    - Never gives complete solutions
    - Provides hints that guide thinking
    - Analyzes questions to identify difficult concepts
    - Tracks help frequency for adaptive learning
    
    Example Request:
    ```json
    {
      "userId": "user123",
      "missionId": "mission456",
      "question": "I'm not sure how to begin!",
      "promptId": "stuck_1",
      "code": "# My code",
      "weakConcepts": ["loops"],
      "attemptNumber": 2
    }
    ```
    
    Example Response:
    ```json
    {
      "success": true,
      "response": "Great question! Let me help you get started... 🎯",
      "emoji": "🤖",
      "hint_type": "gentle",
      "next_steps": ["Start with the 'def' keyword", "Think about what your function should do"],
      "encouragement": "You're doing great! Keep going! 🌟",
      "difficulty_analysis": {
        "difficult_concepts": ["functions", "syntax"],
        "easy_concepts": [],
        "question_patterns": ["getting_stuck"],
        "help_frequency": "medium"
      }
    }
    ```
    """
    try:
        logger.info(
            f"[CHAT] Received question from user {request.user_id} "
            f"(mission: {request.mission_id}, attempt: {request.attempt_number})"
        )
        
        # Validate request
        if not request.question or not request.question.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Question cannot be empty"
            )
        
        # Generate response
        response = await chatbot.generate_response(request)
        
        # Log difficulty analysis for monitoring
        if response.difficulty_analysis:
            logger.info(
                f"[CHAT] Difficulty analysis for user {request.user_id}: "
                f"difficult={response.difficulty_analysis.difficult_concepts}, "
                f"help_frequency={response.difficulty_analysis.help_frequency}"
            )
        
        # If user has userId and submissionId, send update to backend
        # This updates their learning state based on their questions
        if request.user_id and request.submission_id and response.difficulty_analysis:
            try:
                await update_learning_state_from_chat(request, response)
            except Exception as update_error:
                # Don't fail the chat response if update fails
                logger.error(f"[CHAT] Failed to update learning state: {update_error}")
        
        logger.info(
            f"[CHAT] Generated {response.hint_type} hint for user {request.user_id}"
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[CHAT] Error processing chat request: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chat failed: {str(e)}"
        )


async def update_learning_state_from_chat(
    request: ChatbotRequest,
    response: ChatbotResponse
):
    """
    Update learning state based on chatbot interaction
    Sends difficulty analysis to backend
    """
    try:
        if not response.difficulty_analysis:
            return
        
        analysis = response.difficulty_analysis
        
        # Build analysis payload for backend
        # This tracks what concepts the student finds difficult based on their questions
        analysis_payload = {
            "detectedConcepts": analysis.difficult_concepts + analysis.easy_concepts,
            "weaknesses": analysis.difficult_concepts,
            "strengths": analysis.easy_concepts,
            "suggestions": response.next_steps,
            "conceptScores": {},  # Will be calculated by backend
            "isSuccessful": False,  # Chat questions indicate struggle
            "score": 0,  # No code execution, so no score
            "chatInteraction": True,  # Flag to indicate this is from chat
            "helpFrequency": analysis.help_frequency,
            "questionPatterns": analysis.question_patterns
        }
        
        # Calculate concept scores based on help frequency
        # High help frequency = lower scores for those concepts
        score_mapping = {
            "low": 75,    # Few questions = decent understanding
            "medium": 55, # Some questions = struggling a bit
            "high": 35    # Many questions = needs lots of help
        }
        base_score = score_mapping.get(analysis.help_frequency, 50)
        
        for concept in analysis.difficult_concepts:
            analysis_payload["conceptScores"][concept] = base_score - 10  # Lower for difficult
        
        for concept in analysis.easy_concepts:
            analysis_payload["conceptScores"][concept] = base_score + 15  # Higher for easy
        
        # Send to backend
        success = await backend_client.update_learning_state(
            user_id=request.user_id,
            submission_id=request.submission_id,
            analysis=analysis_payload
        )
        
        if success:
            logger.info(
                f"[CHAT] Updated learning state from chat interaction "
                f"(user: {request.user_id}, difficult: {analysis.difficult_concepts})"
            )
        
    except Exception as e:
        logger.error(f"[CHAT] Error updating learning state from chat: {e}")
        # Don't raise - this is a background operation


@router.post(
    "/analyze-conversation",
    summary="Analyze full conversation for learning insights",
    description="Analyze a complete conversation to extract learning patterns"
)
async def analyze_conversation(
    request: ChatbotRequest,
    authenticated: bool = Depends(verify_api_key)
):
    """
    Analyze a full conversation to understand learning patterns
    
    This is useful for:
    - End-of-session analysis
    - Identifying persistent struggles
    - Recommending next missions
    - Providing teacher insights
    """
    try:
        # Extract all responses from conversation history
        responses = []
        
        # Analyze each message pair
        for i in range(0, len(request.conversation_history), 2):
            if i + 1 < len(request.conversation_history):
                user_msg = request.conversation_history[i]
                assistant_msg = request.conversation_history[i + 1]
                
                # Create mini-request for analysis
                mini_request = ChatbotRequest(
                    user_id=request.user_id,
                    mission_id=request.mission_id,
                    submission_id=request.submission_id,
                    question=user_msg.content,
                    code=request.code,
                    error_message=request.error_message,
                    conversation_history=[],
                    weak_concepts=request.weak_concepts,
                    strong_concepts=request.strong_concepts,
                    attempt_number=request.attempt_number
                )
                
                # Generate analysis
                response = await chatbot.generate_response(mini_request)
                responses.append(response)
        
        # Create conversation summary
        summary = chatbot.create_conversation_summary(request, responses)
        
        logger.info(
            f"[CHAT] Conversation analysis: {summary.total_questions} questions, "
            f"quality={summary.conversation_quality}, "
            f"difficult={summary.difficult_concepts}"
        )
        
        return {
            "success": True,
            "summary": summary,
            "insights": {
                "needs_teacher_help": summary.conversation_quality == "struggling",
                "exploring_well": summary.conversation_quality == "exploring",
                "recommended_practice": summary.difficult_concepts[:3],
                "celebrate_progress": len(summary.easy_concepts) > 0
            }
        }
        
    except Exception as e:
        logger.error(f"[CHAT] Error analyzing conversation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
