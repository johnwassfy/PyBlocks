"""
PyBlocks AI Observer Service
A lightweight FastAPI service that observes student coding behavior,
logs events, and provides adaptive feedback.

This is the core of the adaptive learning system.
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import time
import json
from datetime import datetime

app = FastAPI(title="PyBlocks AI Observer", version="1.0.0")

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory event log (will be saved to JSON file)
event_log = []
EVENT_LOG_FILE = "student_events.json"


class StudentEvent(BaseModel):
    """Data model for student coding events"""
    mission_id: str
    user_id: str
    code: str
    output: str
    attempts: int
    errors: Optional[List[str]] = []
    time_spent: Optional[int] = 0  # seconds


class FeedbackResponse(BaseModel):
    """AI feedback response"""
    feedback: str
    status: str
    encouragement: Optional[str] = None
    hint: Optional[str] = None
    concepts_detected: List[str] = []


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "PyBlocks AI Observer",
        "status": "running",
        "events_logged": len(event_log)
    }


@app.post("/observe", response_model=FeedbackResponse)
async def observe(event: StudentEvent):
    """
    Main endpoint: Observe student activity and provide feedback
    
    This simulates AI analysis by detecting patterns in code and output.
    Later, this can be extended with actual ML/LLM models.
    """
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Create event log entry
    log_entry = {
        "timestamp": timestamp,
        "user_id": event.user_id,
        "mission_id": event.mission_id,
        "code": event.code,
        "output": event.output,
        "attempts": event.attempts,
        "errors": event.errors,
        "time_spent": event.time_spent
    }
    
    # Store in memory
    event_log.append(log_entry)
    
    # Save to file periodically
    save_events_to_file()
    
    # Analyze and generate feedback
    feedback = analyze_student_code(event)
    
    return feedback


def analyze_student_code(event: StudentEvent) -> FeedbackResponse:
    """
    Simple rule-based analysis of student code.
    
    Mission M001: "Say Hello 5 Times"
    - Expected: Use a loop (for/while)
    - Expected output: 5 lines of "Hello"
    """
    code = event.code.lower()
    output = event.output
    attempts = event.attempts
    
    feedback = ""
    encouragement = ""
    hint = ""
    concepts_detected = []
    
    # Detect programming concepts used
    if "for" in code:
        concepts_detected.append("for-loop")
    if "while" in code:
        concepts_detected.append("while-loop")
    if "print" in code:
        concepts_detected.append("print")
    if "range" in code:
        concepts_detected.append("range")
    
    # Check if output matches expected (5 "Hello"s)
    expected_output = "Hello\nHello\nHello\nHello\nHello"
    
    if output.strip() == expected_output.strip():
        # SUCCESS!
        feedback = "🎉 Perfect! You completed the mission successfully!"
        encouragement = "Great job! You understand how loops work!"
        return FeedbackResponse(
            feedback=feedback,
            encouragement=encouragement,
            status="success",
            concepts_detected=concepts_detected
        )
    
    # Provide specific feedback based on what's missing
    if not concepts_detected:
        feedback = "💡 Hmm, I don't see any code yet. Try dragging some blocks!"
        hint = "Look for the 'repeat' or 'print' blocks in the toolbox."
    elif "for-loop" not in concepts_detected and "while-loop" not in concepts_detected:
        feedback = "🔄 You need to use a loop to repeat actions!"
        hint = "Try using a 'repeat' block or a 'for' loop to print 'Hello' multiple times."
    elif "print" not in concepts_detected:
        feedback = "📢 You have a loop, but you need to print something!"
        hint = "Add a 'print' block inside your loop."
    elif "Hello" not in output:
        feedback = "🤔 You're printing something, but not 'Hello'."
        hint = "Make sure you're printing exactly the word 'Hello'."
    elif output.count("Hello") != 5:
        count = output.count("Hello")
        feedback = f"📊 You printed 'Hello' {count} times, but we need exactly 5!"
        hint = "Check your loop counter. For 5 repetitions, try range(5)."
    else:
        feedback = "🎯 You're very close! Check your output format."
        hint = "Make sure each 'Hello' is on its own line."
    
    # Add encouragement based on attempt number
    if attempts == 1:
        encouragement = "💪 Good first try! Keep going!"
    elif attempts <= 3:
        encouragement = "🌟 You're making progress! Try again!"
    elif attempts <= 5:
        encouragement = "🎯 Don't give up! You're learning!"
    else:
        encouragement = "🚀 Keep trying! Every attempt teaches you something!"
    
    return FeedbackResponse(
        feedback=feedback,
        encouragement=encouragement,
        hint=hint,
        status="needs_improvement",
        concepts_detected=concepts_detected
    )


def save_events_to_file():
    """Save event log to JSON file for later analysis"""
    try:
        with open(EVENT_LOG_FILE, 'w') as f:
            json.dump(event_log, f, indent=2)
    except Exception as e:
        print(f"Error saving events: {e}")


@app.get("/analytics")
async def get_analytics():
    """
    Get basic analytics about student behavior.
    Useful for demonstrating the AI's observation capabilities.
    """
    if not event_log:
        return {"message": "No events logged yet"}
    
    total_events = len(event_log)
    total_attempts = sum(e.get("attempts", 0) for e in event_log)
    avg_attempts = total_attempts / total_events if total_events > 0 else 0
    
    # Count successful completions (this is simplified)
    successful = sum(1 for e in event_log if "Hello\nHello\nHello\nHello\nHello" in e.get("output", ""))
    
    return {
        "total_events": total_events,
        "total_attempts": total_attempts,
        "average_attempts_per_session": round(avg_attempts, 2),
        "successful_completions": successful,
        "success_rate": f"{(successful/total_events*100):.1f}%" if total_events > 0 else "0%"
    }


@app.get("/events")
async def get_events(limit: int = 10):
    """Get recent events (for debugging/demo purposes)"""
    return {
        "total_events": len(event_log),
        "recent_events": event_log[-limit:] if event_log else []
    }


if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting PyBlocks AI Observer Service...")
    print("📊 Open http://localhost:8000/docs for API documentation")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
