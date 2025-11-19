"""
Code Validation Service
AI-powered validation engine for mission-focused code assessment
"""
import re
import json
from typing import List, Optional, Dict, Tuple, Any
from datetime import datetime
from openai import OpenAI

from app.models.validation_models import (
    ValidationRequest, ValidationResponse, AIValidationResult,
    ObjectiveValidation, CreativityIndicator, CreativityLevel, ConceptUsage
)
from app.core.logger import logger
from app.core.config import settings
from app.services.code_executor import CodeExecutor


class CodeValidationService:
    """AI-powered code validation service focusing on mission objectives"""
    
    # Programming concepts with regex patterns for detection
    CONCEPT_PATTERNS = {
        "variable-assignment": r"\b\w+\s*=\s*['\"]?\w+['\"]?",
        "for-loop": r"\bfor\s+\w+\s+in\s+\w+:",
        "while-loop": r"\bwhile\s+[\w\s<>=!]+:",
        "function-definition": r"\bdef\s+\w+\s*\([^)]*\):",
        "if-statement": r"\bif\s+[\w\s<>=!]+:",
        "list-comprehension": r"\[\s*\w+\s+for\s+\w+\s+in\s+\w+.*\]",
        "string-manipulation": r"['\"].*['\"].*\.(split|join|replace|format|upper|lower)",
        "list-operations": r"\.(append|remove|pop|insert|extend|sort|reverse)",
        "dictionary-usage": r"\{[^}]*:\s*[^}]*\}",
        "type-conversion": r"\b(int|str|float|list|dict|set)\s*\(",
        "error-handling": r"\btry:\s*.*\bexcept.*:",
        "lambda-function": r"\blambda\s+[^:]*:",
        "class-definition": r"\bclass\s+\w+\s*(\([^)]*\))?:",
        "module-import": r"\b(import|from)\s+[\w.]+",
        "slicing": r"\w+\[\d*:\d*\]",
    }
    
    # Creativity indicators
    CREATIVITY_PATTERNS = {
        "list-comprehension": r"\[\s*\w+.*for\s+\w+\s+in",
        "lambda-usage": r"\blambda\s+",
        "set-operations": r"\b(set|frozenset)\s*\(",
        "generator": r"\byield\s+",
        "decorator": r"@\w+",
        "context-manager": r"\bwith\s+",
        "higher-order-function": r"\b(map|filter|reduce)\s*\(",
        "extended-functionality": r"# Extra|# Bonus|# Advanced",
        "optimization-comment": r"# Optimized|# Efficient|# O\(",
    }

    def __init__(self, code_executor: Optional[CodeExecutor] = None):
        """Initialize validation service"""
        self.code_executor = code_executor or CodeExecutor()
        
        # Use the configured AI provider (same as all other services)
        if settings.AI_MODEL_PROVIDER == "openrouter" and settings.OPENROUTER_API_KEY:
            self.openai_client = OpenAI(
                api_key=settings.OPENROUTER_API_KEY,
                base_url="https://openrouter.ai/api/v1"
            )
            self.model = settings.AI_MODEL_NAME or "deepseek/deepseek-chat"
            self.ai_available = True
            logger.info(f"[VALIDATOR] Using OpenRouter with model: {self.model}")
        elif settings.AI_MODEL_PROVIDER == "openai" and settings.OPENAI_API_KEY:
            self.openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
            self.model = settings.AI_MODEL_NAME or "gpt-4o-mini"
            self.ai_available = True
            logger.info(f"[VALIDATOR] Using OpenAI with model: {self.model}")
        else:
            self.openai_client = None
            self.model = None
            self.ai_available = False
            logger.warning("[VALIDATOR] No AI provider configured - using rule-based validation only")

    async def validate(self, request: ValidationRequest) -> ValidationResponse:
        """
        Main validation entry point
        
        Args:
            request: ValidationRequest containing mission context and code
            
        Returns:
            ValidationResponse with comprehensive assessment
        """
        try:
            start_time = datetime.utcnow()
            request_id = f"val_{int(datetime.utcnow().timestamp() * 1000)}"
            
            logger.info(f"Starting validation: {request_id}", extra={
                "request_id": request_id,
                "mission_id": request.mission_id,
                "code_length": len(request.student_code)
            })
            
            # Execute code first to check for syntax/runtime errors
            execution_result = await self._execute_code(request.student_code, request.test_cases)
            
            # Perform validation
            if self.ai_available:
                validation_result = await self._analyze_with_ai(request, execution_result)
            else:
                self.logger.warning("AI client not available, using rule-based analysis")
                validation_result = await self._analyze_rule_based(request, execution_result)
            
            # Calculate analysis time
            analysis_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            validation_result.analysis_time_ms = analysis_time
            
            # Determine if passed
            passed = validation_result.success
            
            # Generate summary
            summary = self._generate_summary(validation_result)
            detailed_feedback = self._generate_detailed_feedback(validation_result, request)
            
            # Determine if should advance
            should_advance = (
                passed and 
                validation_result.objectives_met_count >= (validation_result.objectives_total_count * 0.8)
            )
            
            # Suggested review topics if not passing
            suggested_review = None
            if not passed and validation_result.required_concepts_missing:
                suggested_review = validation_result.required_concepts_missing
            
            response = ValidationResponse(
                request_id=request_id,
                mission_id=request.mission_id,
                validation_result=validation_result,
                passed=passed,
                summary=summary,
                detailed_feedback=detailed_feedback,
                should_advance=should_advance,
                suggested_review=suggested_review
            )
            
            logger.info(f"Validation complete: {request_id}", extra={
                "request_id": request_id,
                "passed": passed,
                "score": validation_result.overall_score
            })
            
            return response
            
        except Exception as e:
            logger.error(f"Validation error: {str(e)}", exc_info=True)
            raise

    async def _execute_code(self, code: str, test_cases: Optional[List[str]] = None) -> Dict[str, Any]:
        """Execute code and return results"""
        try:
            logger.debug("Executing code")
            
            # Execute code synchronously
            result = self.code_executor.execute(code, test_cases or [])
            
            # Check test cases if provided
            tests_passed = 0
            tests_total = len(test_cases) if test_cases else 0
            
            if test_cases and result.get('test_results'):
                for test_result in result['test_results']:
                    if test_result.get('passed', False):
                        tests_passed += 1
                tests_total = len(result['test_results'])
            
            return {
                "executed": result.get("success", False),
                "output": result.get("stdout", ""),
                "error": result.get("stderr"),
                "tests_passed": tests_passed,
                "tests_total": tests_total,
            }
            
        except Exception as e:
            logger.error(f"Code execution error: {str(e)}")
            return {
                "executed": False,
                "output": "",
                "error": str(e),
                "tests_passed": 0,
                "tests_total": len(test_cases) if test_cases else 0,
            }

    async def _analyze_with_ai(self, request: ValidationRequest, execution_result: Dict) -> AIValidationResult:
        """AI-powered validation using LLM"""
        try:
            logger.debug("Starting AI analysis")
            
            # Build comprehensive prompt
            prompt = self._build_validation_prompt(request, execution_result)
            
            # Call AI using configured model (same as all other services)
            if not self.openai_client:
                return await self._analyze_rule_based(request, execution_result)
            
            message = self.openai_client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert programming teacher evaluating student code. "
                                  "Analyze the code against the mission objectives and provide structured feedback. "
                                  "Return a JSON object with your analysis."
                    },
                    {"role": "user", "content": prompt}
                ],
                max_tokens=2000,
                temperature=0.3  # Lower temperature for consistent analysis
            )
            
            ai_response = message.choices[0].message.content
            
            # Parse AI response
            validation_result = self._parse_ai_response(ai_response, request, execution_result)
            
            # Check for hardcoding (just printing expected output without logic)
            is_hardcoded, hardcoding_evidence = self._detect_hardcoding(
                request.student_code,
                request.expected_output,
                request.objectives
            )
            
            if is_hardcoded:
                # Mark all objectives as failed if hardcoding detected
                logger.warning(f"Hardcoding detected: {hardcoding_evidence}")
                validation_result.success = False
                for obj in validation_result.objectives_validated:
                    obj.met = False
                    obj.suggestions = ["Your code needs actual logic, not just printing the answer!"]
                validation_result.overall_score = 0
            
            # Generate kid-friendly feedback
            validation_result = self._generate_kid_friendly_feedback(validation_result, request)
            
            return validation_result
            
        except Exception as e:
            logger.error(f"AI analysis error: {str(e)}", exc_info=True)
            # Fall back to rule-based analysis
            return await self._analyze_rule_based(request, execution_result)

    async def _analyze_rule_based(self, request: ValidationRequest, execution_result: Dict) -> AIValidationResult:
        """Rule-based validation without AI"""
        logger.debug("Starting rule-based analysis")
        
        # Validate objectives
        objectives_validated = []
        concepts_detected = []
        
        for objective in request.objectives:
            # Simple pattern matching for objectives
            is_met = self._check_objective_met(objective, request.student_code, execution_result)
            objectives_validated.append(ObjectiveValidation(
                objective=objective,
                met=is_met,
                confidence=0.7,  # Lower confidence without AI
                evidence="Pattern matched in code",
                suggestions=[] if is_met else ["Review the objective and add appropriate code"]
            ))
        
        # Detect concept usage
        for concept in request.required_concepts:
            detected, lines = self._detect_concept(concept, request.student_code)
            concepts_detected.append(ConceptUsage(
                concept=concept,
                detected=detected,
                line_numbers=lines,
                proficiency=0.7 if detected else 0.0,
                explanation=f"Concept {'found' if detected else 'not found'} in code"
            ))
        
        # Assess creativity
        creativity = self._assess_creativity_rule_based(request.student_code)
        
        # Calculate scores
        objectives_met = sum(1 for obj in objectives_validated if obj.met)
        objectives_total = len(objectives_validated)
        
        overall_score = self._calculate_score(
            objectives_met=objectives_met,
            objectives_total=objectives_total,
            concepts_detected=[c for c in concepts_detected if c.detected],
            concepts_total=len(concepts_detected),
            creativity_score=creativity.score,
            execution_success=execution_result.get("executed", False)
        )
        
        missing_concepts = [c.concept for c in concepts_detected if not c.detected]
        
        return AIValidationResult(
            success=objectives_met >= (objectives_total * 0.8) if objectives_total > 0 else execution_result.get("executed", False),
            overall_score=overall_score,
            confidence=0.65,  # Lower confidence without AI
            objectives_validated=objectives_validated,
            objectives_met_count=objectives_met,
            objectives_total_count=objectives_total,
            concepts_detected=concepts_detected,
            required_concepts_missing=missing_concepts,
            creativity=creativity,
            code_quality_score=75,
            code_quality_feedback="Code structure appears reasonable",
            code_clarity_issues=[],
            strengths=["Code executes without errors"] if execution_result.get("executed") else [],
            areas_for_improvement=missing_concepts,
            specific_suggestions=[f"Consider using {concept}" for concept in missing_concepts],
            learning_points=request.objectives,
            executed_successfully=execution_result.get("executed", False),
            execution_error=execution_result.get("error"),
            test_cases_passed=execution_result.get("tests_passed", 0),
            test_cases_total=execution_result.get("tests_total", 0),
            analysis_time_ms=0,
            ai_model_used="rule-based"
        )

    def _build_validation_prompt(self, request: ValidationRequest, execution_result: Dict) -> str:
        """Build comprehensive prompt for AI analysis with hardcoding detection"""
        prompt = f"""Analyze this student's code submission for the following mission:

MISSION: {request.mission_title}
DESCRIPTION: {request.mission_description}

LEARNING OBJECTIVES:
{chr(10).join(f"- {obj}" for obj in request.objectives)}

{"REQUIRED CONCEPTS:" + chr(10) + chr(10).join(f"- {concept}" for concept in request.required_concepts) if request.required_concepts else ""}

STUDENT CODE:
```python
{request.student_code}
```

EXECUTION RESULT:
- Executed: {execution_result.get('executed', False)}
- Output: {execution_result.get('output', 'No output')}
- Error: {execution_result.get('error', 'None')}

{"EXPECTED OUTPUT:" + chr(10) + request.expected_output if request.expected_output else ""}

CRITICAL VALIDATION RULES:
1. OBJECTIVE TYPES - Two different validation modes:
   
   MODE A - OUTPUT-ONLY OBJECTIVES (e.g., "Print your name and age"):
   - ONLY check if the correct output is produced
   - DO NOT require specific programming concepts unless explicitly stated
   - ANY valid code that produces the correct output is acceptable
   - Example: Both print("Alex") and print("Sarah") are valid for "print a name"
   - Example: Both name="Alex"; print(name) and print("Alex") are valid for "print a name"
   
   MODE B - CONCEPT-REQUIRED OBJECTIVES (e.g., "Use a for loop to print numbers"):
   - MUST verify the specific concept is used in the code
   - Simply producing correct output without the concept = FAIL
   - Example: Objective "use a for loop" requires actual for loop in code
   
2. HARDCODING DETECTION:
   - Hardcoding = printing EXACT expected output without ANY computation/logic/variables
   - Example of HARDCODING (bad): code is just print("Expected output exactly")
   - Example of NOT hardcoding (good): code has variables, conditionals, loops, or any logic
   - If code has ANY of these, it's NOT hardcoding: for, while, if, def, variables, operations
   
3. OUTPUT EVALUATION:
   - In OUTPUT-ONLY mode: ANY reasonable output is acceptable (different names, ages, numbers are GOOD)
   - In CONCEPT-REQUIRED mode: Output should demonstrate the concept was used
   - NEVER require exact output match unless mission explicitly states "print exactly: X"
   - Examples of VALID outputs for "print your name": "Alex", "Sarah", "Bob", "Maria" - ALL GOOD!
   
4. CONCEPT VALIDATION:
   - Check required concepts ONLY if objective explicitly mentions them
   - Don't penalize for missing concepts if objective doesn't require them

Please analyze and respond with a JSON object containing:
{{
  "objectives_met": [
    {{"objective": "objective text", "met": true/false, "confidence": 0.0-1.0, "evidence": "supporting evidence", "is_hardcoded": false}}
  ],
  "concepts_found": ["list of detected concepts"],
  "concepts_missing": ["list of missing required concepts"],
  "hardcoding_detected": false,
  "hardcoding_evidence": "",
  "creativity_level": "not_creative|slightly_creative|moderately_creative|highly_creative",
  "creativity_score": 0-100,
  "creative_features": ["list of creative aspects"],
  "code_quality_score": 0-100,
  "strengths": ["list of strengths"],
  "areas_for_improvement": ["list of areas to improve"],
  "specific_suggestions": ["actionable suggestions"],
  "learning_points": ["key concepts to understand"],
  "next_steps": "recommended next challenge or review"
}}
"""
        return prompt

    def _detect_hardcoding(self, student_code: str, expected_output: Optional[str], objectives: List[str]) -> Tuple[bool, str]:
        """
        Detect if student just printed the expected output without ANY logic/computation
        
        UPDATED LOGIC:
        - Only flag as hardcoding if code has ZERO logic (no vars, no loops, no conditions, no functions)
        - If code has ANY programming construct, it's NOT hardcoding
        
        Returns (is_hardcoded, evidence)
        """
        if not expected_output:
            return False, ""
        
        code_lower = student_code.lower().strip()
        
        # Check if code has ANY programming constructs
        # If it does, it's NOT hardcoding - student is writing actual code
        has_logic_constructs = any(keyword in code_lower for keyword in [
            'for ', 'while ', 'if ', 'elif ', 'else:', 'def ', 'class ',
            '=',  # variable assignment
            '+', '-', '*', '/', '%',  # arithmetic operations  
            'input(', 'range(', 'len(', 'sum(', 'int(', 'str('  # functions
        ])
        
        if has_logic_constructs:
            # Code has programming logic - NOT hardcoding
            return False, ""
        
        # Code has NO logic constructs - check if it's just printing exact expected output
        # Only flag if code is EXTREMELY simple (< 50 chars) and just prints exact output
        if len(code_lower) < 50:
            # Check if it's literally just print(expected_output)
            expected_clean = expected_output.strip()
            if expected_clean in student_code:
                # Check if entire code is just one print statement
                code_lines = [line.strip() for line in student_code.strip().split('\n') 
                             if line.strip() and not line.strip().startswith('#')]
                
                if len(code_lines) == 1 or len(code_lines) == 2:  
                    # Very simple code - might be hardcoded
                    return True, "Code appears to be just printing without any logic or computation"
        
        return False, ""

    def _parse_ai_response(self, ai_response: str, request: ValidationRequest, execution_result: Dict) -> AIValidationResult:
        """Parse AI response into validation result"""
        try:
            # Extract JSON from response
            json_match = re.search(r'\{.*\}', ai_response, re.DOTALL)
            if not json_match:
                raise ValueError("No JSON found in AI response")
            
            data = json.loads(json_match.group())
            
            # Build objectives validated
            objectives_validated = [
                ObjectiveValidation(
                    objective=obj["objective"],
                    met=obj.get("met", False),
                    confidence=min(max(obj.get("confidence", 0.7), 0), 1),
                    evidence=obj.get("evidence", ""),
                    suggestions=[]
                )
                for obj in data.get("objectives_met", [])
            ]
            
            # Build concepts detected
            concepts_found = data.get("concepts_found", [])
            concepts_missing = data.get("concepts_missing", [])
            concepts_detected = []
            
            for concept in request.required_concepts:
                is_found = concept in concepts_found or any(
                    concept.lower() in found.lower() for found in concepts_found
                )
                concepts_detected.append(ConceptUsage(
                    concept=concept,
                    detected=is_found,
                    line_numbers=self._detect_concept(concept, request.student_code)[1],
                    proficiency=0.8 if is_found else 0.0,
                    explanation=f"Concept {'identified' if is_found else 'not identified'} in analysis"
                ))
            
            # Creativity assessment
            creativity = CreativityIndicator(
                level=CreativityLevel(data.get("creativity_level", "not_creative")),
                score=int(min(max(data.get("creativity_score", 50), 0), 100)),
                features=data.get("creative_features", []),
                explanation=f"Student showed {data.get('creativity_level', 'no').replace('_', ' ')} solution approach",
                examples=data.get("creative_features", [])
            )
            
            # Objectives metrics
            objectives_met = sum(1 for obj in objectives_validated if obj.met)
            objectives_total = len(objectives_validated)
            
            # Calculate overall score
            overall_score = self._calculate_score(
                objectives_met=objectives_met,
                objectives_total=objectives_total,
                concepts_detected=[c for c in concepts_detected if c.detected],
                concepts_total=len(concepts_detected),
                creativity_score=creativity.score,
                execution_success=execution_result.get("executed", False)
            )
            
            # Build result
            return AIValidationResult(
                success=objectives_met >= (objectives_total * 0.8) if objectives_total > 0 else False,
                overall_score=overall_score,
                confidence=0.9,
                objectives_validated=objectives_validated,
                objectives_met_count=objectives_met,
                objectives_total_count=objectives_total,
                concepts_detected=concepts_detected,
                required_concepts_missing=concepts_missing,
                creativity=creativity,
                code_quality_score=int(min(max(data.get("code_quality_score", 75), 0), 100)),
                code_quality_feedback=data.get("code_quality_feedback", "Code quality appears reasonable"),
                code_clarity_issues=[],
                strengths=data.get("strengths", []),
                areas_for_improvement=data.get("areas_for_improvement", []),
                specific_suggestions=data.get("specific_suggestions", []),
                learning_points=data.get("learning_points", request.objectives),
                next_steps=data.get("next_steps"),
                executed_successfully=execution_result.get("executed", False),
                execution_error=execution_result.get("error"),
                test_cases_passed=execution_result.get("tests_passed", 0),
                test_cases_total=execution_result.get("tests_total", 0),
                analysis_time_ms=0,
                ai_model_used=self.model or "rule-based"
            )
            
        except Exception as e:
            logger.error(f"Error parsing AI response: {str(e)}")
            raise

    def _check_objective_met(self, objective: str, code: str, execution_result: Dict) -> bool:
        """Check if an objective appears to be met through code inspection"""
        objective_lower = objective.lower()
        code_lower = code.lower()
        
        # Simple keyword matching for objectives
        if "for" in objective_lower and "for" in code_lower:
            if "in" in code_lower:
                return True
        if "while" in objective_lower and "while" in code_lower:
            return True
        if "function" in objective_lower and "def" in code_lower:
            return True
        if "list" in objective_lower and "[" in code_lower:
            return True
        if "dictionary" in objective_lower and "{" in code_lower:
            return True
        
        # Check if code executed successfully
        if "output" in objective_lower or "print" in objective_lower:
            return execution_result.get("executed", False)
        
        return False

    def _detect_concept(self, concept: str, code: str) -> Tuple[bool, List[int]]:
        """Detect if concept is used in code"""
        pattern = self.CONCEPT_PATTERNS.get(concept.lower())
        if not pattern:
            return False, []
        
        lines = []
        for i, line in enumerate(code.split("\n"), 1):
            if re.search(pattern, line):
                lines.append(i)
        
        return len(lines) > 0, lines

    def _assess_creativity_rule_based(self, code: str) -> CreativityIndicator:
        """Assess creativity using rule-based detection"""
        creative_features = []
        score = 0
        
        for feature, pattern in self.CREATIVITY_PATTERNS.items():
            if re.search(pattern, code):
                creative_features.append(feature)
                score += 10
        
        # Determine level
        if score >= 60:
            level = CreativityLevel.HIGHLY_CREATIVE
        elif score >= 40:
            level = CreativityLevel.MODERATELY_CREATIVE
        elif score >= 20:
            level = CreativityLevel.SLIGHTLY_CREATIVE
        else:
            level = CreativityLevel.NOT_CREATIVE
        
        return CreativityIndicator(
            level=level,
            score=min(score, 100),
            features=creative_features,
            explanation=f"Code demonstrates {level.value.replace('_', ' ')} approach",
            examples=creative_features
        )

    def _calculate_score(self, objectives_met: int, objectives_total: int,
                        concepts_detected: List[ConceptUsage], concepts_total: int,
                        creativity_score: float, execution_success: bool) -> float:
        """Calculate overall score (0-100)"""
        score = 0
        
        # Objectives (50%)
        if objectives_total > 0:
            objectives_pct = (objectives_met / objectives_total) * 100
            score += objectives_pct * 0.5
        
        # Concepts (30%)
        if concepts_total > 0:
            concepts_found = len(concepts_detected)
            concepts_pct = (concepts_found / concepts_total) * 100
            score += concepts_pct * 0.3
        
        # Creativity (15%)
        score += creativity_score * 0.15
        
        # Execution (5%)
        if execution_success:
            score += 5
        
        return min(max(score, 0), 100)

    def _generate_summary(self, result: AIValidationResult) -> str:
        """Generate short summary of validation"""
        if result.success:
            return f"Great job! Your code successfully meets the mission objectives with a score of {result.overall_score}/100."
        else:
            missing = result.objectives_total_count - result.objectives_met_count
            return f"Your code meets {result.objectives_met_count}/{result.objectives_total_count} objectives. You need to complete {missing} more objective(s) to pass."

    def _generate_kid_friendly_feedback(self, result: AIValidationResult, request: ValidationRequest) -> AIValidationResult:
        """Generate concise, kid-friendly feedback without solutions"""
        feedback_parts = []
        
        # Mission Status - SHORT
        if result.success:
            feedback_parts.append(f"✨ Mission Complete! Score: {int(result.overall_score)}/100")
        else:
            met = result.objectives_met_count
            total = result.objectives_total_count
            feedback_parts.append(f"🎯 Progress: {met}/{total} objectives done")
        
        # Missing objectives - VERY CONCISE
        if result.objectives_met_count < result.objectives_total_count:
            missing_objs = [obj.objective for obj in result.objectives_validated if not obj.met]
            if missing_objs:
                feedback_parts.append(f"❌ Still needed: {', '.join(missing_objs[:2])}")
        
        # Missing concepts - NO EXPLANATION
        if result.required_concepts_missing:
            concepts = result.required_concepts_missing[:3]
            feedback_parts.append(f"📚 Try using: {', '.join(concepts)}")
        
        # Creativity recognition - BRIEF
        if result.creativity.level == CreativityLevel.HIGHLY_CREATIVE:
            feedback_parts.append("🚀 Wow! Creative solution!")
        elif result.creativity.level == CreativityLevel.MODERATELY_CREATIVE:
            feedback_parts.append("💡 Nice! Some creative thinking here")
        
        # One strength - ENCOURAGING
        if result.strengths:
            feedback_parts.append(f"💪 {result.strengths[0]}")
        
        # Join with line breaks
        kid_friendly_feedback = "\n".join(feedback_parts)
        
        # Update the validation result with kid-friendly feedback
        result.summary = kid_friendly_feedback.split('\n')[0]  # First line as summary
        
        return result

    def _generate_detailed_feedback(self, result: AIValidationResult, request: ValidationRequest) -> str:
        """Generate detailed feedback for student"""
        feedback = []
        
        # Objectives feedback
        feedback.append("## Your Mission Progress")
        feedback.append(f"You've completed {result.objectives_met_count}/{result.objectives_total_count} learning objectives.\n")
        
        for obj in result.objectives_validated:
            status = "✓" if obj.met else "✗"
            feedback.append(f"{status} {obj.objective}")
            if not obj.met and obj.suggestions:
                feedback.append(f"  → {obj.suggestions[0]}")
        
        # Concepts feedback
        if result.concepts_detected:
            feedback.append("\n## Concepts Used")
            for concept in result.concepts_detected:
                if concept.detected:
                    feedback.append(f"✓ {concept.concept}: {concept.explanation}")
            
            if result.required_concepts_missing:
                feedback.append("\n## Concepts to Practice")
                for concept in result.required_concepts_missing:
                    feedback.append(f"- {concept}")
        
        # Creativity feedback
        if result.creativity.level != CreativityLevel.NOT_CREATIVE:
            feedback.append(f"\n## Creativity\nYour solution shows {result.creativity.level.value.replace('_', ' ')} approach! {result.creativity.explanation}")
        
        # Suggestions
        if result.specific_suggestions:
            feedback.append("\n## Suggestions for Improvement")
            for suggestion in result.specific_suggestions[:3]:  # Top 3
                feedback.append(f"- {suggestion}")
        
        return "\n".join(feedback)
