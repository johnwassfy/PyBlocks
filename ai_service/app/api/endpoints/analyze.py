"""
Code analysis endpoint
Receives code from backend, analyzes it, and returns structured feedback.

Contract Alignment Notes
------------------------
This endpoint mirrors the DTOs defined in the Nest backend under
`backend/src/modules/ai-connector/dto/ai-analysis.dto.ts`. When adding or
removing fields from the request or response payloads, update both sides of the
contract and keep the field names in sync (snake_case in Python, camelCase in
the emitted JSON). The backend relies on the following keys for adaptive
learning:

- submission/user/mission identifiers
- detectedConcepts, weakConcepts, strongConcepts
- conceptScores, score, success flag
- attempts and timeSpent metadata (introduced for adaptive metrics)

If the backend rejects an update, structured warnings will now surface in both
services to simplify debugging.
"""
from fastapi import APIRouter, HTTPException, status, Depends
from app.models.requests import CodeAnalysisRequest
from app.models.responses import CodeAnalysisResponse, ErrorResponse
from app.services.code_executor import executor
from app.services.feedback_engine import feedback_engine
from app.services.backend_client import backend_client
from app.core.logger import logger, log_request, log_response, log_ai_analysis
from app.core.utils import timing_decorator
from app.core.security import verify_api_key
import time
import ast
import re


router = APIRouter(prefix="/analyze", tags=["Analysis"])


def _validate_step_based_learning(code: str, expected_output: str, required_concepts: list, previous_steps_completed: list) -> dict:
    """
    Validate if the student is learning progressively through steps.
    This checks if they're using concepts from previous steps and building on them.
    
    Returns:
        dict with:
            - is_valid: bool
            - score_multiplier: float (1.0 = full credit, 0.3 = cheating detected)
            - feedback: str
            - issues: list
    """
    issues = []
    score_multiplier = 1.0
    
    # Check if code contains the expected output as a hardcoded string
    # But only flag if it's NOT within proper control structures
    expected_lines = expected_output.strip().split('\n')
    code_lines = code.strip().split('\n')
    
    # Parse the code to check structure
    try:
        tree = ast.parse(code)
        
        # Find all string literals in the code
        string_literals = []
        for node in ast.walk(tree):
            if isinstance(node, ast.Constant) and isinstance(node.value, str):
                string_literals.append(node.value)
        
        # Check if expected output appears as a simple string literal
        # without any logic/control structures
        suspicious_hardcoding = False
        for expected_line in expected_lines:
            if expected_line in string_literals:
                # Found the expected output as a string literal
                # Now check if it's inside proper control structures
                has_control_flow = any(isinstance(node, (ast.If, ast.For, ast.While, ast.FunctionDef)) 
                                      for node in ast.walk(tree))
                
                # If there's no control flow and the string is printed directly, it's suspicious
                if not has_control_flow and len(string_literals) == 1:
                    suspicious_hardcoding = True
                    break
        
        if suspicious_hardcoding:
            issues.append("Code appears to hardcode the output without proper logic")
            score_multiplier *= 0.4
    
    except SyntaxError:
        # If we can't parse, assume it's okay (syntax errors caught elsewhere)
        pass
    
    # Check if required concepts from this step are used
    if required_concepts:
        concept_patterns = {
            'for-loop': r'\bfor\s+\w+\s+in\s+',
            'while-loop': r'\bwhile\s+.+:',
            'conditionals': r'\bif\s+.+:|elif\s+.+:|else\s*:',
            'if-statement': r'\bif\s+.+:',
            'functions': r'\bdef\s+\w+\s*\(',
            'def': r'\bdef\s+\w+\s*\(',
            'return': r'\breturn\b',
            'lists': r'\[.*\]|\.append\(|\.extend\(',
            'variables': r'\w+\s*=\s*',
            'print': r'\bprint\s*\(',
            'strings': r'["\'].*["\']|f["\']',
            'math': r'[\+\-\*/%]',
            'operators': r'[\+\-\*/%]|==|!=|<=|>=|<|>',
            'comparison': r'==|!=|<=|>=|<|>',
            'modulo': r'%',
            'range': r'\brange\s*\(',
        }
        
        missing_concepts = []
        for concept in required_concepts:
            pattern = concept_patterns.get(concept)
            if pattern and not re.search(pattern, code):
                missing_concepts.append(concept)
        
        if missing_concepts:
            issues.append(f"Missing required concepts from this step: {', '.join(missing_concepts)}")
            score_multiplier *= 0.6
    
    # Check if student is building on previous steps
    if previous_steps_completed:
        # If this is a later step, check if they're using concepts from earlier steps
        # This is a simple check - in practice, you'd track which concepts were in each step
        pass
    
    is_valid = len(issues) == 0
    
    if not is_valid:
        feedback = "⚠️ **Learning Progress Issue Detected**\n\n"
        for issue in issues:
            feedback += f"• {issue}\n"
        feedback += f"\n💡 **Tip:** This mission is designed to help you learn step-by-step. Make sure you're using the programming concepts taught in this step, not just copying the expected output!"
    else:
        feedback = ""
    
    return {
        'is_valid': is_valid,
        'score_multiplier': score_multiplier,
        'feedback': feedback,
        'issues': issues
    }


