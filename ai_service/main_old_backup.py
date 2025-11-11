"""
PyBlocks AI Observer Service
A lightweight FastAPI service that observes student coding behavior,
logs events, and provides adaptive feedback.

This is the core of the adaptive learning system.
"""

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import time
import json
from datetime import datetime
import sys
import io
import traceback
import re
from contextlib import redirect_stdout, redirect_stderr
import threading
import platform
import asyncio
import uuid

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
    needs_input: bool = False  # Whether code needs user input
    input_count: int = 0  # Number of input() calls detected
    input_prompts: Optional[List[str]] = []  # The prompt strings from input() calls


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


class TimeoutError(Exception):
    """Custom timeout exception"""
    pass


def count_input_calls(code: str) -> int:
    """Count the number of input() calls in the code"""
    import ast
    try:
        tree = ast.parse(code)
        count = 0
        for node in ast.walk(tree):
            if isinstance(node, ast.Call):
                if isinstance(node.func, ast.Name) and node.func.id == 'input':
                    count += 1
        return count
    except:
        # If we can't parse, return 0
        return 0


def extract_input_prompts(code: str) -> list:
    """Extract the prompt strings from input() calls in the code"""
    import ast
    prompts = []
    try:
        tree = ast.parse(code)
        for node in ast.walk(tree):
            if isinstance(node, ast.Call):
                if isinstance(node.func, ast.Name) and node.func.id == 'input':
                    # Check if there's an argument (the prompt)
                    if node.args and len(node.args) > 0:
                        arg = node.args[0]
                        if isinstance(arg, ast.Constant):
                            prompts.append(arg.value)
                        else:
                            prompts.append("")  # No prompt or complex expression
                    else:
                        prompts.append("")  # No prompt
        return prompts
    except:
        return []


def execute_with_timeout(code: str, timeout_seconds: int = 5, user_inputs: list = None):
    """
    Execute Python code with a timeout using threading (works on Windows).
    Handles user inputs by mocking the input() function.
    Returns (success, output, error_info)
    """
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
    
    # Shared state for thread
    execution_state = {
        'completed': False,
        'exception': None,
        'output': '',
        'stderr': ''
    }
    
    def run_code():
        """Run the code in a separate thread"""
        try:
            # Create input iterator
            input_iterator = iter(user_inputs or [])
            
            def mock_input(prompt=""):
                """Mock input function that returns pre-provided values"""
                if prompt:
                    stdout_capture.write(prompt)
                try:
                    value = next(input_iterator)
                    stdout_capture.write(value + "\n")
                    return value
                except StopIteration:
                    raise EOFError("No more input values provided")
            
            # Create a clean execution environment
            exec_globals = {
                '__builtins__': __builtins__,
                '__name__': '__main__',
                'input': mock_input,  # Replace input with our mock
            }
            
            # Redirect stdout and stderr
            with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
                # Execute the code
                exec(code, exec_globals)
            
            # Get the output
            execution_state['output'] = stdout_capture.getvalue()
            execution_state['stderr'] = stderr_capture.getvalue()
            execution_state['completed'] = True
            
        except Exception as e:
            execution_state['exception'] = e
            execution_state['output'] = stdout_capture.getvalue()
            execution_state['stderr'] = stderr_capture.getvalue()
    
    # Run code in a thread
    thread = threading.Thread(target=run_code, daemon=True)
    thread.start()
    thread.join(timeout=timeout_seconds)
    
    # Check if thread is still running (timeout occurred)
    if thread.is_alive():
        success = False
        error_info['error_type'] = "Timeout Error"
        error_info['error'] = f"Your code took too long to run (more than {timeout_seconds} seconds)"
        error_info['hint'] = "⏱️ Oops! Your code is taking too long. Do you have an infinite loop? Check your while loops and make sure they can finish!"
        output = execution_state.get('output', '')  # Get any output before timeout
        return success, output, error_info
    
    # Check if exception occurred
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
    
    # Success!
    if execution_state.get('completed'):
        output = execution_state['output']
        stderr = execution_state.get('stderr', '')
        if stderr:
            output += "\n" + stderr
        return True, output, error_info
    
    # Something went wrong
    return False, "", error_info


