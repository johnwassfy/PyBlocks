"""
Utility functions for the AI service
"""
import hashlib
import time
from typing import Any, Dict, List
from functools import wraps
from app.core.logger import logger


def timing_decorator(func):
    """Decorator to measure function execution time"""
    @wraps(func)
    async def async_wrapper(*args, **kwargs):
        start = time.time()
        result = await func(*args, **kwargs)
        duration = (time.time() - start) * 1000
        logger.debug(f"⏱️  {func.__name__} took {duration:.2f}ms")
        return result
    
    @wraps(func)
    def sync_wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        duration = (time.time() - start) * 1000
        logger.debug(f"⏱️  {func.__name__} took {duration:.2f}ms")
        return result
    
    # Return appropriate wrapper based on function type
    import asyncio
    if asyncio.iscoroutinefunction(func):
        return async_wrapper
    return sync_wrapper


def sanitize_code(code: str) -> str:
    """
    Sanitize user code to prevent malicious operations
    
    Args:
        code: Raw user code
        
    Returns:
        Sanitized code string
    """
    # Remove dangerous imports
    dangerous_modules = [
        'os', 'sys', 'subprocess', 'eval', 'exec', 
        '__import__', 'open', 'file', 'input', 'raw_input',
        'compile', 'reload', 'execfile'
    ]
    
    lines = code.split('\n')
    safe_lines = []
    
    for line in lines:
        # Check for dangerous patterns
        is_dangerous = False
        for module in dangerous_modules:
            if module in line and ('import' in line or module + '(' in line):
                logger.warning(f"[SECURITY] Blocked dangerous code: {line.strip()}")
                is_dangerous = True
                break
        
        if not is_dangerous:
            safe_lines.append(line)
    
    return '\n'.join(safe_lines)


def truncate_output(output: str, max_length: int = 1000) -> str:
    """
    Truncate output to prevent memory issues
    
    Args:
        output: Output string
        max_length: Maximum allowed length
        
    Returns:
        Truncated output
    """
    if len(output) > max_length:
        return output[:max_length] + f"\n... [Output truncated, showing first {max_length} characters]"
    return output


def extract_concepts(code: str) -> List[str]:
    """
    Extract programming concepts from code
    
    Args:
        code: Python code string
        
    Returns:
        List of detected concepts
    """
    concepts = []
    code_lower = code.lower()
    
    # Control structures
    if 'for ' in code_lower or 'for(' in code_lower:
        concepts.append('for-loop')
    if 'while ' in code_lower or 'while(' in code_lower:
        concepts.append('while-loop')
    if 'if ' in code_lower or 'if(' in code_lower:
        concepts.append('conditional')
    if 'else' in code_lower:
        concepts.append('else-statement')
    if 'elif' in code_lower:
        concepts.append('elif-statement')
    
    # Functions
    if 'def ' in code_lower:
        concepts.append('function-definition')
    if 'return' in code_lower:
        concepts.append('return-statement')
    if 'lambda' in code_lower:
        concepts.append('lambda-function')
    
    # Data structures
    if '[' in code and ']' in code:
        concepts.append('list')
    if '{' in code and '}' in code:
        concepts.append('dictionary')
    if '(' in code and ')' in code and 'tuple' in code_lower:
        concepts.append('tuple')
    
    # Common functions
    if 'print(' in code_lower:
        concepts.append('print')
    if 'range(' in code_lower:
        concepts.append('range')
    if 'len(' in code_lower:
        concepts.append('len')
    if 'input(' in code_lower:
        concepts.append('input')
    
    # String operations
    if '.split(' in code_lower or '.join(' in code_lower:
        concepts.append('string-methods')
    if '.format(' in code_lower or 'f"' in code or "f'" in code:
        concepts.append('string-formatting')
    
    # List operations
    if '.append(' in code_lower or '.extend(' in code_lower:
        concepts.append('list-methods')
    if '.sort(' in code_lower or 'sorted(' in code_lower:
        concepts.append('sorting')
    
    # Error handling
    if 'try:' in code_lower:
        concepts.append('exception-handling')
    if 'except' in code_lower:
        concepts.append('exception-catching')
    
    # Classes
    if 'class ' in code_lower:
        concepts.append('class-definition')
    if 'self.' in code_lower:
        concepts.append('object-oriented')
    
    return list(set(concepts))  # Remove duplicates


def calculate_code_complexity(code: str) -> int:
    """
    Calculate simple complexity score for code
    
    Args:
        code: Python code string
        
    Returns:
        Complexity score (0-10)
    """
    score = 0
    code_lower = code.lower()
    
    # Base score from lines
    lines = [l for l in code.split('\n') if l.strip() and not l.strip().startswith('#')]
    score += min(len(lines) // 2, 3)
    
    # Control structures add complexity
    score += code_lower.count('for ') * 1
    score += code_lower.count('while ') * 1
    score += code_lower.count('if ') * 0.5
    
    # Functions and classes
    score += code_lower.count('def ') * 1.5
    score += code_lower.count('class ') * 2
    
    # Nested structures
    indentation_levels = max([len(line) - len(line.lstrip()) for line in code.split('\n')] or [0])
    score += indentation_levels // 4
    
    return min(int(score), 10)


def generate_code_hash(code: str) -> str:
    """
    Generate unique hash for code (for caching)
    
    Args:
        code: Python code string
        
    Returns:
        SHA256 hash
    """
    return hashlib.sha256(code.encode()).hexdigest()


def format_error_message(error: Exception) -> str:
    """
    Format error message in a user-friendly way
    
    Args:
        error: Exception object
        
    Returns:
        Formatted error message
    """
    error_type = type(error).__name__
    error_msg = str(error)
    
    # Common Python errors with friendly messages
    friendly_messages = {
        'SyntaxError': '🔴 Syntax Error: There\'s a mistake in your code structure.',
        'IndentationError': '🔴 Indentation Error: Check your code spacing and indentation.',
        'NameError': '🔴 Name Error: You\'re using a variable that hasn\'t been defined.',
        'TypeError': '🔴 Type Error: You\'re using the wrong type of data.',
        'ValueError': '🔴 Value Error: The value you\'re using is incorrect.',
        'IndexError': '🔴 Index Error: You\'re trying to access an item that doesn\'t exist.',
        'KeyError': '🔴 Key Error: The dictionary key you\'re looking for doesn\'t exist.',
        'AttributeError': '🔴 Attribute Error: That object doesn\'t have that property or method.',
        'ZeroDivisionError': '🔴 Division Error: You can\'t divide by zero!',
    }
    
    friendly_msg = friendly_messages.get(error_type, f'🔴 {error_type}')
    return f"{friendly_msg}\n\nDetails: {error_msg}"


def validate_test_case(test_case: str) -> bool:
    """
    Validate that a test case is safe to execute
    
    Args:
        test_case: Test case string
        
    Returns:
        True if safe, False otherwise
    """
    dangerous_patterns = ['import', 'exec', 'eval', '__', 'open(', 'file(']
    test_lower = test_case.lower()
    
    for pattern in dangerous_patterns:
        if pattern in test_lower:
            logger.warning(f"[SECURITY] Dangerous pattern in test case: {pattern}")
            return False
    
    return True