@router.post(
    "",
    response_model=CodeAnalysisResponse,
    summary="Analyze student code",
    description="Execute code, run tests, and generate AI-powered feedback",
    responses={
        200: {"description": "Analysis completed successfully"},
        400: {"model": ErrorResponse, "description": "Invalid request"},
        401: {"description": "Missing API Key"},
        403: {"description": "Invalid API Key"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
@timing_decorator
async def analyze_code(
    request: CodeAnalysisRequest,
    authenticated: bool = Depends(verify_api_key)
) -> CodeAnalysisResponse:
    """
    Main endpoint for code analysis
    
    This endpoint:
    1. Receives code from backend
    2. Executes it safely with timeout protection
    3. Runs test cases
    4. Generates AI feedback
    5. Returns structured analysis
    
    Example:
    ```json
    {
        "code": "def greet(name):\\n    return f'Hello, {name}!'",
        "missionId": "mission123",
        "userId": "user456",
        "testCases": ["greet('Alice') == 'Hello, Alice!'"],
        "concepts": ["function-definition", "string-formatting"],
        "difficulty": 3
    }
    ```
    """
    start_time = time.time()
    
    try:
        # Log request
        log_request("analyze", request.user_id, request.mission_id)
        
        # Validate syntax first (fast check)
        is_valid, syntax_error = executor.validate_syntax(request.code)
        if not is_valid:
            logger.warning(f"Syntax error detected: {syntax_error}")
            return CodeAnalysisResponse(
                success=False,
                score=0,
                feedback=f"❌ {syntax_error}",
                weak_concepts=request.concepts or [],
                strong_concepts=[],
                hints=["Check your code syntax carefully"],
                suggestions=["Make sure all parentheses, brackets, and quotes are properly closed"],
                test_results=[],
                execution_time=0.0,
                detected_concepts=[],
                complexity_score=0,
                error_type="SyntaxError",
                error_message=syntax_error
            )
        
        # Execute code
        execution_result = executor.execute(
            request.code,
            request.test_cases
        )
        
        # Validate output against expected output if provided
        output_matches = True
        validation_result = None
        
        if request.expected_output is not None and request.expected_output.strip():
            actual_output = (execution_result.get('stdout') or "").strip()
            expected = request.expected_output.strip()
            output_matches = actual_output == expected
            
            # If output matches, validate using STEP-BASED learning approach
            # This checks if the student is actually learning vs cheating
            if output_matches:
                # Extract validation settings from mission's validationRules
                validation_rules = request.validation_rules or {}
                required_concepts = validation_rules.get('requiredConcepts', request.concepts or [])
                forbidden_patterns = validation_rules.get('forbiddenPatterns', [])
                
                # Check if AI checkpoints are enabled for this step/mission
                if request.ai_checkpoints is not False:  # Default to True
                    # Use step-based validation
                    validation_result = _validate_step_based_learning(
                        code=request.code,
                        expected_output=expected,
                        required_concepts=required_concepts,
                        previous_steps_completed=[]  # TODO: Track completed steps from request
                    )
                    
                    # Check forbidden patterns if any
                    if forbidden_patterns:
                        code_lower = request.code.lower()
                        found_forbidden = [pattern for pattern in forbidden_patterns if pattern.lower() in code_lower]
                        if found_forbidden:
                            validation_result['is_valid'] = False
                            validation_result['issues'].append(f"Forbidden patterns found: {', '.join(found_forbidden)}")
                            validation_result['score_multiplier'] *= 0.5
                            validation_result['feedback'] += f"\n\n🚫 Your code uses forbidden patterns: {', '.join(found_forbidden)}"
                    
                    # If validation fails, treat as incorrect solution
                    if not validation_result['is_valid']:
                        output_matches = False
                        execution_result['success'] = False
                        logger.warning(
                            f"Step-based validation failed - Issues: {validation_result['issues']}"
                        )
            else:
                # If output doesn't match, override success flag
                execution_result['success'] = False
                logger.info(f"Output mismatch - Expected: '{expected}', Got: '{actual_output}'")
        
        # Generate AI feedback
        analysis = feedback_engine.generate_analysis(
            code=request.code,
            execution_result=execution_result,
            expected_concepts=request.concepts,
            difficulty=request.difficulty,
            attempts=request.attempts,
            time_spent=request.time_spent,
        )
        
        # Override analysis if output doesn't match expected or validation fails
        if not output_matches:
            analysis.success = False
            
            if validation_result and not validation_result['is_valid']:
                # Step-based validation failed (cheating/not learning properly detected)
                
                # Apply score penalty based on validation
                analysis.score = int(analysis.score * validation_result['score_multiplier'])
                analysis.score = max(10, min(analysis.score, 50))  # Cap between 10-50%
                
                # Add validation feedback to AI feedback
                analysis.feedback = f"{validation_result['feedback']}\n\n**Original AI Feedback:**\n{analysis.feedback}"
                
                # Add specific hints based on detected issues
                if any('hardcode' in issue.lower() for issue in validation_result['issues']):
                    analysis.hints.insert(0, "💡 Don't just print the expected answer - use the programming concepts to solve it!")
                if any('missing' in issue.lower() for issue in validation_result['issues']):
                    analysis.hints.insert(0, f"📚 Make sure to use the concepts taught in this step!")
            else:
                # Output mismatch (wrong answer)
                analysis.score = min(analysis.score, 30)  # Cap score at 30% for wrong output
                
                # Format expected vs actual output nicely
                expected_output = request.expected_output.strip()
                actual_output = (execution_result.get('stdout') or '(no output)').strip()
                
                # Build a clean comparison without markdown
                output_comparison = f"\n\n📊 Output Comparison:\n"
                output_comparison += f"   Expected: {expected_output}\n"
                output_comparison += f"   You got:  {actual_output if actual_output != '(no output)' else 'nothing printed'}\n"
                
                analysis.feedback = f"❌ Your code runs but produces incorrect output.{output_comparison}\n{analysis.feedback}"
        
        # Log analysis results
        log_ai_analysis(
            request.user_id or "anonymous",
            analysis.score,
            analysis.weak_concepts
        )
        
        # Update learning state in backend database (non-blocking)
        if request.user_id and request.submission_id:
            try:
                # Calculate concept scores for detected concepts
                concept_scores = {}
                for concept in analysis.detected_concepts:
                    # Score concepts based on success and presence
                    if analysis.success:
                        # High score if concept is used successfully
                        base_score = 80 + (analysis.score / 5)  # 80-100 range
                        concept_scores[concept] = min(100, int(base_score))
                    else:
                        # Lower score if execution failed
                        concept_scores[concept] = max(40, int(analysis.score * 0.6))
                
                # For expected concepts not detected, assign low scores
                for concept in (request.concepts or []):
                    if concept not in concept_scores:
                        concept_scores[concept] = 30  # Missing expected concept
                
                # Build analysis payload for backend
                analysis_payload = {
                    "detectedConcepts": analysis.detected_concepts,
                    "weaknesses": analysis.weak_concepts,
                    "strengths": analysis.strong_concepts,
                    "suggestions": analysis.suggestions,
                    "conceptScores": concept_scores,
                    "isSuccessful": analysis.success,
                    "score": analysis.score,
                }

                if request.attempts is not None:
                    analysis_payload["attempts"] = request.attempts
                if request.time_spent is not None:
                    analysis_payload["timeSpent"] = request.time_spent
                elif analysis.time_spent is not None:
                    analysis_payload["timeSpent"] = analysis.time_spent
                
                # Call backend to update learning state
                updated = await backend_client.update_learning_state(
                    user_id=request.user_id,
                    submission_id=request.submission_id,
                    analysis=analysis_payload
                )
                if updated:
                    logger.info(f"[ANALYZE] Learning state updated for user {request.user_id}")
                else:
                    logger.warning(
                        "[ANALYZE] Backend rejected learning state update",
                        extra={
                            "user_id": request.user_id,
                            "submission_id": request.submission_id,
                        }
                    )
                
            except Exception as update_error:
                # Don't fail analysis if update fails
                logger.error(f"[ANALYZE] Failed to update learning state: {update_error}")
        
        # Log response time
        duration_ms = (time.time() - start_time) * 1000
        log_response("analyze", analysis.success, duration_ms)
        
        return analysis
        
    except Exception as e:
        logger.error(f"Error analyzing code: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis failed: {str(e)}"
        )


@router.post(
    "/quick",
    response_model=CodeAnalysisResponse,
    summary="Quick syntax check",
    description="Fast syntax validation without full execution"
)
async def quick_check(request: CodeAnalysisRequest) -> CodeAnalysisResponse:
    """
    Quick endpoint for syntax checking only (no execution)
    
    Use this for live syntax checking as user types
    """
    try:
        is_valid, error = executor.validate_syntax(request.code)
        
        if is_valid:
            return CodeAnalysisResponse(
                success=True,
                score=100,
                feedback="✅ Syntax looks good!",
                weak_concepts=[],
                strong_concepts=[],
                hints=[],
                suggestions=[],
                test_results=[],
                execution_time=0.0,
                detected_concepts=[],
                complexity_score=0
            )
        else:
            return CodeAnalysisResponse(
                success=False,
                score=0,
                feedback=f"❌ {error}",
                weak_concepts=[],
                strong_concepts=[],
                hints=["Check your syntax"],
                suggestions=[],
                test_results=[],
                execution_time=0.0,
                detected_concepts=[],
                complexity_score=0,
                error_type="SyntaxError",
                error_message=error
            )
            
    except Exception as e:
        logger.error(f"Quick check error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
