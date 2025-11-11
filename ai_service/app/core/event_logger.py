"""
AI Event Logger for Thesis Research
Tracks all AI interactions, model usage, and performance metrics
"""
import os
import json
from datetime import datetime
from typing import Dict, Any, Optional
from app.core.logger import logger


class AIEventLogger:
    """
    Centralized event logging system for AI interactions
    Logs all events to JSON file for later analysis
    """
    
    def __init__(self, log_file: str = "data/ai_events.json"):
        self.log_file = log_file
        self.ensure_data_directory()
    
    def ensure_data_directory(self):
        """Create data directory if it doesn't exist"""
        os.makedirs("data", exist_ok=True)
    
    def log_event(
        self,
        event_type: str,
        model_name: str,
        user_id: str,
        mission_id: str,
        detail: Dict[str, Any],
        performance_metrics: Optional[Dict[str, Any]] = None
    ):
        """
        Log an AI event with comprehensive metadata
        
        Args:
            event_type: Type of event (hint_generated, feedback_generated, etc.)
            model_name: AI model used (e.g., "glm-4.5-air")
            user_id: User identifier
            mission_id: Mission identifier
            detail: Event-specific details
            performance_metrics: Optional performance metrics (latency, tokens, etc.)
        """
        event = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": event_type,
            "ai_model": model_name,
            "user_id": user_id,
            "mission_id": mission_id,
            "detail": detail,
            "performance": performance_metrics or {}
        }
        
        try:
            with open(self.log_file, "a", encoding="utf-8") as f:
                f.write(json.dumps(event, ensure_ascii=False) + "\n")
        except Exception as e:
            logger.error(f"Failed to log AI event: {e}")
    
    def log_hint_generated(
        self,
        model_name: str,
        user_id: str,
        mission_id: str,
        hint_text: str,
        hint_type: str,
        was_requested: bool,
        response_time_ms: float
    ):
        """Log when AI generates a hint"""
        self.log_event(
            event_type="hint_generated",
            model_name=model_name,
            user_id=user_id,
            mission_id=mission_id,
            detail={
                "hint_text": hint_text,
                "hint_type": hint_type,  # "proactive", "requested", "error-based"
                "was_requested": was_requested,
                "hint_length": len(hint_text)
            },
            performance_metrics={
                "response_time_ms": response_time_ms
            }
        )
    
    def log_feedback_generated(
        self,
        model_name: str,
        user_id: str,
        mission_id: str,
        feedback: str,
        score: float,
        success: bool,
        response_time_ms: float
    ):
        """Log when AI generates feedback"""
        self.log_event(
            event_type="feedback_generated",
            model_name=model_name,
            user_id=user_id,
            mission_id=mission_id,
            detail={
                "feedback_text": feedback,
                "score": score,
                "success": success,
                "feedback_length": len(feedback)
            },
            performance_metrics={
                "response_time_ms": response_time_ms
            }
        )
    
    def log_proactive_help(
        self,
        model_name: str,
        user_id: str,
        mission_id: str,
        trigger_reason: str,
        help_provided: str,
        response_time_ms: float
    ):
        """Log proactive AI intervention"""
        self.log_event(
            event_type="proactive_help",
            model_name=model_name,
            user_id=user_id,
            mission_id=mission_id,
            detail={
                "trigger": trigger_reason,  # "idle_time", "repeated_errors", "struggling_pattern"
                "help_text": help_provided,
                "help_length": len(help_provided)
            },
            performance_metrics={
                "response_time_ms": response_time_ms
            }
        )
    
    def log_chatbot_interaction(
        self,
        model_name: str,
        user_id: str,
        mission_id: str,
        user_message: str,
        ai_response: str,
        response_time_ms: float,
        context_used: bool
    ):
        """Log chatbot conversation"""
        self.log_event(
            event_type="chatbot_interaction",
            model_name=model_name,
            user_id=user_id,
            mission_id=mission_id,
            detail={
                "user_message": user_message,
                "ai_response": ai_response,
                "message_length": len(user_message),
                "response_length": len(ai_response),
                "context_aware": context_used
            },
            performance_metrics={
                "response_time_ms": response_time_ms
            }
        )
    
    def log_code_analysis(
        self,
        model_name: str,
        user_id: str,
        mission_id: str,
        code_length: int,
        detected_concepts: list,
        weak_concepts: list,
        strong_concepts: list,
        response_time_ms: float
    ):
        """Log code analysis results"""
        self.log_event(
            event_type="code_analysis",
            model_name=model_name,
            user_id=user_id,
            mission_id=mission_id,
            detail={
                "code_length": code_length,
                "detected_concepts": detected_concepts,
                "weak_concepts": weak_concepts,
                "strong_concepts": strong_concepts,
                "total_concepts": len(detected_concepts)
            },
            performance_metrics={
                "response_time_ms": response_time_ms
            }
        )
    
    def log_model_error(
        self,
        model_name: str,
        user_id: str,
        mission_id: str,
        error_type: str,
        error_message: str
    ):
        """Log AI model errors"""
        self.log_event(
            event_type="model_error",
            model_name=model_name,
            user_id=user_id,
            mission_id=mission_id,
            detail={
                "error_type": error_type,
                "error_message": error_message
            }
        )


# Global event logger instance
event_logger = AIEventLogger()
