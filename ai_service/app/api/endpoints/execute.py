"""
Code Execution Endpoint
Handles Python code execution with input support and timeout protection
Integrated with AI validation for mission completion assessment
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import time
import io
import sys
import threading
import ast
from contextlib import redirect_stdout, redirect_stderr

from app.core.code_differentiator import CodeDifferentiator
from app.services.code_validation_service import CodeValidationService
from app.models.validation_models import ValidationRequest

router = APIRouter(prefix="", tags=["Execute"])


class CodeExecutionRequest(BaseModel):
    """Request for code execution with optional validation"""
    code: str
    mission_id: Optional[str] = None
    user_id: Optional[str] = None
    expected_output: Optional[str] = None
    test_cases: Optional[List[Dict[str, str]]] = []
    inputs: Optional[List[str]] = []  # Pre-provided inputs for input() calls
    
    # Mission context for validation
    starter_code: Optional[str] = None
    mission_title: Optional[str] = None
    mission_description: Optional[str] = None
    objectives: Optional[List[str]] = None
    required_concepts: Optional[List[str]] = None
    validate_mission: bool = False  # Set to True to run AI validation


class CodeExecutionResponse(BaseModel):
    """Response from code execution with optional validation results"""
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
    
    # Code differentiation results
    has_starter_code: bool = False
    user_code_only: Optional[str] = None
    user_line_numbers: Optional[List[int]] = None
    
    # Validation results (only if validate_mission=True)
    validation: Optional[Dict[str, Any]] = None
    mission_completed: Optional[bool] = None
    objectives_met: Optional[int] = None
    objectives_total: Optional[int] = None
    creativity_level: Optional[str] = None
    overall_score: Optional[float] = None


class AnalyzeErrorRequest(BaseModel):
    """Request for AI error analysis"""
    code: str
    output: str
    error: Optional[str] = None
    expected_output: Optional[str] = None
    mission_id: Optional[str] = None


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
    """Extract the prompt strings from input() calls in the code"""
    prompts = []
    try:
        tree = ast.parse(code)
        for node in ast.walk(tree):
            if isinstance(node, ast.Call):
                if isinstance(node.func, ast.Name) and node.func.id == 'input':
                    if node.args and len(node.args) > 0:
                        arg = node.args[0]
                        if isinstance(arg, ast.Constant):
                            prompts.append(arg.value)
                        else:
                            prompts.append("")
                    else:
                        prompts.append("")
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
    
    execution_state = {
        'completed': False,
        'exception': None,
        'output': '',
        'stderr': ''
    }
    
    def run_code():
        """Run the code in a separate thread"""
        try:
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
            error_info['hint'] = "🤔 Python doesn't understand this syntax. Check if you're missing a colon (:), parenthesis (), or quotation marks."
            output = ""
            
        elif isinstance(e, NameError):
            error_info['error_type'] = "Name Error"
            error_info['error'] = str(e)
            error_info['hint'] = "❓ You're using a name that Python doesn't recognize. Check your spelling or make sure you've defined the variable first!"
            
        elif isinstance(e, TypeError):
            error_info['error_type'] = "Type Error"
            error_info['error'] = str(e)
            error_info['hint'] = "🎯 There's a type mismatch. Make sure you're using the right kind of data (numbers, text, etc.) in the right places!"
            
        elif isinstance(e, IndentationError):
            error_info['error_type'] = "Indentation Error"
            error_info['error_line'] = e.lineno
            error_info['error'] = str(e)
            error_info['hint'] = "🎯 Oops! Your code has an indentation problem. In Python, indentation is very important!"
            output = ""
            
        else:
            error_info['error_type'] = type(e).__name__
            error_info['error'] = str(e)
            error_info['hint'] = f"🤔 Something unexpected happened: {str(e)}. Let me help you figure this out!"
        
        return False, output, error_info
    
    if execution_state.get('completed'):
        output = execution_state['output']
        stderr = execution_state.get('stderr', '')
        if stderr:
            output += "\n" + stderr
        return True, output, error_info
    
    return False, "", error_info


@router.post("/execute", response_model=CodeExecutionResponse)
async def execute_code(request: CodeExecutionRequest):
    """
    Execute Python code and return console output.
    Optionally validates mission completion using AI analysis.
    Automatically differentiates starter code from user code.
    """
    start_time = time.time()
    
    # Differentiate starter code from user code
    code_diff = None
    code_to_execute = request.code
    
    if request.starter_code:
        code_diff = CodeDifferentiator.identify_user_additions(
            request.code,
            request.starter_code
        )
        # Execute full code but only analyze user additions
        code_to_execute = request.code
    
    input_count = count_input_calls(code_to_execute)
    input_prompts = extract_input_prompts(code_to_execute)
    
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
        code_to_execute, 
        timeout_seconds=5,
        user_inputs=request.inputs or []
    )
    
    error = error_info['error']
    error_line = error_info['error_line']
    error_type = error_info['error_type']
    hint = error_info['hint']
    test_results = []
    
    # Validation results (only if requested and code executed successfully)
    validation_result = None
    mission_completed = None
    objectives_met = None
    objectives_total = None
    creativity_level = None
    overall_score = None
    
    if request.validate_mission and success and request.objectives:
        # Run AI validation - Always use validation for mission context
        try:
            validator = CodeValidationService()
            
            # Use user code only for validation
            code_to_validate = code_diff['user_code'] if code_diff else request.code
            
            validation_request = ValidationRequest(
                mission_id=request.mission_id or "unknown",
                mission_title=request.mission_title or "Code Execution",
                mission_description=request.mission_description or "",
                objectives=request.objectives,
                required_concepts=request.required_concepts or [],
                student_code=code_to_validate,
                expected_output=request.expected_output,
                test_cases=[tc.get('expectedOutput', '') for tc in (request.test_cases or [])],
                user_id=request.user_id,
                allow_creativity=True
            )
            
            validation_response = await validator.validate(validation_request)
            
            # Return ONLY kid-friendly feedback, no detailed analysis
            validation_result = {
                'passed': validation_response.passed,
                'feedback': validation_response.summary,  # Kid-friendly summary
                'score': validation_response.validation_result.overall_score,
                'objectives_met': validation_response.validation_result.objectives_met_count,
                'objectives_total': validation_response.validation_result.objectives_total_count,
                'creativity': validation_response.validation_result.creativity.level,
            }
            
            mission_completed = validation_response.passed
            objectives_met = validation_response.validation_result.objectives_met_count
            objectives_total = validation_response.validation_result.objectives_total_count
            creativity_level = validation_response.validation_result.creativity.level
            overall_score = validation_response.validation_result.overall_score
            
        except Exception as e:
            # Validation failed, but execution succeeded
            validation_result = {
                'error': f"Validation failed: {str(e)}",
                'passed': False,
                'feedback': 'Could not assess your code. Try again!'
            }
    
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
        hint = f"🔍 Your output is close, but not exactly right. Compare it carefully with what's expected!"
    
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
        input_prompts=input_prompts,
        # Code differentiation
        has_starter_code=bool(code_diff),
        user_code_only=code_diff['user_code'] if code_diff else None,
        user_line_numbers=code_diff['user_line_numbers'] if code_diff else None,
        # Validation results
        validation=validation_result,
        mission_completed=mission_completed,
        objectives_met=objectives_met,
        objectives_total=objectives_total,
        creativity_level=creativity_level,
        overall_score=overall_score
    )


@router.post("/analyze-error")
async def analyze_error(request: AnalyzeErrorRequest):
    """
    Analyze code error or wrong output and provide friendly, detailed AI hints
    """
    try:
        analysis_parts = []
        
        if request.error:
            analysis_parts.append("## 🔍 What Went Wrong\n")
            analysis_parts.append(f"Error: {request.error}\n\n")
            
            analysis_parts.append("## 💪 How to Fix It\n")
            analysis_parts.append("1. Read the error message carefully\n")
            analysis_parts.append("2. Look at the line number mentioned\n")
            analysis_parts.append("3. Check for common mistakes\n")
            analysis_parts.append("4. Try running your code after each small fix\n")
            
        elif request.expected_output:
            analysis_parts.append("## 📊 Output Comparison\n")
            analysis_parts.append("Your code ran without errors, but the output isn't quite what we expected! 🤔\n\n")
            
            actual = request.output.strip()
            expected = request.expected_output.strip()
            
            analysis_parts.append(f"### Your Output:\n```\n{actual}\n```\n\n")
            analysis_parts.append(f"### Expected Output:\n```\n{expected}\n```\n\n")
            
            analysis_parts.append("### What to Check:\n")
            analysis_parts.append("- Did you print all the required values?\n")
            analysis_parts.append("- Are you printing them in the right order?\n")
            analysis_parts.append("- Check for extra spaces or missing punctuation\n")
        
        else:
            analysis_parts.append("## ✨ Your Code Ran Successfully!\n")
            analysis_parts.append("Great job! 🎉\n")
        
        analysis_parts.append("\n## 🌟 Keep Going!\n")
        analysis_parts.append("Remember: Every programmer makes mistakes - that's how we learn! 💪\n")
        
        analysis = "".join(analysis_parts)
        
        return {
            "analysis": analysis,
            "hint": analysis
        }
        
    except Exception as e:
        return {
            "analysis": "I couldn't analyze this error in detail, but don't worry! Try to fix it step by step. 🌟",
            "hint": "Check your code line by line. 💪"
        }
