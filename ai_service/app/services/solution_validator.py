"""
Solution Validator Service

Validates that students solve missions properly and don't just print expected output.
Detects cheating patterns and ensures code demonstrates understanding of concepts.
"""

import ast
import re
from typing import List, Dict, Any, Tuple
from dataclasses import dataclass


@dataclass
class ValidationResult:
    """Result of solution validation"""
    is_valid: bool
    score_multiplier: float  # 0.0 to 1.0
    issues: List[str]
    detected_patterns: List[str]
    complexity_score: int  # 0-100


class SolutionValidator:
    """
    Validates student solutions to prevent cheating and ensure proper learning.
    """
    
    def __init__(self):
        # Cheating patterns to detect
        self.cheating_patterns = [
            r'print\s*\(\s*["\'].*["\'].*\)',  # Direct string printing
            r'print\s*\(\s*\d+\s*\)',  # Direct number printing
        ]
    
    def validate_solution(
        self,
        code: str,
        expected_output: str,
        required_concepts: List[str],
        difficulty: str,
        actual_output: str
    ) -> ValidationResult:
        """
        Comprehensive validation of student solution.
        
        Args:
            code: Student's submitted code
            expected_output: Expected output for the mission
            required_concepts: Concepts that should be demonstrated
            difficulty: Mission difficulty level
            actual_output: Actual output from code execution
            
        Returns:
            ValidationResult with validation details
        """
        issues = []
        detected_patterns = []
        score_multiplier = 1.0
        
        # 1. Check if output matches (prerequisite)
        if actual_output.strip() != expected_output.strip():
            return ValidationResult(
                is_valid=False,
                score_multiplier=0.0,
                issues=["Output doesn't match expected result"],
                detected_patterns=[],
                complexity_score=0
            )
        
        # 2. Detect hardcoded output (cheating)
        is_hardcoded, hardcode_issues = self._check_hardcoded_output(
            code, expected_output
        )
        if is_hardcoded:
            issues.extend(hardcode_issues)
            detected_patterns.append("hardcoded_output")
            score_multiplier *= 0.3  # Severe penalty
        
        # 3. Check for required concepts
        missing_concepts = self._check_required_concepts(code, required_concepts)
        if missing_concepts:
            issues.append(f"Missing required concepts: {', '.join(missing_concepts)}")
            detected_patterns.append("missing_concepts")
            score_multiplier *= 0.6
        
        # 4. Analyze code complexity
        complexity_score = self._analyze_complexity(code, difficulty)
        if complexity_score < 20:
            issues.append("Code is too simple for this mission")
            detected_patterns.append("insufficient_complexity")
            score_multiplier *= 0.7
        
        # 5. Check for proper structure
        structure_issues = self._check_code_structure(code, required_concepts)
        if structure_issues:
            issues.extend(structure_issues)
            detected_patterns.append("poor_structure")
            score_multiplier *= 0.8
        
        # 6. Detect copy-paste patterns
        if self._detect_copy_paste(code, expected_output):
            issues.append("Code appears to be directly copying expected output")
            detected_patterns.append("copy_paste")
            score_multiplier *= 0.2
        
        is_valid = len(issues) == 0
        
        return ValidationResult(
            is_valid=is_valid,
            score_multiplier=max(0.0, score_multiplier),
            issues=issues,
            detected_patterns=detected_patterns,
            complexity_score=complexity_score
        )
    
    def _check_hardcoded_output(
        self, 
        code: str, 
        expected_output: str
    ) -> Tuple[bool, List[str]]:
        """
        Check if code directly prints the expected output without computation.
        
        Returns:
            Tuple of (is_hardcoded, list of issues)
        """
        issues = []
        code_clean = code.strip()
        expected_clean = expected_output.strip()
        
        # Check if code is just a single print statement with the exact output
        single_print_pattern = r'^\s*print\s*\(\s*["\']' + re.escape(expected_clean) + r'["\']\s*\)\s*$'
        if re.match(single_print_pattern, code_clean, re.MULTILINE | re.DOTALL):
            issues.append("Code directly prints the expected output without any logic")
            return True, issues
        
        # Check if code contains the exact expected output as a string literal
        # BUT ONLY if there's no conditional logic (if/else/elif/for/while)
        if expected_clean and len(expected_clean) > 3:
            # Check if code has control flow structures
            has_conditional = re.search(r'\b(if|elif|else|for|while|def)\b', code_clean)
            
            # If code has control flow, it's likely legitimate use of string literals
            # Only flag as hardcoded if it's direct printing without logic
            if not has_conditional:
                # Escape special regex characters in expected output
                escaped_expected = re.escape(expected_clean)
                # Check for the string in quotes
                if re.search(r'["\']' + escaped_expected + r'["\']', code_clean):
                    issues.append("Code contains hardcoded expected output as string literal")
                    return True, issues
        
        # Check for hardcoded numbers that match expected output
        if expected_clean.isdigit():
            # Check if code just prints the number directly
            if re.match(r'^\s*print\s*\(\s*' + expected_clean + r'\s*\)\s*$', code_clean):
                issues.append("Code directly prints the expected number without calculation")
                return True, issues
        
        return False, issues
    
    def _check_required_concepts(
        self, 
        code: str, 
        required_concepts: List[str]
    ) -> List[str]:
        """
        Check if code demonstrates required programming concepts.
        
        Returns:
            List of missing concepts
        """
        missing = []
        
        concept_patterns = {
            'loops': [r'\bfor\b', r'\bwhile\b'],
            'for-loop': [r'\bfor\b'],
            'while-loop': [r'\bwhile\b'],
            'conditionals': [r'\bif\b'],
            'if-statements': [r'\bif\b'],
            'functions': [r'\bdef\b'],
            'variables': [r'\b\w+\s*=\s*(?!print)'],  # Assignment not to print
            'math': [r'[\+\-\*\/]', r'\bsum\b', r'\babs\b'],
            'operators': [r'[\+\-\*\/\%]', r'==', r'!=', r'>', r'<', r'>=', r'<='],
            'lists': [r'\[.*\]', r'\.append', r'\.extend'],
            'strings': [r'["\'].*["\']'],
            'input': [r'\binput\b'],
            'range': [r'\brange\b'],
            'modulo': [r'\%'],
        }
        
        for concept in required_concepts:
            concept_lower = concept.lower()
            patterns = concept_patterns.get(concept_lower, [])
            
            found = False
            for pattern in patterns:
                if re.search(pattern, code):
                    found = True
                    break
            
            if not found:
                missing.append(concept)
        
        return missing
    
    def _analyze_complexity(self, code: str, difficulty: str) -> int:
        """
        Analyze code complexity and return score 0-100.
        
        Args:
            code: Student's code
            difficulty: Mission difficulty (easy/medium/hard)
            
        Returns:
            Complexity score 0-100
        """
        score = 0
        
        try:
            tree = ast.parse(code)
            
            # Count different statement types
            statements = 0
            has_loop = False
            has_condition = False
            has_function = False
            has_variables = False
            operations = 0
            
            for node in ast.walk(tree):
                if isinstance(node, (ast.Assign, ast.AugAssign)):
                    statements += 1
                    has_variables = True
                elif isinstance(node, (ast.For, ast.While)):
                    statements += 2  # Loops count more
                    has_loop = True
                elif isinstance(node, ast.If):
                    statements += 1
                    has_condition = True
                elif isinstance(node, ast.FunctionDef):
                    statements += 3  # Functions count even more
                    has_function = True
                elif isinstance(node, (ast.BinOp, ast.Compare)):
                    operations += 1
            
            # Base score from statement count
            score = min(30, statements * 5)
            
            # Bonus for using different constructs
            if has_variables:
                score += 15
            if has_loop:
                score += 20
            if has_condition:
                score += 15
            if has_function:
                score += 20
            if operations > 0:
                score += min(20, operations * 5)
            
            # Adjust based on difficulty expectations
            if difficulty == 'easy' and score >= 30:
                score = 100
            elif difficulty == 'medium' and score >= 50:
                score = 100
            elif difficulty == 'hard' and score >= 70:
                score = 100
            
        except SyntaxError:
            score = 0
        
        return min(100, score)
    
    def _check_code_structure(
        self, 
        code: str, 
        required_concepts: List[str]
    ) -> List[str]:
        """
        Check if code has proper structure for the concepts.
        
        Returns:
            List of structure issues
        """
        issues = []
        
        # Check if code is too short (likely cheating)
        if len(code.strip()) < 10:
            issues.append("Code is too short to demonstrate understanding")
        
        # Check for only comments
        lines = code.strip().split('\n')
        code_lines = [l for l in lines if l.strip() and not l.strip().startswith('#')]
        if len(code_lines) == 0:
            issues.append("Code contains only comments")
        
        # If loops are required, check for proper loop structure
        if any(c in ['loops', 'for-loop', 'while-loop'] for c in required_concepts):
            if not re.search(r'(for|while)\s+.+:', code):
                issues.append("Loop structure appears incorrect or missing")
        
        # If conditionals required, check for proper if structure
        if any(c in ['conditionals', 'if-statements'] for c in required_concepts):
            if not re.search(r'if\s+.+:', code):
                issues.append("Conditional structure appears incorrect or missing")
        
        return issues
    
    def _detect_copy_paste(self, code: str, expected_output: str) -> bool:
        """
        Detect if student just copied expected output into print statement.
        Only flags as copy-paste if there's NO conditional logic.
        
        Returns:
            True if copy-paste detected
        """
        # If code has control flow structures, it's likely legitimate
        has_control_flow = re.search(r'\b(if|elif|else|for|while|def)\b', code)
        if has_control_flow:
            # Code has logic, not just copy-paste
            return False
        
        # Check if expected output appears verbatim in code as string
        if expected_output and len(expected_output) > 5:
            # Look for the exact string in the code
            pattern = r'["\']' + re.escape(expected_output.strip()) + r'["\']'
            if re.search(pattern, code):
                return True
        
        # Check for multi-line output being directly printed
        if '\n' in expected_output:
            lines = expected_output.strip().split('\n')
            if len(lines) > 2:
                # Check if all lines appear as string literals
                all_found = all(
                    re.search(r'["\']' + re.escape(line.strip()) + r'["\']', code)
                    for line in lines if line.strip()
                )
                if all_found:
                    return True
        
        return False


# Global validator instance
validator = SolutionValidator()