@app.post("/execute", response_model=CodeExecutionResponse)
async def execute_code(request: CodeExecutionRequest):
    """
    Execute Python code and return console output.
    This provides a real REPL-like experience with proper error handling and timeout.
    """
    start_time = time.time()
    
    # Check if code needs input
    input_count = count_input_calls(request.code)
    input_prompts = extract_input_prompts(request.code)
    
    # If code needs input but none provided, return early asking for input
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
    
    # Execute code with timeout (5 seconds default)
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
    
    # Run test cases if provided and execution was successful
    if success and request.test_cases and len(request.test_cases) > 0:
        for i, test_case in enumerate(request.test_cases):
            test_input = test_case.get('input', '')
            expected = test_case.get('expectedOutput', '')
            
            # For now, we'll compare the output
            # In a more advanced version, we could inject inputs
            test_passed = expected.strip() in output.strip()
            
            test_results.append({
                'test_number': i + 1,
                'input': test_input,
                'expected': expected,
                'passed': test_passed
            })
    
    # Compare with expected output if provided (for missions)
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


class AnalyzeErrorRequest(BaseModel):
    """Request for AI error analysis"""
    code: str
    output: str
    error: Optional[str] = None
    expected_output: Optional[str] = None
    mission_id: Optional[str] = None


@app.post("/analyze-error")
async def analyze_error(request: AnalyzeErrorRequest):
    """
    Analyze code error or wrong output and provide friendly, detailed AI hints
    This provides more detailed analysis than the quick hints
    """
    try:
        # Build a detailed analysis using our hint generation functions
        analysis_parts = []
        
        if request.error:
            # We have an error
            analysis_parts.append("## 🔍 What Went Wrong\n")
            
            # Parse error type
            if "SyntaxError" in request.error:
                analysis_parts.append("You have a **syntax error** - this means Python doesn't understand how your code is written.\n")
                if "line" in request.error:
                    line_match = re.search(r'line (\d+)', request.error)
                    if line_match:
                        line_num = line_match.group(1)
                        analysis_parts.append(f"📍 The problem is on **line {line_num}**\n")
            
            elif "NameError" in request.error:
                analysis_parts.append("You have a **name error** - you're using something that Python doesn't know about yet.\n")
                var_match = re.search(r"'(\w+)'", request.error)
                if var_match:
                    var_name = var_match.group(1)
                    analysis_parts.append(f"❓ Python doesn't know what `{var_name}` is. Did you:\n")
                    analysis_parts.append(f"- Spell it correctly?\n")
                    analysis_parts.append(f"- Define it before using it?\n")
                    analysis_parts.append(f"- Forget to put quotes around it if it's text?\n")
            
            elif "IndentationError" in request.error:
                analysis_parts.append("You have an **indentation error** - your spaces/tabs aren't quite right.\n")
                analysis_parts.append("🎯 **Remember:** Code inside loops, functions, and if-statements needs to be indented (have spaces before it)!\n")
            
            elif "TypeError" in request.error:
                analysis_parts.append("You have a **type error** - you're mixing things that don't go together.\n")
                analysis_parts.append("💡 For example, you can't add numbers and text directly. Use `str()` to convert numbers to text!\n")
            
            else:
                analysis_parts.append(f"You encountered an error: {request.error.split(':')[0]}\n")
            
            analysis_parts.append("\n## 💪 How to Fix It\n")
            analysis_parts.append("1. Read the error message carefully - it tells you exactly what's wrong!\n")
            analysis_parts.append("2. Look at the line number mentioned in the error\n")
            analysis_parts.append("3. Check for common mistakes: missing colons `:`, wrong indentation, typos\n")
            analysis_parts.append("4. Try running your code after each small fix\n")
            
        elif request.expected_output:
            # Output doesn't match expected
            analysis_parts.append("## 📊 Output Comparison\n")
            analysis_parts.append("Your code ran without errors, but the output isn't quite what we expected! 🤔\n\n")
            
            actual = request.output.strip()
            expected = request.expected_output.strip()
            
            analysis_parts.append("### Your Output:\n```\n" + actual + "\n```\n\n")
            analysis_parts.append("### Expected Output:\n```\n" + expected + "\n```\n\n")
            
            # Detailed comparison
            actual_lines = actual.split('\n')
            expected_lines = expected.split('\n')
            
            if len(actual_lines) != len(expected_lines):
                analysis_parts.append(f"**Line Count:** You have {len(actual_lines)} line(s), but need {len(expected_lines)} line(s)\n\n")
            
            analysis_parts.append("### What to Check:\n")
            analysis_parts.append("- Did you print all the required values?\n")
            analysis_parts.append("- Are you printing them in the right order?\n")
            analysis_parts.append("- Check for extra spaces or missing punctuation\n")
            analysis_parts.append("- Make sure your calculations are correct\n")
        
        else:
            analysis_parts.append("## ✨ Your Code Ran Successfully!\n")
            analysis_parts.append("Great job! Your code executed without any errors. 🎉\n")
        
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
        print(f"Error in analyze_error: {str(e)}")
        return {
            "analysis": "I couldn't analyze this error in detail, but don't worry! Read the error message carefully and try to fix it step by step. You can do it! 🌟",
            "hint": "Check your code line by line and look for typos, missing colons, or wrong indentation. 💪"
        }


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
    
    # Extract the variable name from the error
    match = re.search(r"name '(\w+)' is not defined", error_msg)
    if match:
        var_name = match.group(1)
        
        # Check if it's a common typo
        if var_name.lower() in ['prnit', 'pritn', 'pirnt']:
            return f"🎨 Oops! It looks like you meant to write 'print' but wrote '{var_name}' instead. Try fixing the spelling!"
        
        # Check if it's used before being defined
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


