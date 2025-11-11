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
from app.services.solution_validator import SolutionValidator
from app.core.logger import logger, log_request, log_response, log_ai_analysis
from app.core.utils import timing_decorator
from app.core.security import verify_api_key
import time
import ast
import re


router = APIRouter(prefix="/analyze", tags=["Analysis"])

# Initialize solution validator
solution_validator = SolutionValidator()


@router.post(
    "",
    response_model=CodeAnalysisResponse,
    summary="Analyze student code with rich context",
    description="Execute code, run tests, and generate AI-powered feedback using comprehensive context",
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
    Main endpoint for code analysis with rich context
    
    This endpoint supports both:
    1. NEW FORMAT: Rich context package with mission/student/submission/behavior/validation contexts
    2. LEGACY FORMAT: Simple code + mission_id + test_cases
    
    The AI uses the rich context to provide:
    - Personalized feedback tone based on student preferences
    - Adaptive difficulty based on student level and weak skills
    - Creative validation for storytelling/artistic missions
    - Proactive help triggers based on behavior metrics
    - Weighted scoring (output 40% + concepts 30% + structure 20% + creativity 10%)
    
    Example (new format):
    ```json
    {
        "missionId": "M_STORY_001",
        "missionContext": {
            "title": "The Storyteller",
            "validationMode": "creative",
            "expectedLineCount": 3
        },
        "studentContext": {
            "userId": "user_123",
            "aiTone": "friendly",
            "attemptNumber": 2
        },
        "submissionContext": {
            "code": "print('Once...')\\nprint('upon...')\\nprint('a time...')"
        },
        "validationContext": {
            "checkExactOutput": false,
            "checkLineCount": true,
            "allowCreativity": true
        }
    }
    ```
    """
    start_time = time.time()
    
    try:
        # Extract data from either new or legacy format
        code = request.get_code()
        user_id = request.get_user_id()
        validation_mode = request.get_validation_mode()
        
        # Log request
        log_request("analyze", user_id, request.mission_id)
        
        # Validate syntax first (fast check)
        is_valid, syntax_error = executor.validate_syntax(code)
        if not is_valid:
            logger.warning(f"Syntax error detected: {syntax_error}")
            
            # Get expected concepts for weak_concepts field
            expected_concepts = []
            if request.mission_context:
                expected_concepts = request.mission_context.concepts or []
            elif request.concepts:
                expected_concepts = request.concepts
            
            return CodeAnalysisResponse(
                success=False,
                score=0,
                feedback=f"❌ {syntax_error}",
                weak_concepts=expected_concepts,
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
        
        # Get test cases from either format
        test_cases = []
        if request.submission_context and request.submission_context.test_cases:
            test_cases = request.submission_context.test_cases
        elif request.test_cases:
            test_cases = request.test_cases
        
        # Execute code
        execution_result = executor.execute(code, test_cases)
        
        # === WEIGHTED SCORING SYSTEM ===
        # Components: output_match (40%) + concept_match (30%) + structure_match (20%) + creativity_bonus (10%)
        
        output_score = 0.0  # 0-100
        concept_score = 0.0  # 0-100
        structure_score = 0.0  # 0-100
        creativity_score = 0.0  # 0-100
        
        validation_result = None
        output_matches = True
        
        # Get validation context
        val_ctx = request.validation_context
        if not val_ctx:
            # Legacy mode: create default validation context
            val_ctx = type('obj', (object,), {
                'check_exact_output': True,
                'check_line_count': False,
                'check_concepts': True,
                'disallow_hardcoded_output': True,
                'allow_creativity': validation_mode == 'creative',
                'forbidden_patterns': []
            })()
        
        # Get expected output and concepts
        expected_output = None
        expected_line_count = None
        required_concepts = []
        
        if request.mission_context:
            expected_output = request.mission_context.expected_output
            expected_line_count = request.mission_context.expected_line_count
            required_concepts = request.mission_context.concepts or []
        elif request.expected_output:
            expected_output = request.expected_output
            required_concepts = request.concepts or []
        
        # === OUTPUT VALIDATION (40% of score) ===
        if expected_output is not None and expected_output.strip():
            actual_output = (execution_result.get('stdout') or "").strip()
            expected = expected_output.strip()
            
            if val_ctx.check_exact_output:
                # STRICT MODE: Exact string match
                if actual_output == expected:
                    output_score = 100
                    output_matches = True
                else:
                    output_matches = False
                    # Partial credit for similar output
                    from difflib import SequenceMatcher
                    similarity = SequenceMatcher(None, actual_output, expected).ratio()
                    output_score = similarity * 100
            
            elif val_ctx.check_line_count:
                # CREATIVE MODE: Line count matching
                actual_lines = [line for line in actual_output.split('\n') if line.strip()]
                expected_lines = [line for line in expected.split('\n') if line.strip()]
                
                if expected_line_count:
                    # Use explicit line count from mission
                    if len(actual_lines) == expected_line_count:
                        output_score = 100
                        output_matches = True
                    else:
                        # Partial credit based on line count difference
                        diff = abs(len(actual_lines) - expected_line_count)
                        output_score = max(0, 100 - (diff * 20))
                        output_matches = len(actual_lines) == expected_line_count
                elif len(actual_lines) == len(expected_lines):
                    output_score = 100
                    output_matches = True
                else:
                    # Partial credit
                    diff = abs(len(actual_lines) - len(expected_lines))
                    output_score = max(0, 100 - (diff * 20))
                    output_matches = len(actual_lines) == len(expected_lines)
            else:
                # CONCEPT-ONLY MODE: Output doesn't matter
                output_score = 100
                output_matches = True
            
            # Run anti-cheating validation if output matches
            if output_matches and val_ctx.disallow_hardcoded_output:
                # Get difficulty from mission context or legacy field
                difficulty = 'easy'
                if request.mission_context:
                    difficulty = str(request.mission_context.difficulty or 1)
                elif request.difficulty:
                    difficulty = str(request.difficulty)
                
                # Build validation rules dict
                validation_rules = {}
                if request.validation_rules:
                    validation_rules = request.validation_rules
                elif val_ctx.forbidden_patterns:
                    validation_rules['forbiddenPatterns'] = val_ctx.forbidden_patterns
                
                validation_result_obj = solution_validator.validate_solution(
                    code=code,
                    expected_output=expected,
                    required_concepts=required_concepts,
                    difficulty=difficulty,
                    actual_output=actual_output,
                    validation_rules=validation_rules
                )
                
                validation_result = {
                    'is_valid': validation_result_obj.is_valid,
                    'score_multiplier': validation_result_obj.score_multiplier,
                    'issues': validation_result_obj.issues,
                    'detected_patterns': validation_result_obj.detected_patterns,
                    'complexity_score': validation_result_obj.complexity_score,
                    'feedback': ''
                }
                
                if not validation_result_obj.is_valid:
                    # Cheating detected - penalize output score
                    output_score *= validation_result_obj.score_multiplier
                    output_matches = False
                    execution_result['success'] = False
                    
                    # Build feedback
                    feedback_parts = ["⚠️ Learning Progress Issue Detected\n"]
                    for issue in validation_result_obj.issues:
                        feedback_parts.append(f"• {issue}")
                    
                    if 'hardcoded_output' in validation_result_obj.detected_patterns:
                        feedback_parts.append("\n💡 Tip: Don't just print the expected answer - use the programming concepts to solve it!")
                    if 'missing_concepts' in validation_result_obj.detected_patterns:
                        feedback_parts.append("\n📚 Tip: Make sure to use the concepts taught in this step!")
                    if 'forbidden_pattern' in validation_result_obj.detected_patterns:
                        feedback_parts.append("\n🚫 Tip: Some code patterns are not allowed in this mission!")
                    
                    validation_result['feedback'] = '\n'.join(feedback_parts)
                    logger.warning(f"Validation failed - Issues: {validation_result_obj.issues}")
        else:
            # No expected output - full credit for output component
            output_score = 100
        
        # === CONCEPT DETECTION (30% of score) ===
        # Detect which concepts are actually used in the code
        detected_concepts = []
        code_lower = code.lower()
        
        # Common Python concepts to detect
        concept_patterns = {
            'print': ['print(', 'print '],
            'input': ['input(', 'input '],
            'variables': ['='],
            'strings': ['"', "'"],
            'if': ['if '],
            'else': ['else:'],
            'elif': ['elif '],
            'for': ['for ', 'for('],
            'while': ['while ', 'while('],
            'function': ['def '],
            'return': ['return '],
            'list': ['[', 'list('],
            'dict': ['{', 'dict('],
            'tuple': ['(', 'tuple('],
            'class': ['class '],
            'import': ['import ', 'from '],
            'try': ['try:'],
            'except': ['except'],
            'with': ['with '],
            'lambda': ['lambda '],
            'comprehension': ['for ', 'if ']
        }
        
        for concept, patterns in concept_patterns.items():
            if any(pattern in code_lower for pattern in patterns):
                detected_concepts.append(concept)
        
        # Calculate concept score
        if required_concepts:
            matched_concepts = [c for c in required_concepts if c in detected_concepts]
            concept_score = (len(matched_concepts) / len(required_concepts)) * 100
        else:
            # No required concepts - full credit
            concept_score = 100
        
        # === STRUCTURE SCORE (20% of score) ===
        # Based on code complexity and structure
        structure_score = 50  # Base score
        
        try:
            # Parse AST to analyze structure
            tree = ast.parse(code)
            
            # Reward proper structure
            if len(tree.body) > 0:
                structure_score += 10  # Has code structure
            
            # Count functions
            funcs = [node for node in ast.walk(tree) if isinstance(node, ast.FunctionDef)]
            if funcs:
                structure_score += 15  # Uses functions
            
            # Count control flow
            control_flow = [node for node in ast.walk(tree) 
                          if isinstance(node, (ast.If, ast.For, ast.While))]
            if control_flow:
                structure_score += 15  # Uses control flow
            
            # Check for comments
            if '#' in code:
                structure_score += 10  # Has comments
            
            structure_score = min(100, structure_score)
        except:
            # If parsing fails, use default
            structure_score = 50
        
        # === CREATIVITY SCORE (10% of score) ===
        creativity_score = 0
        
        if val_ctx.allow_creativity:
            # Reward creative solutions
            creativity_score = 50  # Base creativity credit
            
            # Check for unique output (if storytelling)
            if expected_output and (execution_result.get('stdout') or "").strip():
                actual = (execution_result.get('stdout') or "").strip()
                if actual != expected_output.strip() and output_matches:
                    # Different text but correct structure
                    creativity_score += 30
            
            # Check for advanced concepts
            advanced_concepts = ['function', 'class', 'lambda', 'comprehension']
            if any(c in detected_concepts for c in advanced_concepts):
                creativity_score += 20
            
            creativity_score = min(100, creativity_score)
        
        # === CALCULATE WEIGHTED FINAL SCORE ===
        final_score = int(
            output_score * 0.4 +
            concept_score * 0.3 +
            structure_score * 0.2 +
            creativity_score * 0.1
        )
        
        # === DETERMINE SUCCESS BASED ON MISSION OBJECTIVES (NOT JUST OUTPUT) ===
        # Success criteria priority: Objectives > Concepts > Structure > Output
        
        # 1. Check if code executes without errors
        code_runs = execution_result.get('success', False)
        
        # 2. Check if required concepts are used (PRIMARY CRITERION)
        concepts_achieved = concept_score >= 70  # Must use at least 70% of required concepts
        
        # 3. Check if output structure is valid (for creative/storytelling missions)
        structure_valid = True
        if validation_mode == 'creative':
            structure_valid = output_matches  # Line count matches
        elif validation_mode == 'concept-only':
            structure_valid = True  # Output doesn't matter
        elif validation_mode == 'strict':
            structure_valid = output_matches  # Exact output match
        
        # 4. Check if code has proper structure
        code_structure_ok = structure_score >= 50
        
        # === SUCCESS DETERMINATION LOGIC ===
        # Different modes prioritize different aspects
        if validation_mode == 'creative':
            # Creative mode: Concepts (60%) + Structure (30%) + Execution (10%)
            success = (
                concepts_achieved and  # MUST use required concepts
                structure_valid and    # MUST have correct line count
                code_runs              # MUST execute without errors
            )
            # Even if output text is different, if concepts + structure are good = SUCCESS
            
        elif validation_mode == 'concept-only':
            # Concept-only mode: Only concepts matter (90%) + Execution (10%)
            success = (
                concepts_achieved and  # MUST use required concepts
                code_runs              # MUST execute without errors
            )
            # Output is completely ignored
            
        elif validation_mode == 'strict':
            # Strict mode: Everything must be perfect
            success = (
                concepts_achieved and  # MUST use required concepts
                structure_valid and    # MUST match expected output exactly
                code_runs and          # MUST execute without errors
                code_structure_ok      # SHOULD have decent structure
            )
            
        else:
            # Default/Legacy: Balanced approach
            # Prioritize objectives (concepts) over exact output matching
            success = (
                concepts_achieved and  # PRIMARY: Must use required concepts
                code_runs and          # SECONDARY: Must execute
                (structure_valid or code_structure_ok)  # TERTIARY: Either output OR structure is good
            )
        
        # === OVERRIDE FOR HIGH SCORES ===
        # If final score is very high (>= 80), consider it a success even if strict criteria not met
        # This handles edge cases where student achieves objectives in creative ways
        if final_score >= 80 and code_runs and concepts_achieved:
            success = True
        
        # Get student context for personalized feedback
        student_ctx = request.student_context
        ai_tone = 'friendly'
        attempt_number = 1
        previous_feedback = None
        
        if student_ctx:
            ai_tone = student_ctx.ai_tone or 'friendly'
            attempt_number = student_ctx.attempt_number or 1
            previous_feedback = student_ctx.previous_feedback
        
        # Get behavior metrics for proactive help
        behavior_ctx = request.behavior_metrics
        should_offer_proactive_help = False
        
        if behavior_ctx:
            # Trigger proactive help if student is struggling
            if behavior_ctx.idle_time and behavior_ctx.idle_time > 300:  # 5 minutes idle
                should_offer_proactive_help = True
            if behavior_ctx.errors_last_attempt and behavior_ctx.errors_last_attempt > 3:
                should_offer_proactive_help = True
            if attempt_number > 5:
                should_offer_proactive_help = True
        
        # Generate AI feedback with rich context
        analysis = feedback_engine.generate_analysis(
            code=code,
            execution_result=execution_result,
            expected_concepts=required_concepts,
            difficulty=request.mission_context.difficulty if request.mission_context else request.difficulty,
            attempts=attempt_number,
            time_spent=student_ctx.time_spent if student_ctx else request.time_spent,
            current_step=request.current_step,
            total_steps=None,
            validation_result=validation_result if validation_result else None,
            ai_model=request.ai_model,  # Pass dynamic model selection
        )
        
        # Override analysis with weighted scoring results
        analysis.score = final_score
        analysis.success = success
        analysis.detected_concepts = detected_concepts
        
        # Calculate weak and strong concepts
        weak_concepts = []
        strong_concepts = []
        
        for concept in required_concepts:
            if concept not in detected_concepts:
                weak_concepts.append(concept)
            else:
                strong_concepts.append(concept)
        
        # Add detected concepts not in requirements
        for concept in detected_concepts:
            if concept not in required_concepts:
                strong_concepts.append(concept)
        
        analysis.weak_concepts = weak_concepts
        analysis.strong_concepts = strong_concepts
        
        # Customize feedback based on student tone preference
        if ai_tone == 'encouraging' and not success:
            analysis.feedback = f"🌟 Great effort! {analysis.feedback}"
        elif ai_tone == 'challenging' and success:
            analysis.feedback = f"✨ Nice work! Ready for a tougher challenge? {analysis.feedback}"
        
        # Add proactive help if needed
        if should_offer_proactive_help:
            if attempt_number > 5:
                analysis.hints.insert(0, "💡 You've been working hard on this! Would you like a hint or a quick video tutorial?")
            elif behavior_ctx and behavior_ctx.idle_time and behavior_ctx.idle_time > 300:
                analysis.hints.insert(0, "🤔 Feeling stuck? Try breaking down the problem into smaller steps!")
        
        # Add validation feedback if cheating detected
        if validation_result and not validation_result['is_valid']:
            analysis.feedback = f"{validation_result['feedback']}\n\n**AI Feedback:**\n{analysis.feedback}"
            
            for issue in validation_result['issues']:
                if 'hardcode' in issue.lower():
                    analysis.hints.insert(0, "💡 Don't just print the expected answer - use the programming concepts to solve it!")
                if 'missing' in issue.lower():
                    analysis.hints.insert(0, "📚 Make sure to use the concepts taught in this mission!")
        
        # === OBJECTIVES-FOCUSED FEEDBACK ===
        # Provide meaningful feedback based on what was achieved, not just output matching
        
        if success:
            # SUCCESS: Objectives achieved!
            if validation_mode == 'creative':
                analysis.feedback = f"🌟 Excellent! You achieved the mission objectives!\n\n✅ Concepts mastered: {', '.join(strong_concepts) if strong_concepts else 'None'}\n✅ Code structure: Good\n✅ Creativity: Well done!\n\n{analysis.feedback}"
            elif validation_mode == 'concept-only':
                analysis.feedback = f"🎯 Perfect! You used the required concepts correctly!\n\n✅ Concepts used: {', '.join(strong_concepts) if strong_concepts else 'None'}\n\n{analysis.feedback}"
            else:
                analysis.feedback = f"✨ Great work! Mission objectives achieved!\n\n✅ All required concepts used\n✅ Code executes correctly\n\n{analysis.feedback}"
        else:
            # NOT SUCCESS: Provide constructive feedback based on what's missing
            missing_parts = []
            
            if not code_runs:
                missing_parts.append("⚠️ Code has execution errors")
            if not concepts_achieved:
                missing_parts.append(f"📚 Missing concepts: {', '.join(weak_concepts) if weak_concepts else 'None'}")
            if not structure_valid and validation_mode != 'concept-only':
                if validation_mode == 'creative':
                    missing_parts.append(f"📏 Output structure: Expected {expected_line_count} lines, got {len([l for l in (execution_result.get('stdout') or '').split('\\n') if l.strip()])}")
                else:
                    missing_parts.append("📊 Output doesn't match expected result")
            
            feedback_header = "🔍 Mission objectives not fully achieved yet. Here's what to work on:\n\n"
            analysis.feedback = feedback_header + '\n'.join(missing_parts) + f"\n\n{analysis.feedback}"
        
        # Add informational output comparison (not judgemental)
        if expected_output and validation_mode != 'concept-only':
            actual_output = (execution_result.get('stdout') or '(no output)').strip()
            expected_formatted = expected_output.strip()
            
            if actual_output and actual_output != expected_formatted:
                output_info = f"\n\n💡 FYI - Output Preview:\n"
                output_info += f"   Your output: {actual_output[:100]}{'...' if len(actual_output) > 100 else ''}\n"
                
                # Only show expected output in strict mode
                if validation_mode == 'strict':
                    output_info += f"   Expected: {expected_formatted[:100]}{'...' if len(expected_formatted) > 100 else ''}\n"
                
                analysis.feedback += output_info
        
        # Log analysis results
        log_ai_analysis(
            user_id or "anonymous",
            analysis.score,
            analysis.weak_concepts
        )
        
        # Update learning state in backend database (non-blocking)
        if user_id and request.submission_id:
            try:
                # Calculate concept scores
                concept_scores = {}
                for concept in detected_concepts:
                    if success:
                        base_score = 80 + (final_score / 5)
                        concept_scores[concept] = min(100, int(base_score))
                    else:
                        concept_scores[concept] = max(40, int(final_score * 0.6))
                
                for concept in required_concepts:
                    if concept not in concept_scores:
                        concept_scores[concept] = 30
                
                # Build analysis payload
                analysis_payload = {
                    "detectedConcepts": detected_concepts,
                    "weaknesses": weak_concepts,
                    "strengths": strong_concepts,
                    "suggestions": analysis.suggestions,
                    "conceptScores": concept_scores,
                    "isSuccessful": success,
                    "score": final_score,
                }

                if attempt_number:
                    analysis_payload["attempts"] = attempt_number
                if student_ctx and student_ctx.time_spent:
                    analysis_payload["timeSpent"] = student_ctx.time_spent
                elif request.time_spent:
                    analysis_payload["timeSpent"] = request.time_spent
                
                # Call backend to update learning state
                updated = await backend_client.update_learning_state(
                    user_id=user_id,
                    submission_id=request.submission_id,
                    analysis=analysis_payload
                )
                if updated:
                    logger.info(f"[ANALYZE] Learning state updated for user {user_id}")
                else:
                    logger.warning(
                        "[ANALYZE] Backend rejected learning state update",
                        extra={
                            "user_id": user_id,
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
