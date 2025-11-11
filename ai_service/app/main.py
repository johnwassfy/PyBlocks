"""
PyBlocks AI Service - Main Application
Production-ready FastAPI service for code analysis and adaptive learning
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
import time
from pathlib import Path

# Legacy endpoint imports
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import json
import io
import ast
import threading
import sys
import re
from contextlib import redirect_stdout, redirect_stderr
from datetime import datetime

from app.core.config import settings
from app.core.logger import logger
from app.api.router import api_router


# Create necessary directories
Path("logs").mkdir(exist_ok=True)
Path("data").mkdir(exist_ok=True)

# In-memory event log for legacy /observe endpoint
event_log = []
EVENT_LOG_FILE = "data/student_events.json"

# Load existing events if file exists
try:
    if Path(EVENT_LOG_FILE).exists():
        with open(EVENT_LOG_FILE, 'r') as f:
            event_log = json.load(f)
        logger.info(f"[STARTUP] Loaded {len(event_log)} existing events from {EVENT_LOG_FILE}")
except Exception as e:
    logger.warning(f"[STARTUP] Could not load existing events: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifecycle manager for the application
    Handles startup and shutdown events
    """
    # Startup
    logger.info(f"[STARTUP] Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"[STARTUP] Environment: {settings.ENVIRONMENT}")
    logger.info(f"[STARTUP] AI Provider: {settings.AI_MODEL_PROVIDER}")
    logger.info(f"[STARTUP] Sandboxing: {'Enabled' if settings.ENABLE_SANDBOXING else 'Disabled'}")
    logger.info(f"[STARTUP] Code Timeout: {settings.CODE_TIMEOUT}s")
    
    # Initialize services
    from app.services.code_executor import executor
    from app.services.feedback_engine import feedback_engine
    from app.services.recommender import recommender
    
    logger.info("[STARTUP] All services initialized successfully")
    
    yield  # Application runs here
    
    # Shutdown
    logger.info("[SHUTDOWN] Shutting down AI service...")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
    ## PyBlocks AI Service
    
    **Intelligent code analysis and adaptive learning system**
    
    ### Features:
    - 🔒 **Secure Code Execution**: Sandboxed Python code execution with timeout protection
    - 🧠 **AI-Powered Feedback**: Intelligent analysis and personalized feedback
    - 💡 **Smart Hints**: Context-aware hints that adapt to student progress
    - 🎯 **Adaptive Recommendations**: Personalized mission suggestions based on learning patterns
    - ⚡ **High Performance**: Fast analysis with caching and optimization
    
    ### Endpoints:
    - `/health` - Service health and status
    - `/analyze` - Comprehensive code analysis
    - `/hint` - Get coding hints
    - `/recommend` - Get mission recommendations
    
    ### Integration:
    This service integrates seamlessly with the NestJS backend via the `ai-connector` module.
    
    ### 🔥 AI Model Integration:
    To integrate your AI model (OpenAI, HuggingFace, Claude, Gemini):
    1. Set API key in environment variables
    2. Configure `AI_MODEL_PROVIDER` in settings
    3. The service will automatically use your model for feedback generation
    """,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
    debug=settings.DEBUG
)


# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """Add processing time to response headers"""
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = f"{process_time:.4f}s"
    return response


# Global exception handler
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors"""
    errors = exc.errors()
    logger.error(f"Validation error: {errors}")
    
    # Convert error details to JSON-serializable format
    serializable_errors = []
    for error in errors:
        error_dict = {
            "loc": error.get("loc", []),
            "msg": str(error.get("msg", "")),
            "type": error.get("type", "")
        }
        # Add input if available
        if "input" in error:
            error_dict["input"] = str(error["input"])
        serializable_errors.append(error_dict)
    
    return JSONResponse(
        status_code=422,
        content={
            "error": "ValidationError",
            "message": "Invalid request data",
            "detail": serializable_errors
        }
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle unexpected errors"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": type(exc).__name__,
            "message": "Internal server error",
            "detail": str(exc) if settings.DEBUG else "An unexpected error occurred"
        }
    )


# Include API router
app.include_router(api_router, prefix="/api/v1")


# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """
    Root endpoint with service information
    """
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs",
        "health": "/api/v1/health",
        "ai_provider": settings.AI_MODEL_PROVIDER,
        "message": "🎓 Welcome to PyBlocks AI Service! Visit /docs for API documentation."
    }


# ============================================================================
# LEGACY ENDPOINTS - For backwards compatibility with old main.py
# These endpoints maintain compatibility with existing frontend code
# ============================================================================


# In-memory event log (will be saved to JSON file)
# Note: event_log and EVENT_LOG_FILE are initialized at the top of the file


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


class CodeExecutionRequest(BaseModel):
    """Request for code execution"""
    code: str
    mission_id: Optional[str] = None
    user_id: Optional[str] = None
    expected_output: Optional[str] = None
    test_cases: Optional[List[Dict[str, str]]] = []
    inputs: Optional[List[str]] = []  # Pre-provided inputs for input() calls


class CodeExecutionResponse(BaseModel):
    """Response from code execution"""
    success: bool
    output: str
    error: Optional[str] = None
    error_line: Optional[int] = None
    error_type: Optional[str] = None
    hint: Optional[str] = None
    execution_time: float
    has_test_cases: bool = False
    test_results: Optional[List[Dict[str, Any]]] = None
    needs_input: bool = False
    input_count: int = 0
    input_prompts: Optional[List[str]] = []


class AnalyzeErrorRequest(BaseModel):
    """Request for AI error analysis"""
    code: str
    output: str
    error: Optional[str] = None
    expected_output: Optional[str] = None
    mission_id: Optional[str] = None


@app.post("/observe", response_model=FeedbackResponse, tags=["Legacy"])
async def observe(event: StudentEvent):
    """
    Legacy endpoint: Observe student activity and provide feedback
    Maintained for backwards compatibility with old frontend code
    """
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
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
    
    event_log.append(log_entry)
    save_events_to_file()
    
    feedback = analyze_student_code(event)
    return feedback


@app.get("/analytics", tags=["Legacy"])
async def legacy_analytics():
    """Legacy analytics endpoint (backwards compatibility)"""
    if not event_log:
        return {"message": "No events logged yet"}
    
    total_events = len(event_log)
    total_attempts = sum(e.get("attempts", 0) for e in event_log)
    avg_attempts = total_attempts / total_events if total_events > 0 else 0
    successful = sum(1 for e in event_log if "Hello\nHello\nHello\nHello\nHello" in e.get("output", ""))
    
    return {
        "total_events": total_events,
        "total_attempts": total_attempts,
        "average_attempts_per_session": round(avg_attempts, 2),
        "successful_completions": successful,
        "success_rate": f"{(successful/total_events*100):.1f}%" if total_events > 0 else "0%",
        "message": "Use /api/v1/health/metrics for new analytics"
    }


@app.get("/events", tags=["Legacy"])
async def get_events(limit: int = 10):
    """Legacy: Get recent events (for debugging/demo purposes)"""
    return {
        "total_events": len(event_log),
        "recent_events": event_log[-limit:] if event_log else []
    }


@app.post("/execute", response_model=CodeExecutionResponse, tags=["Legacy"])
async def execute_code(request: CodeExecutionRequest):
    """
    Legacy endpoint: Execute Python code and return console output
    Maintained for backwards compatibility
    """
    start_time = time.time()
    
    input_count = count_input_calls(request.code)
    input_prompts = extract_input_prompts(request.code)
    
    if input_count > 0 and (not request.inputs or len(request.inputs) < input_count):
        return CodeExecutionResponse(
            success=False,
            output="",
            error=None,
            error_line=None,
            error_type=None,
            hint=None,
            execution_time=0,
            has_test_cases=False,
            test_results=None,
            needs_input=True,
            input_count=input_count,
            input_prompts=input_prompts
        )
    
    success, output, error_info = execute_with_timeout(
        request.code, 
        timeout_seconds=5,
        user_inputs=request.inputs or []
    )
    
    error = error_info['error']
    error_line = error_info['error_line']
    error_type = error_info['error_type']
    hint = error_info['hint']
    test_results = []
    
    if success and request.test_cases and len(request.test_cases) > 0:
        for i, test_case in enumerate(request.test_cases):
            test_input = test_case.get('input', '')
            expected = test_case.get('expectedOutput', '')
            test_passed = expected.strip() in output.strip()
            test_results.append({
                'test_number': i + 1,
                'input': test_input,
                'expected': expected,
                'passed': test_passed
            })
    
    if success and request.expected_output and output.strip() != request.expected_output.strip():
        hint = generate_friendly_hint(
            code=request.code,
            actual_output=output,
            expected_output=request.expected_output
        )
    
    execution_time = time.time() - start_time
    
    return CodeExecutionResponse(
        success=success,
        output=output,
        error=error,
        error_line=error_line,
        error_type=error_type,
        hint=hint,
        execution_time=execution_time,
        has_test_cases=bool(request.test_cases and len(request.test_cases) > 0),
        test_results=test_results if test_results else None,
        needs_input=False,
        input_count=input_count,
        input_prompts=input_prompts
    )


@app.post("/analyze-error", tags=["Legacy"])
async def analyze_error(request: AnalyzeErrorRequest):
    """
    Legacy endpoint: Analyze code error or wrong output and provide friendly hints
    """
    try:
        analysis_parts = []
        
        if request.error:
            analysis_parts.append("## 🔍 What Went Wrong\n")
            
            if "SyntaxError" in request.error:
                analysis_parts.append("You have a **syntax error** - this means Python can't understand your code because it's not written in the right format.\n\n")
                analysis_parts.append(f"**Error details:** {request.error}\n\n")
            elif "NameError" in request.error:
                analysis_parts.append("You have a **name error** - you're trying to use something that Python doesn't know about yet.\n\n")
                analysis_parts.append(f"**Error details:** {request.error}\n\n")
            elif "IndentationError" in request.error:
                analysis_parts.append("You have an **indentation error** - your code isn't indented (spaced) correctly.\n\n")
            elif "TypeError" in request.error:
                analysis_parts.append("You have a **type error** - you're mixing incompatible data types.\n\n")
            else:
                analysis_parts.append(f"**Error:** {request.error}\n\n")
            
            analysis_parts.append("\n## 💪 How to Fix It\n")
            analysis_parts.append("1. Read the error message carefully - it tells you exactly what's wrong!\n")
            analysis_parts.append("2. Look at the line number mentioned in the error\n")
            analysis_parts.append("3. Check for common mistakes: missing colons `:`, wrong indentation, typos\n")
            analysis_parts.append("4. Try running your code after each small fix\n")
            
        elif request.expected_output:
            analysis_parts.append("## 📊 Output Comparison\n")
            analysis_parts.append("Your code ran without errors, but the output isn't quite what we expected! 🤔\n\n")
            
            actual = request.output.strip()
            expected = request.expected_output.strip()
            
            analysis_parts.append("### Your Output:\n```\n" + actual + "\n```\n\n")
            analysis_parts.append("### Expected Output:\n```\n" + expected + "\n```\n\n")
            
            actual_lines = actual.split('\n')
            expected_lines = expected.split('\n')
            
            if len(actual_lines) != len(expected_lines):
                analysis_parts.append(f"**Line count:** You have {len(actual_lines)} lines, but expected {len(expected_lines)} lines.\n\n")
        else:
            analysis_parts.append("I'm not sure what went wrong, but keep trying! Every attempt teaches you something new. 💪\n")
        
        analysis_parts.append("\n## 🌟 Keep Going!\n")
        analysis_parts.append("Remember: Every programmer makes mistakes - that's how we learn! ")
        analysis_parts.append("Each error teaches you something new about Python. ")
        analysis_parts.append("You've got this! 💪\n")
        
        analysis = "".join(analysis_parts)
        
        return {
            "analysis": analysis,
            "hint": analysis
        }
        
    except Exception as e:
        logger.error(f"Error in analyze_error: {str(e)}")
        return {
            "analysis": "I couldn't analyze this error in detail, but don't worry! Read the error message carefully and try to fix it step by step. You can do it! 🌟",
            "hint": "Check your code line by line and look for typos, missing colons, or wrong indentation. 💪"
        }


# ============================================================================
# HELPER FUNCTIONS FOR LEGACY ENDPOINTS
# ============================================================================

def analyze_student_code(event: StudentEvent) -> FeedbackResponse:
    """Simple rule-based analysis of student code"""
    code = event.code.lower()
    output = event.output
    attempts = event.attempts
    
    feedback = ""
    encouragement = ""
    hint = ""
    concepts_detected = []
    
    if "for" in code:
        concepts_detected.append("for-loop")
    if "while" in code:
        concepts_detected.append("while-loop")
    if "print" in code:
        concepts_detected.append("print")
    if "range" in code:
        concepts_detected.append("range")
    
    expected_output = "Hello\nHello\nHello\nHello\nHello"
    
    if output.strip() == expected_output.strip():
        feedback = "🎉 Perfect! You completed the mission successfully!"
        encouragement = "Great job! You understand how loops work!"
        return FeedbackResponse(
            feedback=feedback,
            encouragement=encouragement,
            status="success",
            concepts_detected=concepts_detected
        )
    
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
        logger.error(f"Error saving events: {e}")


def count_input_calls(code: str) -> int:
    """Count the number of input() calls in the code"""
    try:
        tree = ast.parse(code)
        count = 0
        for node in ast.walk(tree):
            if isinstance(node, ast.Call):
                if isinstance(node.func, ast.Name) and node.func.id == 'input':
                    count += 1
        return count
    except:
        return 0


def extract_input_prompts(code: str) -> list:
    """Extract the prompt strings from input() calls"""
    prompts = []
    try:
        tree = ast.parse(code)
        for node in ast.walk(tree):
            if isinstance(node, ast.Call):
                if isinstance(node.func, ast.Name) and node.func.id == 'input':
                    if node.args and isinstance(node.args[0], ast.Constant):
                        prompts.append(node.args[0].value)
                    else:
                        prompts.append("")
        return prompts
    except:
        return []


def execute_with_timeout(code: str, timeout_seconds: int = 5, user_inputs: list = None):
    """Execute Python code with a timeout using threading"""
    stdout_capture = io.StringIO()
    stderr_capture = io.StringIO()
    
    success = False
    output = ""
    error_info = {
        'error': None,
        'error_type': None,
        'error_line': None,
        'hint': None
    }
    
    execution_state = {
        'completed': False,
        'exception': None,
        'output': '',
        'stderr': ''
    }
    
    def run_code():
        try:
            input_iterator = iter(user_inputs or [])
            
            def mock_input(prompt=""):
                if prompt:
                    stdout_capture.write(prompt)
                try:
                    return next(input_iterator)
                except StopIteration:
                    raise EOFError("No more input values provided")
            
            exec_globals = {
                '__builtins__': __builtins__,
                '__name__': '__main__',
                'input': mock_input,
            }
            
            with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
                exec(code, exec_globals)
            
            execution_state['output'] = stdout_capture.getvalue()
            execution_state['stderr'] = stderr_capture.getvalue()
            execution_state['completed'] = True
            
        except Exception as e:
            execution_state['exception'] = e
            execution_state['output'] = stdout_capture.getvalue()
            execution_state['stderr'] = stderr_capture.getvalue()
    
    thread = threading.Thread(target=run_code, daemon=True)
    thread.start()
    thread.join(timeout=timeout_seconds)
    
    if thread.is_alive():
        success = False
        error_info['error_type'] = "Timeout Error"
        error_info['error'] = f"Your code took too long to run (more than {timeout_seconds} seconds)"
        error_info['hint'] = "⏱️ Oops! Your code is taking too long. Do you have an infinite loop? Check your while loops and make sure they can finish!"
        output = execution_state.get('output', '')
        return success, output, error_info
    
    if execution_state.get('exception'):
        e = execution_state['exception']
        output = execution_state['output']
        
        if isinstance(e, SyntaxError):
            error_info['error_type'] = "Syntax Error"
            error_info['error_line'] = e.lineno
            error_info['error'] = f"{e.msg}"
            error_info['hint'] = generate_syntax_error_hint(e)
            output = ""
        elif isinstance(e, NameError):
            error_info['error_type'] = "Name Error"
            error_info['error'] = str(e)
            error_info['hint'] = generate_name_error_hint(e, code)
            error_info['error_line'] = find_error_line(code, str(e))
        elif isinstance(e, TypeError):
            error_info['error_type'] = "Type Error"
            error_info['error'] = str(e)
            error_info['hint'] = generate_type_error_hint(e)
            error_info['error_line'] = find_error_line_from_traceback()
        elif isinstance(e, IndentationError):
            error_info['error_type'] = "Indentation Error"
            error_info['error_line'] = e.lineno
            error_info['error'] = str(e)
            error_info['hint'] = "🎯 Oops! Your code has an indentation problem. In Python, indentation (spaces at the start of lines) is very important! Make sure code inside loops and functions is indented properly."
            output = ""
        else:
            error_info['error_type'] = type(e).__name__
            error_info['error'] = str(e)
            error_info['hint'] = f"🤔 Something unexpected happened: {str(e)}. Let me help you figure this out!"
            error_info['error_line'] = find_error_line_from_traceback()
        
        return False, output, error_info
    
    if execution_state.get('completed'):
        output = execution_state['output']
        stderr = execution_state.get('stderr', '')
        if stderr:
            output += "\n" + stderr
        return True, output, error_info
    
    return False, "", error_info


def generate_syntax_error_hint(e: SyntaxError) -> str:
    """Generate a friendly hint for syntax errors"""
    msg = e.msg.lower()
    
    if "invalid syntax" in msg:
        if e.text and ':' in e.text:
            return "🤔 Did you forget to add something after the colon (:)? In Python, after a colon you need to indent the next line!"
        return "🤔 Hmm, Python doesn't understand this syntax. Check if you're missing a colon (:), parenthesis (), or quotation marks (\"\")."
    
    if "unexpected eof" in msg or "expected an indented block" in msg:
        return "📝 It looks like your code is incomplete! Did you start something (like a loop or function) but forget to add code inside it?"
    
    if "unterminated string" in msg:
        return "📝 You started a string (text in quotes) but didn't close it! Make sure every opening quote \" or ' has a closing quote."
    
    return "🤔 There's a syntax problem in your code. Double-check for missing colons (:), parentheses (), or quotation marks."


def generate_name_error_hint(e: NameError, code: str) -> str:
    """Generate a friendly hint for name errors"""
    error_msg = str(e)
    
    match = re.search(r"name '(\w+)' is not defined", error_msg)
    if match:
        var_name = match.group(1)
        
        if var_name.lower() in ['prnit', 'pritn', 'pirnt']:
            return f"🎨 Oops! It looks like you meant to write 'print' but wrote '{var_name}' instead. Try fixing the spelling!"
        
        if var_name in code:
            return f"🔍 You're trying to use '{var_name}' before you've created it! In Python, you need to create (define) a variable before you can use it."
        
        return f"❓ Python doesn't know what '{var_name}' is. Did you forget to define it? Or maybe it's a typo?"
    
    return "❓ You're using a name that Python doesn't recognize. Check your spelling or make sure you've defined the variable first!"


def generate_type_error_hint(e: TypeError) -> str:
    """Generate a friendly hint for type errors"""
    error_msg = str(e).lower()
    
    if "unsupported operand" in error_msg:
        return "🔢 You're trying to do math with things that don't match! For example, you can't add a number and text together. Make sure you're using the right types!"
    
    if "not callable" in error_msg:
        return "📞 You're trying to call something as if it were a function, but it isn't! Check if you added () to something that shouldn't have them."
    
    if "required positional argument" in error_msg:
        return "📋 This function needs more information! You're not giving it all the values it needs. Check what the function expects."
    
    return "🎯 There's a type mismatch in your code. Make sure you're using the right kind of data (numbers, text, etc.) in the right places!"


def find_error_line(code: str, error_msg: str) -> Optional[int]:
    """Try to find which line caused the error"""
    try:
        lines = code.split('\n')
        match = re.search(r"'(\w+)'", error_msg)
        if match:
            var_name = match.group(1)
            for i, line in enumerate(lines, 1):
                if var_name in line:
                    return i
    except:
        pass
    return None


def find_error_line_from_traceback() -> Optional[int]:
    """Extract line number from the current traceback"""
    try:
        tb = sys.exc_info()[2]
        if tb:
            while tb.tb_next:
                tb = tb.tb_next
            return tb.tb_lineno
    except:
        pass
    return None


def generate_friendly_hint(code: str, actual_output: str, expected_output: str) -> str:
    """Generate a friendly hint when output doesn't match expected"""
    actual = actual_output.strip()
    expected = expected_output.strip()
    
    actual_lines = actual.split('\n')
    expected_lines = expected.split('\n')
    
    if len(actual_lines) != len(expected_lines):
        if len(actual_lines) < len(expected_lines):
            return f"📏 Your output has {len(actual_lines)} line(s), but it should have {len(expected_lines)} line(s). You might need to print more things!"
        else:
            return f"📏 Your output has {len(actual_lines)} line(s), but it should have {len(expected_lines)} line(s). You might be printing too much!"
    
    for i, (actual_line, expected_line) in enumerate(zip(actual_lines, expected_lines), 1):
        if actual_line != expected_line:
            return f"🔍 Line {i} is different! You printed: '{actual_line}', but it should be: '{expected_line}'"
    
    return "🎯 Your output is close, but not exactly right. Compare it carefully with what's expected!"


# ============================================================================
# MAIN APPLICATION ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    
    logger.info(f"🚀 Starting {settings.APP_NAME}...")
    logger.info(f"📊 Swagger UI: http://{settings.HOST}:{settings.PORT}/docs")
    logger.info(f"📚 ReDoc: http://{settings.HOST}:{settings.PORT}/redoc")
    logger.info(f"🔗 Backend integration: {settings.BACKEND_URL}")
    
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )
