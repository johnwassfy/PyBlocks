"""
Secure code executor with sandboxing and timeout protection
"""
import sys
import io
import time
import signal
import traceback
import ast
import re
from typing import Dict, Any, List, Tuple, Optional
from contextlib import redirect_stdout, redirect_stderr
from app.core.config import settings
from app.core.logger import logger, log_code_execution
from app.core.utils import sanitize_code, truncate_output, timing_decorator
from app.models.responses import TestResult


class TimeoutException(Exception):
    """Raised when code execution exceeds timeout"""
    pass


class InfiniteLoopDetected(Exception):
    """Raised when static analysis detects potential infinite loop"""
    pass


def timeout_handler(signum, frame):
    """Signal handler for timeout"""
    raise TimeoutException("Code execution timed out")


class CodeExecutor:
    """
    Secure Python code executor with sandboxing
    """
    
    def __init__(self):
        self.timeout = settings.CODE_TIMEOUT
        self.max_output_length = settings.MAX_OUTPUT_LENGTH
        self.enable_sandboxing = settings.ENABLE_SANDBOXING
        self.enable_infinite_loop_detection = True  # Enable static analysis for infinite loops
    
    def detect_infinite_loop_patterns(self, code: str) -> Tuple[bool, Optional[str]]:
        """
        Static analysis to detect common infinite loop patterns
        
        Returns:
            (is_infinite_loop, warning_message)
        """
        try:
            tree = ast.parse(code)
            warnings = []
            
            for node in ast.walk(tree):
                # Check while loops
                if isinstance(node, ast.While):
                    # Check if loop variable is never modified
                    loop_vars = self._extract_while_condition_vars(node.test)
                    modified_vars = self._extract_modified_vars(node.body)
                    
                    unmodified = [v for v in loop_vars if v not in modified_vars]
                    if unmodified and not self._has_break_statement(node.body):
                        warnings.append(
                            f"⚠️ Potential infinite loop: while loop condition uses variable(s) "
                            f"{', '.join(unmodified)} but they're never modified inside the loop"
                        )
                
                # Check for loops
                if isinstance(node, ast.For):
                    # Check for suspicious patterns like 'for i in range(...)' without using i
                    if isinstance(node.iter, ast.Call):
                        if isinstance(node.iter.func, ast.Name) and node.iter.func.id == 'range':
                            # Check if loop modifies the iteration
                            target_name = node.target.id if isinstance(node.target, ast.Name) else None
                            if target_name:
                                modified_in_body = self._extract_modified_vars(node.body)
                                # Infinite loop if we modify the loop variable inside
                                if target_name in modified_in_body:
                                    warnings.append(
                                        f"⚠️ Suspicious pattern: modifying loop variable '{target_name}' inside for loop"
                                    )
            
            # Check for while True without break
            for node in ast.walk(tree):
                if isinstance(node, ast.While):
                    if isinstance(node.test, ast.Constant) and node.test.value is True:
                        if not self._has_break_statement(node.body):
                            warnings.append(
                                "⚠️ Infinite loop detected: 'while True' without break statement"
                            )
            
            if warnings:
                return True, "\n".join(warnings)
            return False, None
            
        except SyntaxError:
            # Can't parse - let normal execution handle it
            return False, None
        except Exception as e:
            logger.warning(f"Infinite loop detection error: {e}")
            return False, None
    
    def _extract_while_condition_vars(self, test_node) -> List[str]:
        """Extract variable names used in while condition"""
        vars = []
        for node in ast.walk(test_node):
            if isinstance(node, ast.Name):
                vars.append(node.id)
        return vars
    
    def _extract_modified_vars(self, body_nodes) -> List[str]:
        """Extract variables that are modified (assigned to) in body"""
        modified = []
        for node in body_nodes:
            for subnode in ast.walk(node):
                if isinstance(subnode, ast.Assign):
                    for target in subnode.targets:
                        if isinstance(target, ast.Name):
                            modified.append(target.id)
                elif isinstance(subnode, ast.AugAssign):
                    if isinstance(subnode.target, ast.Name):
                        modified.append(subnode.target.id)
        return modified
    
    def _has_break_statement(self, body_nodes) -> bool:
        """Check if body contains a break statement"""
        for node in body_nodes:
            for subnode in ast.walk(node):
                if isinstance(subnode, ast.Break):
                    return True
        return False
    
    @timing_decorator
    def execute(
        self, 
        code: str, 
        test_cases: List[str] = None
    ) -> Dict[str, Any]:
        """
        Execute Python code safely with timeout and sandboxing
        
        Args:
            code: Python code to execute
            test_cases: Optional test cases to run
            
        Returns:
            Dict with execution results
        """
        start_time = time.time()
        
        try:
            # ⚠️ INFINITE LOOP DETECTION (Static Analysis)
            if self.enable_infinite_loop_detection:
                is_infinite, warning_msg = self.detect_infinite_loop_patterns(code)
                if is_infinite:
                    logger.warning(f"[INFINITE LOOP DETECTED] {warning_msg}")
                    return {
                        'success': False,
                        'stdout': '',
                        'stderr': f'🔄 Infinite Loop Detected\n\n{warning_msg}\n\nYour code will run forever and never finish. Please fix the loop logic.',
                        'execution_time': 0.0,
                        'test_results': [],
                        'namespace': {},
                        'error_type': 'InfiniteLoopError',
                        'error_message': warning_msg,
                        'infinite_loop_detected': True
                    }
            
            # Sanitize code if sandboxing is enabled
            if self.enable_sandboxing:
                code = sanitize_code(code)
            
            # Prepare execution environment
            stdout_capture = io.StringIO()
            stderr_capture = io.StringIO()
            
            # Create restricted namespace
            namespace = self._create_safe_namespace()
            
            # Execute code with timeout protection
            with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
                # Set timeout alarm (Unix-like systems)
                if hasattr(signal, 'SIGALRM'):
                    signal.signal(signal.SIGALRM, timeout_handler)
                    signal.alarm(self.timeout)
                
                try:
                    exec(code, namespace)
                finally:
                    if hasattr(signal, 'SIGALRM'):
                        signal.alarm(0)  # Cancel alarm
            
            # Capture outputs
            stdout_output = stdout_capture.getvalue()
            stderr_output = stderr_capture.getvalue()
            
            # Run test cases if provided
            test_results = []
            all_tests_passed = True
            
            if test_cases:
                test_results, all_tests_passed = self._run_test_cases(
                    test_cases, 
                    namespace
                )
            
            execution_time = time.time() - start_time
            
            # Determine success
            success = (not stderr_output) and (all_tests_passed if test_cases else True)
            
            log_code_execution(success, execution_time)
            
            return {
                'success': success,
                'stdout': truncate_output(stdout_output, self.max_output_length),
                'stderr': truncate_output(stderr_output, self.max_output_length),
                'execution_time': execution_time,
                'test_results': test_results,
                'namespace': namespace,  # Return namespace for further analysis
                'error_type': None,
                'error_message': stderr_output if stderr_output else None
            }
            
        except TimeoutException:
            logger.warning(f"[TIMEOUT] Code execution timeout after {self.timeout}s")
            return {
                'success': False,
                'stdout': '',
                'stderr': f'Execution timed out after {self.timeout} seconds',
                'execution_time': self.timeout,
                'test_results': [],
                'namespace': {},
                'error_type': 'TimeoutError',
                'error_message': f'Code took too long to execute (>{self.timeout}s)'
            }
            
        except Exception as e:
            execution_time = time.time() - start_time
            error_trace = traceback.format_exc()
            logger.error(f"[EXECUTION ERROR] Code execution error: {str(e)}\n{error_trace}")
            
            return {
                'success': False,
                'stdout': '',
                'stderr': error_trace,
                'execution_time': execution_time,
                'test_results': [],
                'namespace': {},
                'error_type': type(e).__name__,
                'error_message': str(e)
            }
    
    def _create_safe_namespace(self) -> Dict[str, Any]:
        """
        Create a restricted namespace for code execution
        
        Returns:
            Safe namespace dictionary
        """
        # Start with minimal built-ins
        safe_namespace = {
            '__builtins__': {
                # Safe built-in functions
                'print': print,
                'len': len,
                'range': range,
                'str': str,
                'int': int,
                'float': float,
                'bool': bool,
                'list': list,
                'dict': dict,
                'tuple': tuple,
                'set': set,
                'abs': abs,
                'max': max,
                'min': min,
                'sum': sum,
                'round': round,
                'sorted': sorted,
                'enumerate': enumerate,
                'zip': zip,
                'map': map,
                'filter': filter,
                'any': any,
                'all': all,
                'reversed': reversed,
                'isinstance': isinstance,
                'type': type,
                'chr': chr,
                'ord': ord,
                'format': format,
                # Exceptions
                'Exception': Exception,
                'ValueError': ValueError,
                'TypeError': TypeError,
                'IndexError': IndexError,
                'KeyError': KeyError,
                'AttributeError': AttributeError,
                'ZeroDivisionError': ZeroDivisionError,
                # Constants
                'True': True,
                'False': False,
                'None': None,
            }
        }
        
        return safe_namespace
    
    def _run_test_cases(
        self, 
        test_cases: List[str], 
        namespace: Dict[str, Any]
    ) -> Tuple[List[TestResult], bool]:
        """
        Run test cases against executed code
        
        Args:
            test_cases: List of test case expressions
            namespace: Execution namespace
            
        Returns:
            Tuple of (test results list, all tests passed boolean)
        """
        test_results = []
        all_passed = True
        
        for test_case in test_cases:
            try:
                # Evaluate test case
                result = eval(test_case, namespace)
                passed = bool(result)
                
                test_results.append(TestResult(
                    test_case=test_case,
                    passed=passed,
                    expected=None,  # We don't know expected without parsing
                    actual=result,
                    error=None
                ))
                
                if not passed:
                    all_passed = False
                    
            except Exception as e:
                all_passed = False
                test_results.append(TestResult(
                    test_case=test_case,
                    passed=False,
                    expected=None,
                    actual=None,
                    error=str(e)
                ))
                logger.debug(f"Test case failed: {test_case} - {str(e)}")
        
        return test_results, all_passed
    
    def validate_syntax(self, code: str) -> Tuple[bool, str]:
        """
        Check if code has valid Python syntax
        
        Args:
            code: Python code string
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            compile(code, '<string>', 'exec')
            return True, ""
        except SyntaxError as e:
            return False, f"Syntax Error on line {e.lineno}: {e.msg}"
        except Exception as e:
            return False, str(e)


# Global executor instance
executor = CodeExecutor()
