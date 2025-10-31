"""
Secure code executor with sandboxing and timeout protection
"""
import sys
import io
import time
import signal
import traceback
from typing import Dict, Any, List, Tuple
from contextlib import redirect_stdout, redirect_stderr
from app.core.config import settings
from app.core.logger import logger, log_code_execution
from app.core.utils import sanitize_code, truncate_output, timing_decorator
from app.models.responses import TestResult


class TimeoutException(Exception):
    """Raised when code execution exceeds timeout"""
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
