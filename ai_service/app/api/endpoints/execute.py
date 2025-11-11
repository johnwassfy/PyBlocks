"""
Code Execution Endpoint
Handles Python code execution with input support and timeout protection
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

router = APIRouter(prefix="", tags=["Execute"])


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
    Provides a real REPL-like experience with proper error handling and timeout.
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
        input_prompts=input_prompts
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
