"""
AI Feedback Engine
Generates intelligent feedback, hints, and suggestions for student code

🔥 AI MODEL INTEGRATION POINT:
Replace rule-based logic with actual AI model calls in the methods marked with # AI MODEL CALL
"""
import random
import time
from typing import List, Dict, Any, Optional
from app.core.config import settings
from app.core.logger import logger
from app.core.event_logger import event_logger
from app.core.utils import extract_concepts, calculate_code_complexity, format_error_message
from app.core.code_differentiator import RequestCodeExtractor
from app.models.responses import CodeAnalysisResponse, HintResponse


class FeedbackEngine:
    """
    Generates adaptive feedback based on code analysis
    
    🔥 TO INTEGRATE YOUR AI MODEL:
    1. Import your AI client in this file (e.g., OpenAI, HuggingFace, Claude)
    2. Initialize it in __init__ with API key from settings
    3. Replace the rule-based methods with actual AI API calls
    4. Keep the same return types for compatibility
    """
    
    def __init__(self):
        self.ai_provider = settings.AI_MODEL_PROVIDER
        self.model_name = settings.AI_MODEL_NAME
        self.ai_client = None
        
        # 🔥 AI MODEL INITIALIZATION - OpenRouter (Cheap models like GLM-4.5-Air)
        if self.ai_provider == "openrouter":
            try:
                from openai import OpenAI
                self.ai_client = OpenAI(
                    base_url="https://openrouter.ai/api/v1",
                    api_key=settings.OPENROUTER_API_KEY,
                )
                logger.info(f"[FEEDBACK] OpenRouter AI initialized with model: {self.model_name}")
                logger.info(f"[FEEDBACK] Using cheap model - $0.14/M input (~7M tokens per $1)")
            except ImportError:
                logger.error("[FEEDBACK] openai not installed! Run: pip install openai")
                self.ai_client = None
            except Exception as e:
                logger.error(f"[FEEDBACK] Failed to initialize OpenRouter: {e}")
                self.ai_client = None
        
        # HuggingFace (FREE)
        elif self.ai_provider == "huggingface":
            try:
                from huggingface_hub import InferenceClient
                self.ai_client = InferenceClient(api_key=settings.HUGGINGFACE_API_KEY)
                logger.info(f"[FEEDBACK] HuggingFace AI initialized with model: {self.model_name}")
            except ImportError:
                logger.error("[FEEDBACK] huggingface_hub not installed! Run: pip install huggingface_hub")
                self.ai_client = None
            except Exception as e:
                logger.error(f"[FEEDBACK] Failed to initialize HuggingFace: {e}")
                self.ai_client = None
        
        # OpenAI (Paid option)
        elif self.ai_provider == "openai":
            try:
                from openai import OpenAI
                self.ai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
                logger.info(f"[FEEDBACK] OpenAI initialized with model: {self.model_name}")
            except ImportError:
                logger.error("[FEEDBACK] openai not installed! Run: pip install openai")
                self.ai_client = None
            except Exception as e:
                logger.error(f"[FEEDBACK] Failed to initialize OpenAI: {e}")
                self.ai_client = None
        
        # Rule-based fallback
        else:
            logger.warning(f"[FEEDBACK] Using rule-based feedback (provider: {self.ai_provider})")
            self.ai_client = None
        
        logger.info(f"[FEEDBACK] FeedbackEngine initialized with provider: {self.ai_provider}")
    
    def generate_analysis(
        self,
        code: str,
        execution_result: Dict[str, Any],
        expected_concepts: List[str] = None,
        objectives: List[str] = None,  # NEW: Mission objectives
        mission_description: Optional[str] = None,  # NEW: Mission description
        difficulty: int = 5,
        attempts: Optional[int] = None,
        time_spent: Optional[float] = None,
        current_step: Optional[int] = None,
        total_steps: Optional[int] = None,
        validation_result: Optional[Dict[str, Any]] = None,
        user_id: str = "unknown",
        mission_id: str = "unknown",
        ai_model: Optional[str] = None,  # NEW: Dynamic model selection
        mission_context: Optional[Dict[str, Any]] = None,  # NEW: For code differentiation
    ) -> CodeAnalysisResponse:
        """
        Generate comprehensive code analysis with feedback
        
        🔥 AI MODEL CALL: Replace rule-based logic with your AI model
        
        Args:
            code: Student's code
            execution_result: Results from code executor
            expected_concepts: Concepts this mission should teach
            objectives: Mission learning objectives (what student should achieve)
            mission_description: Mission description (how to achieve objectives)
            difficulty: Mission difficulty (1-10)
            attempts: Number of attempts made (for adaptive metrics)
            time_spent: Time spent on this mission (for adaptive metrics)
            current_step: Current step number in step-based missions
            total_steps: Total number of steps in mission
            validation_result: Validation result from solution_validator
            user_id: User identifier for analytics
            mission_id: Mission identifier for analytics
            ai_model: AI model to use (overrides default from .env)
            mission_context: Mission context for code differentiation (with starter_code)
            
        Returns:
            CodeAnalysisResponse with feedback
        """
        start_time = time.time()
        
        # Use provided model or fall back to default
        model_to_use = ai_model or self.model_name
        
        # 🔑 DIFFERENTIATE USER CODE FROM STARTER CODE
        user_code = code
        user_line_numbers = None
        has_starter_code = False
        
        if mission_context:
            try:
                code_analysis = RequestCodeExtractor.process_request(
                    {
                        'mission_context': mission_context,
                        'submission_context': {'code': code}
                    },
                    service_type='feedback'
                )
                user_code = code_analysis.get('user_code', code)
                user_line_numbers = code_analysis.get('user_line_numbers', [])
                has_starter_code = code_analysis.get('has_starter_code', False)
                logger.info(f"[FEEDBACK] Identified {len(user_line_numbers or [])} user code lines out of {len(code.split(chr(10)))} total")
            except Exception as e:
                logger.warning(f"[FEEDBACK] Code differentiation failed: {e}")
        
        # Extract information
        detected_concepts = extract_concepts(code)
        complexity = calculate_code_complexity(code)
        success = execution_result['success']
        test_results = execution_result.get('test_results', [])
        
        # Calculate score
        score = self._calculate_score(execution_result, expected_concepts, detected_concepts)
        
        # 🔥 AI MODEL CALL - Use AI if available, otherwise use rule-based
        if self.ai_client and self.ai_provider in ["openrouter", "openai"]:
            try:
                # Build prompt for AI
                prompt = self._build_analysis_prompt(
                    code,  # Original full code (used to show full context to AI)
                    execution_result, 
                    expected_concepts,
                    detected_concepts,
                    success,
                    score,
                    objectives=objectives,  # NEW: Pass objectives
                    mission_description=mission_description,  # NEW: Pass mission description
                    current_step=current_step,
                    total_steps=total_steps,
                    validation_result=validation_result,
                    user_code=user_code,  # User-written code only
                    user_line_numbers=user_line_numbers,
                    has_starter_code=has_starter_code
                )
                
                ai_start = time.time()
                # Call AI model (OpenAI-compatible API)
                response = self.ai_client.chat.completions.create(
                    model=model_to_use,  # Use dynamic model selection
                    messages=[
                        {
                            "role": "system",
                            "content": """You are an expert Python tutor providing feedback on student code submissions.

FEEDBACK STRUCTURE (keep it concise, 3-4 sentences max):
1. 🎯 **What worked**: Specifically mention correct parts of their code
2. 🔍 **What needs improvement**: Identify the exact issue with line numbers/code references
3. 💡 **How to fix it**: Give a guiding hint, not the solution
4. 🚀 **Encouragement**: Motivate them to try again

EXAMPLES OF GOOD FEEDBACK:
✅ "Great job initializing your variables! I noticed on line 5 you wrote 'rang(10)' - you're missing an 'e' in 'range'. Python functions need to be spelled exactly right. Fix that typo and you'll be good to go! 🎯"

✅ "Your loop structure looks perfect! However, on line 8, you're trying to print 'total' but you haven't created that variable yet. What value should 'total' start at before your loop begins? Try adding that line before your loop! 💪"

TONE: Encouraging but specific. Avoid generic praise. Reference actual code elements."""
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    temperature=settings.AI_TEMPERATURE,
                    max_tokens=settings.AI_MAX_TOKENS
                )
                
                ai_response_time = (time.time() - ai_start) * 1000  # milliseconds
                feedback = response.choices[0].message.content.strip()
                logger.info(f"[FEEDBACK] Generated AI feedback ({len(feedback)} chars) in {ai_response_time:.0f}ms")
                
                # 🔍 PARSE AI'S SUCCESS DETERMINATION (YES/NO)
                # The AI is the single source of truth for whether objectives are met
                ai_determined_success = self._parse_ai_success_determination(feedback)
                if ai_determined_success is not None:
                    success = ai_determined_success
                    logger.info(f"[FEEDBACK] AI determined success: {success}")
                
                # 📊 LOG AI FEEDBACK GENERATION EVENT
                event_logger.log_feedback_generated(
                    model_name=self.model_name,
                    user_id=user_id,
                    mission_id=mission_id,
                    feedback=feedback,
                    score=score,
                    success=success,
                    response_time_ms=ai_response_time
                )
                
            except Exception as e:
                logger.error(f"[FEEDBACK] AI call failed: {e}, falling back to rule-based")
                
                # 📊 LOG MODEL ERROR
                event_logger.log_model_error(
                    model_name=self.model_name,
                    user_id=user_id,
                    mission_id=mission_id,
                    error_type="ai_generation_failed",
                    error_message=str(e)
                )
                
                feedback = self._generate_rule_based_feedback(
                    success, 
                    score, 
                    detected_concepts, 
                    expected_concepts,
                    execution_result.get('error_message')
                )
        else:
            # Rule-based feedback fallback
            feedback = self._generate_rule_based_feedback(
                success, 
                score, 
                detected_concepts, 
                expected_concepts,
                execution_result.get('error_message')
            )
        
        # Identify weak and strong concepts
        weak_concepts, strong_concepts = self._analyze_concepts(
            detected_concepts,
            expected_concepts,
            success
        )
        
        # Generate hints and suggestions
        hints = self._generate_hints(code, execution_result, weak_concepts)
        suggestions = self._generate_suggestions(code, detected_concepts, complexity)
        
        # 📊 LOG CODE ANALYSIS EVENT
        total_response_time = (time.time() - start_time) * 1000
        event_logger.log_code_analysis(
            model_name=self.model_name,
            user_id=user_id,
            mission_id=mission_id,
            code_length=len(code),
            detected_concepts=detected_concepts,
            weak_concepts=weak_concepts,
            strong_concepts=strong_concepts,
            response_time_ms=total_response_time
        )
        
        # Final return with AI-determined success value
        return CodeAnalysisResponse(
            success=success,  # This now reflects AI's YES/NO determination
            score=score,
            feedback=feedback,
            weak_concepts=weak_concepts,
            strong_concepts=strong_concepts,
            hints=hints,
            suggestions=suggestions,
            test_results=test_results,
            execution_time=execution_result['execution_time'],
            detected_concepts=detected_concepts,
            complexity_score=complexity,
            error_type=execution_result.get('error_type'),
            error_message=execution_result.get('error_message'),
            attempts=attempts,
            time_spent=time_spent,
        )
    
    def generate_hint(
        self,
        code: str,
        error_message: Optional[str],
        expected_concepts: List[str],
        attempt_number: int,
        user_id: str = "unknown",
        mission_id: str = "unknown",
        was_requested: bool = True
    ) -> HintResponse:
        """
        Generate contextual hint based on student's progress
        
        🔥 AI MODEL CALL: Replace with your AI model for smarter hints
        
        Args:
            code: Student's current code
            error_message: Current error if any
            expected_concepts: Expected concepts
            attempt_number: How many attempts so far
            user_id: User identifier for analytics
            mission_id: Mission identifier for analytics
            was_requested: Whether hint was requested by user or proactive
            
        Returns:
            HintResponse with helpful hint
        """
        start_time = time.time()
        detected_concepts = extract_concepts(code)
        
        # 🔥 AI MODEL CALL HERE for personalized hints
        # Example: Generate hint based on error and missing concepts
        
        # Determine hint difficulty (more direct as attempts increase)
        hint_level = min(attempt_number // 2 + 1, 3)
        
        # Generate hint based on what's missing
        if error_message:
            hint = self._generate_error_hint(error_message, hint_level)
            hint_type = "syntax" if "Syntax" in error_message else "logic"
        else:
            hint = self._generate_concept_hint(expected_concepts, detected_concepts, hint_level)
            hint_type = "concept"
        
        # Add encouragement for struggling students
        if attempt_number > 3:
            hint = f"💪 Keep trying! {hint}"
        
        # 📊 LOG HINT GENERATION EVENT
        response_time = (time.time() - start_time) * 1000
        event_logger.log_hint_generated(
            model_name=self.model_name,
            user_id=user_id,
            mission_id=mission_id,
            hint_text=hint,
            hint_type=hint_type,
            was_requested=was_requested,
            response_time_ms=response_time
        )
        
        return HintResponse(
            hint=hint,
            hint_type=hint_type,
            related_concepts=expected_concepts,
            example=self._generate_example(expected_concepts) if hint_level == 3 else None,
            difficulty_level=hint_level
        )
    
    # ============= PRIVATE HELPER METHODS =============
    
    def _build_analysis_prompt(
        self,
        code: str,
        execution_result: Dict[str, Any],
        expected_concepts: List[str],
        detected_concepts: List[str],
        success: bool,
        score: int,
        objectives: Optional[List[str]] = None,  # NEW: Mission objectives
        mission_description: Optional[str] = None,  # NEW: Mission description
        current_step: Optional[int] = None,
        total_steps: Optional[int] = None,
        validation_result: Optional[Dict[str, Any]] = None,
        user_code: Optional[str] = None,  # NEW: User-written code only
        user_line_numbers: Optional[List[int]] = None,  # NEW: Line numbers of user code
        has_starter_code: bool = False,  # NEW: Whether submission has starter code
    ) -> str:
        """
        Build a comprehensive prompt for AI to analyze code
        
        Args:
            code: Student's code
            execution_result: Execution results
            expected_concepts: Expected concepts for the mission
            detected_concepts: Concepts detected in code
            success: Whether code passed tests
            score: Calculated score (0-100)
            objectives: Mission learning objectives (what student should achieve)
            mission_description: Mission description (how to solve the mission)
            current_step: Current step number (for step-based missions)
            total_steps: Total number of steps (for step-based missions)
            validation_result: Validation result from solution_validator
            user_code: User-written code only (if differentiated from starter)
            user_line_numbers: Line numbers of user-written code
            has_starter_code: Whether submission has starter code
            
        Returns:
            Formatted prompt for AI
        """
        test_results = execution_result.get('test_results', [])
        error_message = execution_result.get('error_message', '')
        expected_output = execution_result.get('expected_output', '')
        actual_output = execution_result.get('stdout', '')
        
        # Use user code for display (not full code with starter)
        # THIS IS CRITICAL: Show AI ONLY the user-written code, not the starter code
        code_to_show = user_code if user_code else code
        
        # Build step context if available
        step_context = ""
        if current_step is not None and total_steps is not None:
            step_context = f"\n**Mission Progress:** Step {current_step} of {total_steps}"
        
        # Build starter code note if applicable
        starter_note = ""
        if has_starter_code and user_line_numbers:
            starter_note = f"\n⚠️ **IMPORTANT**: This submission includes starter/template code. The code shown above is ONLY the user-written portion. Do NOT comment on or suggest changes to any starter code."
        
        # NEW: Build mission description section - CRITICAL FOR CONTEXT
        description_section = ""
        if mission_description and mission_description.strip():
            description_section = f"""\n**MISSION DESCRIPTION (What the student needs to do):**
{mission_description}

"""
        
        # Build objectives section - THIS IS THE KEY!
        objectives_section = ""
        if objectives and len(objectives) > 0:
            objectives_section = f"""\n**MISSION OBJECTIVES (What student should achieve):**
{chr(10).join(f"{i+1}. {obj}" for i, obj in enumerate(objectives))}

❗ PRIMARY TASK: Determine if the code achieves these objectives AND follows the mission description. Both are MORE IMPORTANT than exact output matching!
"""
        
        prompt = f"""Analyze this beginner Python code submission and determine if it meets the mission requirements.

**Student's Code (User-Written):**
```python
{code_to_show}
```{starter_note}{description_section}{objectives_section}
**Execution Results:**
- Success: {success}
- Score: {score}/100
- Tests Passed: {sum(1 for t in test_results if t.passed)}/{len(test_results) if test_results else 0}
- Execution Time: {execution_result.get('execution_time', 0):.3f}s
{f"- Error: {error_message}" if error_message else ""}{step_context}

**Expected Output (Example/Reference):** 
{expected_output if expected_output else "Not specified"}

**Actual Output:**
{actual_output if actual_output else "(no output)"}

**Expected Concepts:** {', '.join(expected_concepts) if expected_concepts else 'None specified'}
**Detected Concepts:** {', '.join(detected_concepts) if detected_concepts else 'None detected'}

**EVALUATION RULES:**
1. If mission description is provided: Code must follow the description (PRIMARY)
2. If objectives are listed above: Code must achieve those objectives (PRIMARY)
3. Expected output is just an EXAMPLE - different values that meet objectives are OK!
4. For example: If objective is "print your name", both "John" and "Sarah" are CORRECT
5. Only fail if: code has errors, produces no output, or clearly doesn't address the mission description/objectives

**Please provide feedback (2-3 sentences) that:**
1. States clearly if objectives are met (YES/NO)
2. If yes: Praise what they did well
3. If no: Give ONE specific hint to improve (no spoilers!)
4. Keep it friendly and encouraging

Keep response concise and focused on objectives!"""
        
        return prompt
    
    def _parse_ai_success_determination(self, feedback: str) -> bool | None:
        """Parse AI feedback to determine if it said YES or NO to objectives being met.
        
        Returns:
            True if AI said YES/objectives met
            False if AI said NO/objectives not met  
            None if cannot determine from feedback
        """
        feedback_lower = feedback.lower()
        
        # Check first 150 characters for YES/NO patterns
        feedback_start = feedback_lower[:150]
        
        # Positive patterns (YES, objectives met)
        yes_patterns = [
            'yes.',
            'yes,',
            'yes!',
            'yes:',
            'objectives are met',
            'objectives met',
            'fully met',
            'successfully meets',
            'meets both objectives',
            'meets all objectives',
            'meets the objectives',
            'objectives achieved',
            'perfectly meets'
        ]
        
        # Negative patterns (NO, objectives not met)
        no_patterns = [
            'no.',
            'no,',
            'no -',
            'no:',
            'no!',
            'objectives not fully met',
            'objectives are not met',
            'objectives not met',
            'doesn\'t meet',
            'does not meet',
            'not fully achieved',
            'partially meets',
            'misses',
            'objectives not achieved'
        ]
        
        # Check for NO first (more specific)
        for pattern in no_patterns:
            if pattern in feedback_start:
                return False
        
        # Then check for YES
        for pattern in yes_patterns:
            if pattern in feedback_start:
                return True
        
        # Cannot determine - return None to keep existing success value
        logger.warning(f"Could not parse AI success determination from feedback: {feedback[:100]}...")
        return None
    
    def _calculate_score(
        self,
        execution_result: Dict[str, Any],
        expected_concepts: List[str],
        detected_concepts: List[str]
    ) -> int:
        """Calculate score from 0-100"""
        score = 0
        
        # 60 points for passing tests
        if execution_result['success']:
            test_results = execution_result.get('test_results', [])
            if test_results:
                passed = sum(1 for t in test_results if t.passed)
                score += int((passed / len(test_results)) * 60)
            else:
                score += 60  # No tests means assume success
        
        # 30 points for using expected concepts
        if expected_concepts and detected_concepts:
            matched = len(set(expected_concepts) & set(detected_concepts))
            score += int((matched / len(expected_concepts)) * 30)
        else:
            score += 30  # No expected concepts defined
        
        # 10 points for code quality (complexity, no errors)
        if not execution_result.get('error_message'):
            score += 5
        if execution_result['execution_time'] < 1.0:  # Fast execution
            score += 5
        
        return min(score, 100)
    
    def _generate_rule_based_feedback(
        self,
        success: bool,
        score: int,
        detected_concepts: List[str],
        expected_concepts: List[str],
        error_message: Optional[str]
    ) -> str:
        """
        Generate feedback using rules (replace with AI model)
        
        🔥 THIS METHOD SHOULD BE REPLACED WITH AI MODEL CALL
        """
        if success and score >= 90:
            return random.choice([
                "🎉 Excellent work! Your code is clean and efficient!",
                "🌟 Outstanding! You've mastered this concept!",
                "💯 Perfect! You're becoming a Python expert!",
                "🚀 Fantastic job! Your solution is impressive!",
            ])
        elif success and score >= 75:
            return random.choice([
                "✅ Good job! Your code works correctly!",
                "👍 Well done! You're on the right track!",
                "🎯 Nice work! You solved it successfully!",
            ])
        elif success and score >= 60:
            return "✅ Your code works, but there's room for improvement."
        elif error_message:
            return f"❌ Your code has an error. {format_error_message(Exception(error_message))}"
        else:
            missing = set(expected_concepts or []) - set(detected_concepts)
            if missing:
                return f"🤔 Your code is missing some concepts: {', '.join(missing)}"
            return "🔄 Keep trying! You're making progress!"
    
    def _analyze_concepts(
        self,
        detected: List[str],
        expected: List[str],
        success: bool
    ) -> tuple[List[str], List[str]]:
        """Identify weak and strong concepts"""
        if not expected:
            return [], detected if success else []
        
        expected_set = set(expected)
        detected_set = set(detected)
        
        strong = list(expected_set & detected_set) if success else []
        weak = list(expected_set - detected_set)
        
        return weak, strong
    
    def _generate_hints(
        self,
        code: str,
        execution_result: Dict[str, Any],
        weak_concepts: List[str]
    ) -> List[str]:
        """Generate helpful hints"""
        hints = []
        
        if execution_result.get('error_message'):
            hints.append("Check your syntax and indentation carefully")
        
        if weak_concepts:
            for concept in weak_concepts[:2]:  # Max 2 hints
                hints.append(self._get_concept_hint(concept))
        
        if execution_result['execution_time'] > 2.0:
            hints.append("⚡ Your code could be more efficient")
        
        return hints[:3]  # Max 3 hints
    
    def _generate_suggestions(
        self,
        code: str,
        concepts: List[str],
        complexity: int
    ) -> List[str]:
        """Generate code improvement suggestions"""
        suggestions = []
        
        if complexity > 7:
            suggestions.append("Consider breaking your code into smaller functions")
        
        if 'function-definition' not in concepts and len(code.split('\n')) > 10:
            suggestions.append("Try using functions to organize your code")
        
        if 'exception-handling' not in concepts and complexity > 5:
            suggestions.append("Add error handling to make your code more robust")
        
        if code.count('print(') > 5:
            suggestions.append("Consider reducing debug print statements")
        
        return suggestions[:3]
    
    def _get_concept_hint(self, concept: str) -> str:
        """Get hint for a specific concept"""
        hints_map = {
            'for-loop': "💡 Try using a 'for' loop to repeat actions",
            'while-loop': "💡 A 'while' loop can repeat until a condition is met",
            'conditional': "💡 Use 'if' statements to make decisions in your code",
            'function-definition': "💡 Define a function with 'def function_name():'",
            'return-statement': "💡 Use 'return' to send a value back from a function",
            'list': "💡 Lists store multiple items: my_list = [1, 2, 3]",
            'string-formatting': "💡 Use f-strings for easy formatting: f'Hello {name}'",
        }
        return hints_map.get(concept, f"💡 Learn more about {concept}")
    
    def _generate_error_hint(self, error_message: str, level: int) -> str:
        """Generate hint based on error"""
        if "Syntax" in error_message:
            if level == 1:
                return "Check for missing colons (:) or parentheses"
            elif level == 2:
                return "Look for syntax errors like missing colons after if/for/def statements"
            else:
                return "Common syntax errors: missing ':' after if/for/while/def, unmatched parentheses/brackets"
        
        elif "Indentation" in error_message:
            return "Make sure all lines inside blocks are indented consistently (usually 4 spaces)"
        
        elif "Name" in error_message:
            return "You're using a variable that hasn't been defined yet"
        
        return "Check the error message carefully and fix the issue"
    
    def _generate_concept_hint(
        self,
        expected: List[str],
        detected: List[str],
        level: int
    ) -> str:
        """Generate hint for missing concepts"""
        missing = set(expected) - set(detected)
        if not missing:
            return "You're on the right track!"
        
        concept = list(missing)[0]
        return self._get_concept_hint(concept)
    
    def _generate_example(self, concepts: List[str]) -> Optional[str]:
        """Generate code example for concepts"""
        if not concepts:
            return None
        
        examples = {
            'for-loop': "for i in range(5):\n    print(i)",
            'function-definition': "def greet(name):\n    return f'Hello, {name}!'",
            'conditional': "if x > 10:\n    print('Big number')\nelse:\n    print('Small number')",
        }
        
        return examples.get(concepts[0])

# Global feedback engine instance
feedback_engine = FeedbackEngine()
