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
        actual_output: str,
        validation_rules: Dict[str, Any] = None
    ) -> ValidationResult:
        """
        Comprehensive validation of student solution.
        
        Args:
            code: Student's submitted code
            expected_output: Expected output for the mission
            required_concepts: Concepts that should be demonstrated
            difficulty: Mission difficulty level
            actual_output: Actual output from code execution
            validation_rules: Mission-specific validation rules from schema
            
        Returns:
            ValidationResult with validation details
        """
        issues = []
        detected_patterns = []
        score_multiplier = 1.0
        validation_rules = validation_rules or {}
        
        # CRITICAL: Determine validation mode FIRST
        # MODE A: OUTPUT-ONLY - No required concepts = just verify output exists (not exact match)
        # MODE B: CONCEPT-REQUIRED - Has required concepts = verify concepts + reasonable output
        all_required_concepts = list(required_concepts)
        if validation_rules.get('requiredConcepts'):
            all_required_concepts.extend(validation_rules['requiredConcepts'])
        
        is_output_only_mode = len(all_required_concepts) == 0
        
        # 1. Check output appropriately based on mode
        if validation_rules.get('requireExactOutput', False):
            # EXPLICIT requirement for exact output match (e.g., test cases)
            if actual_output.strip() != expected_output.strip():
                return ValidationResult(
                    is_valid=False,
                    score_multiplier=0.0,
                    issues=["Output doesn't match expected result"],
                    detected_patterns=[],
                    complexity_score=0
                )
        elif not is_output_only_mode:
            # CONCEPT-REQUIRED mode: Output should be reasonable but doesn't need exact match
            # Check if there's SOME output at least
            if not actual_output.strip():
                return ValidationResult(
                    is_valid=False,
                    score_multiplier=0.0,
                    issues=["No output produced"],
                    detected_patterns=[],
                    complexity_score=0
                )
        else:
            # OUTPUT-ONLY mode: Just verify SOME output exists
            # Student can print ANYTHING reasonable (different names, ages, etc.)
            if not actual_output.strip():
                return ValidationResult(
                    is_valid=False,
                    score_multiplier=0.0,
                    issues=["No output produced"],
                    detected_patterns=[],
                    complexity_score=0
                )
        
        # 2. Check for forbidden patterns (NEW from schema)
        if validation_rules.get('forbiddenPatterns'):
            forbidden_issues = self._check_forbidden_patterns(
                code, validation_rules['forbiddenPatterns']
            )
            if forbidden_issues:
                issues.extend(forbidden_issues)
                detected_patterns.append("forbidden_pattern")
                score_multiplier *= 0.3  # Severe penalty for using forbidden code
        
        # 3. Detect hardcoded output (cheating)
        # IMPORTANT: Only check if EXPLICITLY ENABLED in validation rules
        # By default, students can write simple code if it meets objectives
        # The mission objectives define requirements, not how code is structured
        should_check_hardcoding = validation_rules.get('disallowHardcodedOutput', False)
        
        if should_check_hardcoding:
            is_hardcoded, hardcode_issues = self._check_hardcoded_output(
                code, expected_output
            )
            if is_hardcoded:
                issues.extend(hardcode_issues)
                detected_patterns.append("hardcoded_output")
                score_multiplier *= 0.3  # Severe penalty
        
        # 4. Check for required concepts (only in CONCEPT-REQUIRED mode)
        missing_concepts = []
        if not is_output_only_mode:
            missing_concepts = self._check_required_concepts(code, all_required_concepts)
        if missing_concepts:
            issues.append(f"Missing required concepts: {', '.join(missing_concepts)}")
            detected_patterns.append("missing_concepts")
            score_multiplier *= 0.6
        
        # 5. Analyze code complexity (for metrics only, not validation)
        # REMOVED PENALTY: Don't penalize simple code if it meets objectives
        # The mission objectives define what's required, not arbitrary complexity metrics
        complexity_score = self._analyze_complexity(code, difficulty)
        
        # 6. Check for proper structure (only if concepts are required AND not met)
        # Don't penalize structure if objectives are met
        structure_issues = []
        if not is_output_only_mode and missing_concepts:
            # Only check structure if concepts are missing
            structure_issues = self._check_code_structure(code, all_required_concepts)
        if structure_issues:
            issues.extend(structure_issues)
            detected_patterns.append("poor_structure")
            score_multiplier *= 0.9  # Reduced penalty
        
        # 7. Detect copy-paste patterns (only if hardcoded output check is enabled)
        if should_check_hardcoding:
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
    
    def _check_forbidden_patterns(self, code: str, forbidden_patterns: List[str]) -> List[str]:
        """
        Check if code contains any forbidden patterns from mission schema.
        
        Args:
            code: Student's code
            forbidden_patterns: List of forbidden code patterns/keywords
            
        Returns:
            List of issues if forbidden patterns found
        """
        issues = []
        code_lower = code.lower()
        
        for pattern in forbidden_patterns:
            pattern_lower = pattern.lower()
            
            # Check for direct pattern match
            if pattern_lower in code_lower:
                issues.append(f"Forbidden pattern detected: '{pattern}'")
                continue
                
            # Check for pattern as a complete word (avoid false positives)
            import re
            if re.search(r'\b' + re.escape(pattern_lower) + r'\b', code_lower):
                issues.append(f"Forbidden keyword used: '{pattern}'")
        
        return issues
    
    def _check_hardcoded_output(
        self, 
        code: str, 
        expected_output: str
    ) -> Tuple[bool, List[str]]:
        """
        Check if code directly prints the expected output without ANY programming logic.
        
        CRITICAL: Only flag as hardcoding if code has ZERO programming constructs.
        If code uses variables, operations, loops, conditionals, etc., it's NOT hardcoding!
        
        Returns:
            Tuple of (is_hardcoded, list of issues)
        """
        issues = []
        code_clean = code.strip()
        expected_clean = expected_output.strip()
        
        # FIRST: Check if code has ANY programming constructs
        # If it does, it's NOT hardcoding regardless of output matching
        has_logic_constructs = any(keyword in code_clean for keyword in [
            'for ', 'while ', 'if ', 'elif ', 'else:', 'def ', 'class ',
            '=',  # Variable assignment ← KEY: This means code has logic!
            '+', '-', '*', '/', '//', '%', '**',  # Arithmetic operations
            'input(', 'range(', 'len(', 'int(', 'str(', 'float(',  # Function calls
            '[', '{',  # Data structures (lists, dicts)
        ])
        
        if has_logic_constructs:
            # Code has programming logic - NOT hardcoding!
            # Example: name = "Alex"; print(name) ← Uses variable = NOT hardcoding
            # Example: print(40 + 2) ← Uses arithmetic = NOT hardcoding
            return False, []
        
        # SECOND: Only check for hardcoding if code has NO logic
        # Check if code is extremely simple and just prints a literal
        code_lines = [line.strip() for line in code_clean.split('\n') if line.strip() and not line.strip().startswith('#')]
        
        # If code is very short (< 50 chars) and contains expected output as literal
        if len(code_clean) < 50 and expected_clean and len(expected_clean) > 3:
            # Check if it's just print("expected output")
            escaped_expected = re.escape(expected_clean)
            if re.search(r'print\s*\(\s*["\']' + escaped_expected + r'["\']\s*\)', code_clean):
                issues.append("Code directly prints the expected output without any logic or variables")
                return True, issues
        
        # Check for hardcoded numbers that match expected output
        if expected_clean.isdigit() and len(code_clean) < 30:
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
            'print': [r'\bprint\b'],
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
        
        CRITICAL: Only flags as copy-paste if there's NO programming logic.
        If code has variables, operations, loops, conditionals, it's NOT copy-paste!
        
        Returns:
            True if copy-paste detected
        """
        # FIRST: Check if code has ANY programming constructs
        has_logic_constructs = any(keyword in code for keyword in [
            'for ', 'while ', 'if ', 'elif ', 'else:', 'def ', 'class ',
            '=',  # Variable assignment ← KEY: This means code has logic!
            '+', '-', '*', '/', '//', '%', '**',  # Arithmetic operations
            'input(', 'range(', 'len(', 'int(', 'str(', 'float(',  # Function calls
            '[', '{',  # Data structures
        ])
        
        if has_logic_constructs:
            # Code has programming logic - NOT copy-paste!
            # Example: name = "Alex"; print(name) ← Uses variable = NOT copy-paste
            # Example: print(40 + 2) ← Uses arithmetic = NOT copy-paste
            return False
        
        # SECOND: Only check for copy-paste if code has NO logic
        # Check if expected output appears verbatim in code as string (only if code is simple)
        if expected_output and len(expected_output) > 5 and len(code) < 100:
            # Look for the exact string in the code
            pattern = r'["\']' + re.escape(expected_output.strip()) + r'["\']'
            if re.search(pattern, code):
                return True
        
        # Check for multi-line output being directly printed (only if code is simple)
        if '\n' in expected_output and len(code) < 200:
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