def generate_generic_error_hint(e: Exception) -> str:
    """Generate a friendly hint for other errors"""
    error_type = type(e).__name__
    
    if error_type == "IndexError":
        return "📊 You're trying to access an item in a list that doesn't exist! Remember, lists start counting from 0, and you can't access index 5 if the list only has 3 items."
    
    if error_type == "KeyError":
        return "🔑 You're looking for a key in a dictionary that doesn't exist! Double-check your dictionary keys."
    
    if error_type == "ZeroDivisionError":
        return "➗ Oops! You can't divide by zero! Math doesn't allow it. Check if you're dividing by 0 somewhere."
    
    if error_type == "AttributeError":
        return "🎯 You're trying to use a method or property that doesn't exist for this type of object. Check if you're calling the right method!"
    
    return f"❌ Something went wrong: {error_type}. Read the error message carefully - it usually gives you a clue about what's wrong!"


def find_error_line(code: str, error_msg: str) -> Optional[int]:
    """Try to find which line caused the error"""
    try:
        # This is a simple heuristic - in practice, error lines are in tracebacks
        lines = code.split('\n')
        # Look for the variable name in the code
        match = re.search(r"'(\w+)'", error_msg)
        if match:
            var_name = match.group(1)
            for i, line in enumerate(lines, 1):
                if var_name in line and '=' not in line:  # Used but not defined
                    return i
    except:
        pass
    return None


def find_error_line_from_traceback() -> Optional[int]:
    """Extract line number from the current traceback"""
    try:
        tb = sys.exc_info()[2]
        if tb:
            # Get the last frame (where the error occurred in user code)
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
    
    # Count differences
    actual_lines = actual.split('\n')
    expected_lines = expected.split('\n')
    
    if len(actual_lines) != len(expected_lines):
        if len(actual_lines) < len(expected_lines):
            return f"📏 Your output has {len(actual_lines)} line(s), but it should have {len(expected_lines)} line(s). You might need to print more things!"
        else:
            return f"📏 Your output has {len(actual_lines)} line(s), but it should have {len(expected_lines)} line(s). You might be printing too much!"
    
    # Find first difference
    for i, (actual_line, expected_line) in enumerate(zip(actual_lines, expected_lines), 1):
        if actual_line != expected_line:
            return f"🔍 Line {i} is different! You printed: '{actual_line}', but it should be: '{expected_line}'"
    
    return "🎯 Your output is close, but not exactly right. Compare it carefully with what's expected!"


if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting PyBlocks AI Observer Service...")
    print("📊 Open http://localhost:8000/docs for API documentation")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
