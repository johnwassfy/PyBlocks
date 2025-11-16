"""
🧪 COMPREHENSIVE AI SERVICE BENCHMARK RUNNER
Tests ALL AI services across the platform, not just code analysis

Services tested:
1. /analyze - Code analysis and feedback
2. /chat - Chatbot interactions
3. /hint - AI hints generation
4. /recommend - Mission recommendations
5. /behavior - Behavior analysis

Each service is tested with diverse scenarios to evaluate:
- Response quality
- Response time
- Error handling
- Context awareness
- Consistency across models
"""

import asyncio
import json
import os
from datetime import datetime
from typing import List, Dict, Any
import httpx
from app.core.logger import logger
from pathlib import Path
import statistics
import platform
import sys
from difflib import SequenceMatcher


class ComprehensiveAIBenchmark:
    """
    Systematic benchmark testing for ALL AI services
    """
    
    def __init__(
        self,
        ai_service_url: str = "http://localhost:8000",
        output_dir: str = "data/benchmark_results",
        delay_between_tests: float = 4.0,  # Delay in seconds between tests (default: 4s for ~15 req/min)
        delay_between_services: float = 60.0  # Delay in seconds between services (default: 60s)
    ):
        self.ai_service_url = ai_service_url
        self.output_dir = output_dir
        self.delay_between_tests = delay_between_tests
        self.delay_between_services = delay_between_services
        os.makedirs(output_dir, exist_ok=True)
        
        # AI models to test - ONLY the model from .env
        # User will change .env and re-run for each model
        from app.core.config import settings
        self.models = [settings.AI_MODEL_NAME]
        
        # Create model-specific output directory
        model_folder = self.models[0].replace("/", "_").replace(":", "_")
        self.model_name = model_folder
        self.model_output_dir = os.path.join(output_dir, model_folder)
        os.makedirs(self.model_output_dir, exist_ok=True)
        
        logger.info(f"[BENCHMARK] Testing model: {self.models[0]}")
        logger.info(f"[BENCHMARK] Results will be saved to: {self.model_output_dir}")
        logger.info(f"[BENCHMARK] Rate limiting: {self.delay_between_tests}s between tests, {self.delay_between_services}s between services")
        
        # Capture environment metadata for reproducibility
        self.metadata = {
            "timestamp": datetime.now().isoformat(),
            "python_version": sys.version,
            "os": platform.platform(),
            "service_url": self.ai_service_url,
            "model_name": self.models[0],
            "benchmark_version": "3.0.0"  # Updated version with research-grade features
        }
        
        # Load test scenarios from JSON files (now includes trap tests merged in)
        self.analyze_tests = self.load_json_tests("analyze.json")
        self.chat_tests = self.load_json_tests("chat.json")
        self.hint_tests = self.load_json_tests("hint.json")
        self.recommend_tests = self.load_json_tests("recommend.json")
        self.behavior_tests = self.load_json_tests("behavior.json")
        
        # Load META/STRESS trap tests (cross-service tests)
        self.meta_trap_tests = self.load_json_tests("meta_traps.json")
        
        logger.info(f"[BENCHMARK] Total tests loaded:")
        logger.info(f"  - Analyze: {len(self.analyze_tests)}")
        logger.info(f"  - Chat: {len(self.chat_tests)}")
        logger.info(f"  - Hint: {len(self.hint_tests)}")
        logger.info(f"  - Recommend: {len(self.recommend_tests)}")
        logger.info(f"  - Behavior: {len(self.behavior_tests)}")
        logger.info(f"  - Meta/Stress: {len(self.meta_trap_tests)}")
        
        # Track results for consistency analysis (when repeat_count > 1)
        self.previous_responses = {}
    
    def load_json_tests(self, filename: str) -> List[Dict[str, Any]]:
        """Load test cases from JSON file"""
        test_file = os.path.join("data", "test_cases", filename)
        
        if not os.path.exists(test_file):
            logger.warning(f"[BENCHMARK] Test file not found: {test_file}")
            return []
        
        with open(test_file, 'r', encoding='utf-8') as f:
            tests = json.load(f)
        
        logger.info(f"[BENCHMARK] Loaded {len(tests)} tests from {filename}")
        return tests
    
    # ==================== ANALYZE SERVICE TESTS ====================
    
    def load_analyze_tests(self) -> List[Dict[str, Any]]:
        """Test scenarios for /analyze endpoint"""
        return [
            {
                "id": "analyze_hello_world",
                "name": "Basic Print Statement",
                "evaluation_category": "syntax",
                "difficulty_level": 1,
                "expected_behavior": "Should provide encouraging feedback on correct syntax",
                "missionId": "test_hello_world",
                "mission_context": {
                    "title": "Hello World",
                    "description": "Print Hello, World!",
                    "objectives": ["Use print statement"],
                    "concepts": ["print", "strings"],
                    "difficulty": 1,
                    "validation_mode": "strict"
                },
                "submission_context": {
                    "code": 'print("Hello, World!")',
                    "expected_output": "Hello, World!",
                    "line_count": 1
                },
                "student_context": {
                    "user_id": "benchmark_user",
                    "level": 1,
                    "xp": 0,
                    "weak_skills": [],
                    "strong_skills": [],
                    "attempt_number": 1
                },
                "validation_context": {
                    "check_exact_output": True,
                    "allow_creativity": False
                }
            },
            {
                "id": "analyze_syntax_error",
                "name": "Syntax Error Handling",
                "evaluation_category": "syntax",
                "difficulty_level": 2,
                "expected_behavior": "Should identify syntax error and explain how to fix it",
                "missionId": "test_syntax_error",
                "mission_context": {
                    "title": "Syntax Error Test",
                    "description": "Test error feedback quality",
                    "objectives": ["Handle errors gracefully"],
                    "concepts": ["print"],
                    "difficulty": 1,
                    "validation_mode": "strict"
                },
                "submission_context": {
                    "code": 'print("Missing parenthesis"',
                    "expected_output": "",
                    "line_count": 1
                },
                "student_context": {
                    "user_id": "benchmark_user",
                    "level": 1,
                    "xp": 0,
                    "weak_skills": ["syntax"],
                    "strong_skills": [],
                    "attempt_number": 3
                },
                "validation_context": {
                    "check_exact_output": True,
                    "allow_creativity": False
                }
            },
            {
                "id": "analyze_creative",
                "name": "Creative Story Mode",
                "evaluation_category": "creative",
                "difficulty_level": 5,
                "expected_behavior": "Should evaluate creativity and structure, not exact output",
                "missionId": "test_creative_story",
                "mission_context": {
                    "title": "Creative Story",
                    "description": "Write a three-line story",
                    "objectives": ["Creativity", "Multiple lines"],
                    "concepts": ["print", "strings", "creativity"],
                    "difficulty": 5,
                    "validation_mode": "creative"
                },
                "submission_context": {
                    "code": 'print("Once upon a time")\nprint("there was a robot")\nprint("who loved to code")',
                    "expected_output": "Once upon a time\nthere was a robot\nwho loved to code",
                    "line_count": 3
                },
                "student_context": {
                    "user_id": "benchmark_user",
                    "level": 3,
                    "xp": 450,
                    "weak_skills": [],
                    "strong_skills": ["print", "strings"],
                    "attempt_number": 1
                },
                "validation_context": {
                    "check_exact_output": False,
                    "allow_creativity": True
                }
            }
        ]
    
    # ==================== CHAT SERVICE TESTS ====================
    
    def load_chat_tests(self) -> List[Dict[str, Any]]:
        """Test scenarios for /chat endpoint"""
        return [
            {
                "id": "chat_simple_help",
                "name": "Simple Help Request",
                "evaluation_category": "logic",
                "difficulty_level": 1,
                "expected_behavior": "Provide clear, beginner-friendly explanation of print statement with code example",
                "payload": {
                    "question": "How do I print something in Python?",
                    "userId": "benchmark_user",
                    "missionId": "intro_to_print",
                    "conversationHistory": []
                }
            },
            {
                "id": "chat_error_help",
                "name": "Error Help with Code",
                "evaluation_category": "debugging",
                "difficulty_level": 3,
                "expected_behavior": "Identify missing colon in for loop and explain syntax correction",
                "payload": {
                    "question": "I'm getting an error and I don't know why",
                    "userId": "benchmark_user",
                    "missionId": "loops_practice",
                    "code": 'for i in range(5)\n    print(i)',
                    "errorMessage": "SyntaxError: invalid syntax",
                    "conversationHistory": [
                        {"role": "user", "content": "Can you help me with loops?"},
                        {"role": "assistant", "content": "Of course! What would you like to know about loops?"}
                    ],
                    "weakConcepts": ["loops", "syntax"],
                    "strongConcepts": ["print"]
                }
            },
            {
                "id": "chat_concept_explanation",
                "name": "Concept Explanation",
                "evaluation_category": "conceptual",
                "difficulty_level": 2,
                "expected_behavior": "Explain variables using simple analogies and examples suitable for beginners",
                "payload": {
                    "question": "What are variables?",
                    "userId": "benchmark_user",
                    "missionId": "variables_intro",
                    "conversationHistory": [],
                    "weakConcepts": ["variables"]
                }
            },
            {
                "id": "chat_stuck_on_mission",
                "name": "Stuck on Mission",
                "evaluation_category": "adaptive",
                "difficulty_level": 4,
                "expected_behavior": "Recognize high attempt count and provide personalized hints without giving away solution",
                "payload": {
                    "question": "I'm stuck and don't know what to do",
                    "userId": "benchmark_user",
                    "missionId": "calculator_mission",
                    "code": 'x = 5\ny = 3',
                    "expectedOutput": "8",
                    "conversationHistory": [],
                    "attemptNumber": 5,
                    "weakConcepts": ["arithmetic"]
                }
            },
            {
                "id": "chat_predefined_prompt",
                "name": "Predefined Prompt",
                "evaluation_category": "error-handling",
                "difficulty_level": 2,
                "expected_behavior": "Use predefined prompt template to explain NameError clearly",
                "payload": {
                    "question": "What does this error mean?",
                    "userId": "benchmark_user",
                    "missionId": "debug_practice",
                    "errorMessage": "NameError: name 'x' is not defined",
                    "promptId": "explain_error",
                    "conversationHistory": []
                }
            }
        ]
    
    # ==================== HINT SERVICE TESTS ====================
    
    def load_hint_tests(self) -> List[Dict[str, Any]]:
        """Test scenarios for /hint endpoint"""
        return [
            {
                "id": "hint_beginner_stuck",
                "name": "Beginner Student Stuck",
                "evaluation_category": "syntax",
                "difficulty_level": 2,
                "expected_behavior": "Detect missing closing parenthesis and provide gentle hint without revealing exact solution",
                "payload": {
                    "userId": "benchmark_user",
                    "code": 'print("Hello"',
                    "missionId": "hello_world",
                    "errorMessage": "SyntaxError: invalid syntax",
                    "attemptNumber": 3
                }
            },
            {
                "id": "hint_intermediate_logic",
                "name": "Intermediate Logic Help",
                "evaluation_category": "logic",
                "difficulty_level": 3,
                "expected_behavior": "Analyze logic flow and suggest potential improvements or guide thinking about conditionals",
                "payload": {
                    "userId": "benchmark_user",
                    "code": 'for i in range(10):\n    if i > 5:\n        print(i)',
                    "missionId": "conditional_loops",
                    "concepts": ["conditionals", "loops"],
                    "attemptNumber": 2
                }
            },
            {
                "id": "hint_proactive_help",
                "name": "Proactive Help Trigger",
                "evaluation_category": "proactive",
                "difficulty_level": 4,
                "expected_behavior": "Recognize potential division by zero risk and proactively warn before error occurs",
                "payload": {
                    "userId": "benchmark_user",
                    "code": 'x = 10\ny = 0',
                    "missionId": "division_practice",
                    "attemptNumber": 4
                }
            }
        ]
    
    # ==================== RECOMMEND SERVICE TESTS ====================
    
    def load_recommend_tests(self) -> List[Dict[str, Any]]:
        """Test scenarios for /recommend endpoint"""
        return [
            {
                "id": "recommend_beginner",
                "name": "Beginner Recommendations",
                "evaluation_category": "adaptive",
                "difficulty_level": 2,
                "expected_behavior": "Recommend basic missions targeting weak concepts (print, variables) with slow pacing",
                "payload": {
                    "userId": "benchmark_user",
                    "weakConcepts": ["print", "variables"],
                    "strongConcepts": [],
                    "completedMissions": ["hello_world"],
                    "averageScore": 65,
                    "learningVelocity": "slow"
                }
            },
            {
                "id": "recommend_intermediate",
                "name": "Intermediate Recommendations",
                "evaluation_category": "adaptive",
                "difficulty_level": 3,
                "expected_behavior": "Recommend intermediate missions focusing on weak loops concept while building on strong areas",
                "payload": {
                    "userId": "benchmark_user",
                    "weakConcepts": ["loops"],
                    "strongConcepts": ["print", "variables", "conditionals"],
                    "completedMissions": ["hello_world", "variables_intro", "if_else"],
                    "averageScore": 82,
                    "learningVelocity": "medium"
                }
            },
            {
                "id": "recommend_advanced",
                "name": "Advanced Challenge",
                "evaluation_category": "adaptive",
                "difficulty_level": 5,
                "expected_behavior": "Recommend challenging missions or creative projects for high-performing student",
                "payload": {
                    "userId": "benchmark_user",
                    "weakConcepts": [],
                    "strongConcepts": ["print", "variables", "loops", "conditionals", "functions"],
                    "completedMissions": ["hello_world", "variables_intro", "loops_basics", "functions_intro"],
                    "averageScore": 95,
                    "learningVelocity": "fast"
                }
            }
        ]
    
    # ==================== TEST EXECUTION ====================
    
    async def test_service(
        self,
        service_name: str,
        endpoint: str,
        test: Dict[str, Any],
        model: str,
        client: httpx.AsyncClient
    ) -> Dict[str, Any]:
        """Test a single service endpoint with comprehensive quality metrics"""
        start_time = datetime.now()
        
        # Set timeout based on test difficulty and trap category
        timeout_seconds = self._get_timeout_for_test(test)
        
        try:
            # Prepare payload
            if service_name == "analyze":
                # Convert snake_case keys to camelCase for API compliance
                payload = {
                    "missionId": test["missionId"],
                    "aiModel": model,
                    "missionContext": test.get("mission_context"),
                    "studentContext": test.get("student_context"),
                    "submissionContext": test.get("submission_context"),
                    "validationContext": test.get("validation_context"),
                    "behaviorMetrics": test.get("behavior_metrics")
                }
                # Remove None values
                payload = {k: v for k, v in payload.items() if v is not None}
            else:
                payload = test["payload"]
            
            # Make request with timeout
            try:
                response = await asyncio.wait_for(
                    client.post(
                        f"{self.ai_service_url}/api/v1/{endpoint}",
                        json=payload,
                        timeout=httpx.Timeout(timeout_seconds)
                    ),
                    timeout=timeout_seconds + 5  # Extra 5 seconds for network overhead
                )
            except asyncio.TimeoutError:
                # Test exceeded timeout - mark as failure
                end_time = datetime.now()
                duration_ms = (end_time - start_time).total_seconds() * 1000
                
                trap_info = ""
                if "trap_category" in test:
                    trap_info = f" [TRAP: {test['trap_category']}]"
                
                return {
                    "service": service_name,
                    "test_id": test["id"],
                    "test_name": test["name"],
                    "evaluation_category": test.get("evaluation_category", "general"),
                    "difficulty_level": test.get("difficulty_level", 3),
                    "model": model,
                    "http_success": False,
                    "semantic_success": False,
                    "success": False,
                    "error": f"Test timeout after {timeout_seconds}s{trap_info}",
                    "error_type": "Timeout",
                    "response_time_ms": duration_ms,
                    "timestamp": start_time.isoformat(),
                    "timeout_exceeded": True,
                    "timeout_limit_seconds": timeout_seconds,
                    "is_trap_test": "trap_category" in test,
                    "trap_category": test.get("trap_category", "none")
                }
            
            end_time = datetime.now()
            duration_ms = (end_time - start_time).total_seconds() * 1000
            
            result = {
                "service": service_name,
                "test_id": test["id"],
                "test_name": test["name"],
                "evaluation_category": test.get("evaluation_category", "general"),
                "difficulty_level": test.get("difficulty_level", 3),
                "expected_behavior": test.get("expected_behavior", ""),
                "model": model,
                "http_success": response.status_code == 200,
                "status_code": response.status_code,
                "response_time_ms": duration_ms,
                "timestamp": start_time.isoformat()
            }
            
            if response.status_code == 200:
                response_json = response.json()
                result["response_data"] = response_json
                
                # ✅ TRAP CATEGORY TRACKING
                if "trap_category" in test:
                    result["trap_category"] = test["trap_category"]
                    result["is_trap_test"] = True
                else:
                    result["is_trap_test"] = False
                
                # ✅ SEMANTIC SUCCESS DETECTION
                semantic_success = self._evaluate_semantic_success(service_name, response_json, test)
                result["semantic_success"] = semantic_success
                result["success"] = semantic_success  # Overall success = semantic success
                
                # ✅ RESPONSE QUALITY METRICS
                quality_metrics = self._calculate_quality_metrics(service_name, response_json, test)
                result.update(quality_metrics)
                # ✅ SEMANTIC QUALITY SCORE
                # Compute a 0-1 semantic quality score based on text length, positivity and emoji usage
                try:
                    # Prefer feedback for analyze, response/message for chat, fallback to stringified JSON
                    if service_name == "analyze":
                        response_text = str(response_json.get("feedback", ""))
                    elif service_name == "chat":
                        response_text = str(response_json.get("response", "") or response_json.get("message", ""))
                    else:
                        response_text = str(response_json)

                    result["semantic_quality"] = self._semantic_quality_score(response_text)
                except Exception:
                    result["semantic_quality"] = 0.0

                # ✅ REASONING / COMPLEXITY SCORE (if AI provided a suggested code fix)
                try:
                    # Try to extract a proposed code snippet from common fields
                    code_snippet = ""
                    if isinstance(response_json.get("suggestions"), list) and response_json.get("suggestions"):
                        # take first suggestion if it's a code-like string
                        candidate = response_json.get("suggestions")[0]
                        if isinstance(candidate, str):
                            code_snippet = candidate
                    if not code_snippet:
                        # look for `fix` or `suggestion` fields
                        code_snippet = response_json.get("fix") or response_json.get("suggestion") or ""
                    if not code_snippet and service_name == "chat":
                        # try to extract code block from chat response
                        msg = str(response_json.get("response", "") or response_json.get("message", ""))
                        # naive extraction of triple-backtick block
                        if "```" in msg:
                            parts = msg.split("```")
                            if len(parts) >= 3:
                                code_snippet = parts[1]

                    if code_snippet:
                        result["reasoning_complexity_score"] = self._validate_ai_reasoning(code_snippet, test)
                    else:
                        result["reasoning_complexity_score"] = 0.0
                except Exception:
                    result["reasoning_complexity_score"] = 0.0
                
            else:
                result["semantic_success"] = False
                result["success"] = False
                result["error"] = response.text[:500]  # Truncate long errors
                
                # ✅ ERROR CATEGORIZATION
                result["error_type"] = self._categorize_error(response.status_code, response.text)
            
            return result
            
        except Exception as e:
            end_time = datetime.now()
            duration_ms = (end_time - start_time).total_seconds() * 1000
            
            error_str = str(e)
            
            return {
                "service": service_name,
                "test_id": test["id"],
                "test_name": test["name"],
                "evaluation_category": test.get("evaluation_category", "general"),
                "difficulty_level": test.get("difficulty_level", 3),
                "model": model,
                "http_success": False,
                "semantic_success": False,
                "success": False,
                "error": error_str[:500],
                "error_type": self._categorize_error(None, error_str),
                "response_time_ms": duration_ms,
                "timestamp": start_time.isoformat()
            }
    
    def _evaluate_semantic_success(self, service_name: str, response_json: Dict, test: Dict) -> bool:
        """
        Evaluate if the AI response is semantically successful.

        Enhanced checks for Phase 2: content-based assertions that check tone,
        relevance and constraint adherence. Uses mission context from the test
        where available.
        """
        # CHAT: require length, emoji presence, and forbid error-traces
        if service_name == "chat":
            text = str(response_json.get("response", "") or response_json.get("message", ""))
            if len(text) < 20:
                return False
            # must include at least one friendly/assistant emoji
            if not any(e in text for e in ["😀", "😄", "🤖", "✨", "🌟", "💡", "👍", "🎯", "😊"]):
                return False
            banned = ["traceback", "stack", "undefined variable", "error:"]
            if any(b in text.lower() for b in banned):
                return False
            return True

        # ANALYZE: require meaningful feedback, a score, and mention of mission concepts
        if service_name == "analyze":
            fb = str(response_json.get("feedback", ""))
            if len(fb.split()) < 10:
                return False
            if "score" not in response_json:
                return False
            mission_concepts = self._extract_expected_concepts(test)
            if mission_concepts:
                # ensure the feedback mentions at least one expected concept
                if not any(c in fb.lower() for c in mission_concepts):
                    return False
            return True

        # Keep existing heuristic for hint and recommend
        if service_name == "hint":
            return (
                "hints" in response_json or
                "hint" in response_json or
                ("message" in response_json and len(response_json.get("message", "")) > 10)
            )

        if service_name == "recommend":
            return (
                "recommendedMissions" in response_json or
                "recommendations" in response_json
            )

        # Default fallback
        return True
        return True  # Default: assume success if we got a response
    
    def _calculate_quality_metrics(self, service_name: str, response_json: Dict, test: Dict) -> Dict[str, Any]:
        """Calculate detailed quality metrics for the response"""
        metrics = {}
        
        if service_name == "analyze":
            feedback = str(response_json.get("feedback", ""))
            metrics["feedback_length_chars"] = len(feedback)
            metrics["feedback_length_words"] = len(feedback.split())
            
            # Count positive tone indicators
            positive_words = ["great", "nice", "good", "excellent", "well done", "awesome", "perfect"]
            metrics["tone_positive_count"] = sum(1 for word in positive_words if word in feedback.lower())
            
            # Extract score if available
            if "score" in response_json:
                metrics["ai_score"] = response_json["score"]
            
            # Check for concept detection
            if "detectedConcepts" in response_json:
                metrics["concepts_detected"] = len(response_json["detectedConcepts"])
            
        elif service_name == "chat":
            message = str(response_json.get("message", ""))
            metrics["response_length_chars"] = len(message)
            metrics["response_length_words"] = len(message.split())
            
            # Check if code examples provided
            metrics["contains_code_example"] = "```" in message or "print(" in message
            
            # Check helpfulness indicators
            help_indicators = ["try", "you can", "hint", "suggestion"]
            metrics["helpfulness_indicators"] = sum(1 for indicator in help_indicators if indicator in message.lower())
            
        elif service_name == "hint":
            hints = response_json.get("hints", response_json.get("hint", []))
            if isinstance(hints, str):
                hints = [hints]
            metrics["num_hints"] = len(hints)
            
            if hints:
                total_hint_length = sum(len(str(h)) for h in hints)
                metrics["avg_hint_length"] = total_hint_length / len(hints) if hints else 0
        
        elif service_name == "recommend":
            recs = response_json.get("recommendedMissions", response_json.get("recommendations", []))
            metrics["num_recommendations"] = len(recs) if isinstance(recs, list) else 0
        
        return metrics
    
    def _categorize_error(self, status_code: int, error_text: str) -> str:
        """Categorize errors for better analytics"""
        error_lower = error_text.lower()
        
        if status_code == 500:
            return "ServerError"
        elif status_code == 400 or status_code == 422:
            return "ValidationError"
        elif status_code == 404:
            return "NotFound"
        elif status_code == 401 or status_code == 403:
            return "AuthError"
        elif "timeout" in error_lower:
            return "Timeout"
        elif "connection" in error_lower or "connect" in error_lower:
            return "ConnectionError"
        elif "rate limit" in error_lower:
            return "RateLimitError"
        else:
            return "UnknownError"
    
    def _get_timeout_for_test(self, test: Dict[str, Any]) -> float:
        """
        Calculate appropriate timeout for a test based on difficulty and trap category.
        
        Trap tests that are designed to catch infinite loops or long processing
        should have shorter timeouts to fail fast.
        """
        # Default timeout: 60 seconds for normal tests
        base_timeout = 60.0
        
        # Check if this is a trap test
        trap_category = test.get("trap_category", "")
        
        # Infinite loop traps should timeout quickly
        if trap_category == "infinite_patterns":
            return 15.0  # 15 seconds max for infinite loop detection
        
        # Timeout simulation traps get extended time
        if trap_category == "timeout_handling":
            return 90.0
        
        # Long input traps need more time
        if trap_category == "long_input":
            return 75.0
        
        # Most other traps: standard timeout
        if test.get("is_trap_test") or "trap_category" in test:
            return 45.0  # Traps get 45 seconds
        
        # Adjust based on difficulty level
        difficulty = test.get("difficulty_level", 3)
        if difficulty >= 5:
            return base_timeout + 20.0  # Hard tests: 80 seconds
        elif difficulty >= 4:
            return base_timeout + 10.0  # Medium-hard: 70 seconds
        else:
            return base_timeout  # Easy-medium: 60 seconds

    # ------------------ SEMANTIC / QUALITY HELPERS ------------------
    def _extract_expected_concepts(self, test: Dict) -> List[str]:
        """Extract expected concepts from the test's mission context (normalized)

        Looks for `mission_context`, `missionContext` or `mission` fields and returns
        a list of concept strings lowercased.
        """
        mc = test.get("mission_context") or test.get("missionContext") or test.get("mission") or {}
        if not isinstance(mc, dict):
            return []
        concepts = mc.get("concepts") or mc.get("expected_concepts") or mc.get("requiredConcepts") or []
        if isinstance(concepts, str):
            concepts = [concepts]
        return [str(c).lower() for c in concepts if c]

    def _semantic_quality_score(self, text: str) -> float:
        """Return a 0-1 semantic quality score for a text response.

        Tries to use TextBlob for sentiment polarity; falls back to a lightweight heuristic
        if TextBlob is not available.
        """
        try:
            from textblob import TextBlob
            use_textblob = True
        except Exception:
            use_textblob = False

        if not text:
            return 0.0

        length_factor = min(len(text) / 100.0, 1.0)

        if use_textblob:
            try:
                polarity = TextBlob(text).sentiment.polarity  # -1..1
                positivity = (polarity + 1.0) / 2.0
            except Exception:
                positivity = 0.5
        else:
            # fallback: simple positive-word ratio
            positives = ["good", "great", "nice", "excellent", "well", "awesome", "helpful", "thanks", "thank"]
            lower = text.lower()
            positivity = min(1.0, sum(1 for p in positives if p in lower) / max(1, len(positives)))

        emoji_bonus = 1.0 if any(e in text for e in ["🤖", "🌟", "💡"]) else 0.8

        score = (length_factor * 0.4) + (positivity * 0.4) + (emoji_bonus * 0.2)
        score = max(0.0, min(1.0, round(score, 2)))
        return score

    def _validate_ai_reasoning(self, code_snippet: str, test: Dict) -> float:
        """Use internal SolutionValidator to estimate reasoning/complexity score (0-1).

        The validator expects actual_output to equal expected_output; we pass the
        expected_output as actual_output to force deeper analysis of structure.
        """
        try:
            # Import the global validator instance
            from app.services.solution_validator import validator
        except Exception:
            return 0.0

        mission_ctx = test.get("mission_context") or test.get("missionContext") or {}
        expected_output = mission_ctx.get("expectedOutput") or mission_ctx.get("expected_output") or mission_ctx.get("expected") or ""
        required_concepts = mission_ctx.get("concepts") or mission_ctx.get("requiredConcepts") or []
        difficulty = mission_ctx.get("difficulty") or test.get("difficulty_level", "medium")

        try:
            validation_result = validator.validate_solution(
                code_snippet,
                expected_output,
                required_concepts,
                difficulty=difficulty,
                actual_output=expected_output,
                validation_rules=mission_ctx.get("validationRules", {})
            )
            # Normalize complexity score 0-100 -> 0-1
            return max(0.0, min(1.0, validation_result.complexity_score / 100.0))
        except Exception:
            return 0.0
    
    async def run_comprehensive_benchmark(self, repeat_count: int = 1):
        """Run comprehensive benchmark across all services"""
        all_results = []
        
        print("\n" + "="*80)
        print("🧪 COMPREHENSIVE AI SERVICE BENCHMARK")
        print("="*80)
        print(f"\n📊 Testing {len(self.models)} models across multiple services")
        if repeat_count > 1:
            print(f"🔁 Each test repeated {repeat_count} times")
        else:
            print(f"🔁 Each test run once (failures are model issues, not retried)")
        
        total_tests = (
            len(self.analyze_tests) +
            len(self.chat_tests) +
            len(self.hint_tests) +
            len(self.recommend_tests) +
            len(self.behavior_tests)
        ) * len(self.models) * repeat_count
        
        print(f"⏱️  Total tests: {total_tests}\n")
        
        # Create client with NO timeout - AI models can take as long as needed
        timeout = httpx.Timeout(None)  # All timeouts disabled
        async with httpx.AsyncClient(timeout=timeout) as client:
            for model_idx, model in enumerate(self.models, 1):
                print(f"\n{'='*80}")
                print(f"🤖 Testing Model {model_idx}/{len(self.models)}: {model}")
                print(f"{'='*80}\n")
                
                # Test ANALYZE service
                print(f"   📝 ANALYZE Service ({len(self.analyze_tests)} tests)")
                for test_idx, test in enumerate(self.analyze_tests, 1):
                    for attempt in range(1, repeat_count + 1):
                        result = await self.test_service("analyze", "analyze", test, model, client)
                        all_results.append(result)
                        status = "✅" if result["success"] else "❌"
                        print(f"      [{attempt}/{repeat_count}] {status} {test['name']}: {result['response_time_ms']:.0f}ms")
                        
                        # Rate limiting: wait between tests (skip on last test)
                        if test_idx < len(self.analyze_tests) or attempt < repeat_count:
                            await asyncio.sleep(self.delay_between_tests)
                
                # Delay between services to respect rate limits
                print(f"\n   ⏸️  Waiting {self.delay_between_services}s between services...")
                await asyncio.sleep(self.delay_between_services)
                
                # Test CHAT service
                print(f"\n   💬 CHAT Service ({len(self.chat_tests)} tests)")
                for test_idx, test in enumerate(self.chat_tests, 1):
                    for attempt in range(1, repeat_count + 1):
                        result = await self.test_service("chat", "chat", test, model, client)
                        all_results.append(result)
                        status = "✅" if result["success"] else "❌"
                        print(f"      [{attempt}/{repeat_count}] {status} {test['name']}: {result['response_time_ms']:.0f}ms")
                        
                        # Rate limiting: wait between tests (skip on last test)
                        if test_idx < len(self.chat_tests) or attempt < repeat_count:
                            await asyncio.sleep(self.delay_between_tests)
                
                # Delay between services
                print(f"\n   ⏸️  Waiting {self.delay_between_services}s between services...")
                await asyncio.sleep(self.delay_between_services)
                
                # Test HINT service
                print(f"\n   💡 HINT Service ({len(self.hint_tests)} tests)")
                for test_idx, test in enumerate(self.hint_tests, 1):
                    for attempt in range(1, repeat_count + 1):
                        result = await self.test_service("hint", "hint", test, model, client)
                        all_results.append(result)
                        status = "✅" if result["success"] else "❌"
                        print(f"      [{attempt}/{repeat_count}] {status} {test['name']}: {result['response_time_ms']:.0f}ms")
                        
                        # Rate limiting: wait between tests (skip on last test)
                        if test_idx < len(self.hint_tests) or attempt < repeat_count:
                            await asyncio.sleep(self.delay_between_tests)
                
                # Delay between services
                print(f"\n   ⏸️  Waiting {self.delay_between_services}s between services...")
                await asyncio.sleep(self.delay_between_services)
                
                # Test BEHAVIOR service
                print(f"\n   🧠 BEHAVIOR Service ({len(self.behavior_tests)} tests)")
                for test_idx, test in enumerate(self.behavior_tests, 1):
                    for attempt in range(1, repeat_count + 1):
                        result = await self.test_service("behavior", "behavior/analyze", test, model, client)
                        all_results.append(result)
                        status = "✅" if result["success"] else "❌"
                        print(f"      [{attempt}/{repeat_count}] {status} {test['name']}: {result['response_time_ms']:.0f}ms")
                        
                        # Rate limiting: wait between tests (skip on last test)
                        if test_idx < len(self.behavior_tests) or attempt < repeat_count:
                            await asyncio.sleep(self.delay_between_tests)
                
                # Test RECOMMEND service (no AI model parameter)
                if model == self.models[0]:  # Only test once, not per model
                    # Delay before recommend service
                    print(f"\n   ⏸️  Waiting {self.delay_between_services}s between services...")
                    await asyncio.sleep(self.delay_between_services)
                    
                    print(f"\n   🎯 RECOMMEND Service ({len(self.recommend_tests)} tests)")
                    for test_idx, test in enumerate(self.recommend_tests, 1):
                        for attempt in range(1, repeat_count + 1):
                            result = await self.test_service("recommend", "recommend", test, "rule-based", client)
                            all_results.append(result)
                            status = "✅" if result["success"] else "❌"
                            print(f"      [{attempt}/{repeat_count}] {status} {test['name']}: {result['response_time_ms']:.0f}ms")
                            
                            # Rate limiting: wait between tests (skip on last test)
                            if test_idx < len(self.recommend_tests) or attempt < repeat_count:
                                await asyncio.sleep(self.delay_between_tests)
                    
                    # Delay before meta tests
                    print(f"\n   ⏸️  Waiting {self.delay_between_services}s between services...")
                    await asyncio.sleep(self.delay_between_services)
                    
                    # Test META/STRESS traps (cross-service tests)
                    print(f"\n   🧪 META/STRESS Tests ({len(self.meta_trap_tests)} tests)")
                    for test_idx, test in enumerate(self.meta_trap_tests, 1):
                        for attempt in range(1, repeat_count + 1):
                            # Meta tests specify their own service
                            service = test.get("service", "chat")
                            endpoint = service
                            test_model = model if service != "recommend" else "rule-based"
                            result = await self.test_service(service, endpoint, test, test_model, client)
                            all_results.append(result)
                            status = "✅" if result["success"] else "❌"
                            trap_cat = test.get("trap_category", "unknown")
                            print(f"      [{attempt}/{repeat_count}] {status} [{trap_cat}] {test['name']}: {result['response_time_ms']:.0f}ms")
                            
                            # Rate limiting: wait between tests (skip on last test)
                            if test_idx < len(self.meta_trap_tests) or attempt < repeat_count:
                                await asyncio.sleep(self.delay_between_tests)
        
        # Save results to model-specific directory
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = os.path.join(self.model_output_dir, f"benchmark_{timestamp}.json")
        
        with open(output_file, 'w') as f:
            json.dump(all_results, f, indent=2)
        
        print(f"\n{'='*80}")
        print(f"✅ Comprehensive benchmark complete!")
        print(f"📁 Results saved to: {output_file}")
        print(f"📂 Model folder: {self.model_output_dir}")
        print(f"{'='*80}\n")
        
        # Generate summary
        self.generate_summary(all_results)
        
        # 🆕 AUTOMATIC ANALYTICS GENERATION
        print(f"\n{'='*80}")
        print(f"📊 GENERATING ANALYTICS...")
        print(f"{'='*80}\n")
        
        try:
            # Import and run the evaluator
            from comprehensive_ai_evaluator import ComprehensiveAIEvaluator
            
            evaluator = ComprehensiveAIEvaluator(model_folder=self.model_name)
            evaluator.evaluate_all_services()  # This calls generate_comprehensive_report internally
            
            print(f"✅ Analytics generated successfully!")
            print(f"📂 Analytics folder: data/analytics_export/{self.model_name}/")
            
        except Exception as e:
            print(f"⚠️  Analytics generation failed: {e}")
            print(f"   You can run it manually: python comprehensive_ai_evaluator.py")
        
        # 🆕 CREATE/UPDATE GLOBAL SUMMARY
        self.update_global_summary(all_results)
        
        return all_results
    
    def update_global_summary(self, results: List[Dict]):
        """Create or update global summary JSON for cross-model comparison"""
        global_summary_file = "data/benchmark_results/GLOBAL_SUMMARY.json"
        
        # Load existing global summary
        if os.path.exists(global_summary_file):
            with open(global_summary_file, 'r') as f:
                global_data = json.load(f)
        else:
            global_data = {
                "last_updated": None,
                "models": {}
            }
        
        # Calculate summary for this model
        model_name = self.models[0] if self.models else "unknown"
        
        total_tests = len(results)
        http_successful = [r for r in results if r.get("http_success", False)]
        semantic_successful = [r for r in results if r.get("semantic_success", False)]
        response_times = [r["response_time_ms"] for r in results if "response_time_ms" in r]
        
        # Error categorization
        error_results = [r for r in results if not r.get("http_success", False)]
        error_categories = {}
        for r in error_results:
            error_type = r.get("error_type", "Unknown")
            error_categories[error_type] = error_categories.get(error_type, 0) + 1
        
        # By service stats
        services_summary = {}
        for service_name in ["analyze", "chat", "hint", "recommend"]:
            service_results = [r for r in results if r["service"] == service_name]
            if service_results:
                service_successful = [r for r in service_results if r.get("semantic_success", False)]
                service_times = [r["response_time_ms"] for r in service_results]
                # Aggregate semantic quality and reasoning complexity if present
                service_semantic_scores = [r.get("semantic_quality") for r in service_results if r.get("semantic_quality") is not None]
                service_reasoning_scores = [r.get("reasoning_complexity_score") for r in service_results if r.get("reasoning_complexity_score") is not None]

                services_summary[service_name] = {
                    "total_tests": len(service_results),
                    "semantic_success_count": len(service_successful),
                    "semantic_success_rate": len(service_successful) / len(service_results) * 100,
                    "avg_response_time_ms": statistics.mean(service_times) if service_times else 0,
                    "median_response_time_ms": statistics.median(service_times) if service_times else 0,
                    "semantic_quality_mean": statistics.mean(service_semantic_scores) if service_semantic_scores else 0,
                    "semantic_quality_median": statistics.median(service_semantic_scores) if service_semantic_scores else 0,
                    "semantic_quality_stdev": statistics.stdev(service_semantic_scores) if len(service_semantic_scores) > 1 else 0,
                    "reasoning_complexity_mean": statistics.mean(service_reasoning_scores) if service_reasoning_scores else 0,
                    "reasoning_complexity_median": statistics.median(service_reasoning_scores) if service_reasoning_scores else 0,
                    "reasoning_complexity_stdev": statistics.stdev(service_reasoning_scores) if len(service_reasoning_scores) > 1 else 0,
                }
        
        # Update global summary
        # Aggregate semantic_quality and reasoning_complexity across all results
        semantic_quality_scores = [r.get("semantic_quality") for r in results if r.get("semantic_quality") is not None]
        reasoning_scores = [r.get("reasoning_complexity_score") for r in results if r.get("reasoning_complexity_score") is not None]

        global_data["models"][model_name] = {
            "last_run": datetime.now().isoformat(),
            "metadata": self.metadata,
            "total_tests": total_tests,
            "http_success_count": len(http_successful),
            "http_success_rate": len(http_successful) / total_tests * 100 if total_tests > 0 else 0,
            "semantic_success_count": len(semantic_successful),
            "semantic_success_rate": len(semantic_successful) / total_tests * 100 if total_tests > 0 else 0,
            "response_time_mean_ms": statistics.mean(response_times) if response_times else 0,
            "response_time_median_ms": statistics.median(response_times) if response_times else 0,
            "response_time_stdev_ms": statistics.stdev(response_times) if len(response_times) > 1 else 0,
            "response_time_min_ms": min(response_times) if response_times else 0,
            "response_time_max_ms": max(response_times) if response_times else 0,
            "error_categories": error_categories,
            "semantic_quality_mean": statistics.mean(semantic_quality_scores) if semantic_quality_scores else 0,
            "semantic_quality_median": statistics.median(semantic_quality_scores) if semantic_quality_scores else 0,
            "semantic_quality_stdev": statistics.stdev(semantic_quality_scores) if len(semantic_quality_scores) > 1 else 0,
            "reasoning_complexity_mean": statistics.mean(reasoning_scores) if reasoning_scores else 0,
            "reasoning_complexity_median": statistics.median(reasoning_scores) if reasoning_scores else 0,
            "reasoning_complexity_stdev": statistics.stdev(reasoning_scores) if len(reasoning_scores) > 1 else 0,
            "services": services_summary
        }
        
        global_data["last_updated"] = datetime.now().isoformat()
        
        # Save global summary
        os.makedirs(os.path.dirname(global_summary_file), exist_ok=True)
        with open(global_summary_file, 'w') as f:
            json.dump(global_data, f, indent=2)
        
        print(f"\n{'='*80}")
        print(f"🌐 GLOBAL SUMMARY UPDATED")
        print(f"{'='*80}")
        print(f"📁 File: {global_summary_file}")
        print(f"📊 Models tracked: {len(global_data['models'])}")
        print(f"✅ Latest: {model_name}")
        print(f"{'='*80}\n")
    
    def generate_summary(self, results: List[Dict]):
        """Generate comprehensive summary with statistical analysis"""
        print("\n📊 COMPREHENSIVE BENCHMARK SUMMARY\n")
        
        # Overall statistics
        total_tests = len(results)
        http_successful = [r for r in results if r.get("http_success", False)]
        semantic_successful = [r for r in results if r.get("semantic_success", False)]
        
        print(f"{'='*60}")
        print(f"📈 OVERALL STATISTICS")
        print(f"{'='*60}")
        print(f"  Total Tests: {total_tests}")
        print(f"  HTTP Success: {len(http_successful)} ({len(http_successful)/total_tests*100:.1f}%)")
        print(f"  Semantic Success: {len(semantic_successful)} ({len(semantic_successful)/total_tests*100:.1f}%)")
        # Print aggregated semantic quality and reasoning complexity if available
        semantic_quality_scores = [r.get("semantic_quality") for r in results if r.get("semantic_quality") is not None]
        reasoning_scores = [r.get("reasoning_complexity_score") for r in results if r.get("reasoning_complexity_score") is not None]
        if semantic_quality_scores:
            print(f"  Semantic Quality (mean): {statistics.mean(semantic_quality_scores):.2f}")
        if reasoning_scores:
            print(f"  Reasoning Complexity (mean): {statistics.mean(reasoning_scores):.2f}")
        
        # Response time statistics
        response_times = [r["response_time_ms"] for r in results if "response_time_ms" in r]
        if response_times:
            print(f"\n  Response Time Statistics:")
            print(f"    Mean: {statistics.mean(response_times):.1f}ms")
            print(f"    Median: {statistics.median(response_times):.1f}ms")
            if len(response_times) > 1:
                print(f"    Std Dev: {statistics.stdev(response_times):.1f}ms")
            print(f"    Min: {min(response_times):.1f}ms")
            print(f"    Max: {max(response_times):.1f}ms")
        
        # Error categorization
        error_results = [r for r in results if not r.get("http_success", False)]
        if error_results:
            error_categories = {}
            for r in error_results:
                error_type = r.get("error_type", "Unknown")
                error_categories[error_type] = error_categories.get(error_type, 0) + 1
            
            print(f"\n  Error Distribution:")
            for error_type, count in sorted(error_categories.items(), key=lambda x: x[1], reverse=True):
                print(f"    {error_type}: {count} ({count/len(error_results)*100:.1f}%)")
        
        # Group by service
        services = {}
        for result in results:
            service = result["service"]
            if service not in services:
                services[service] = []
            services[service].append(result)
        
        # Print summary by service
        for service_name, service_results in services.items():
            print(f"\n{'='*60}")
            print(f"📦 {service_name.upper()} SERVICE")
            print(f"{'='*60}")
            
            # Service-level statistics
            service_semantic_success = [r for r in service_results if r.get("semantic_success", False)]
            service_times = [r["response_time_ms"] for r in service_results]
            
            print(f"  Tests: {len(service_results)}")
            print(f"  Semantic Success Rate: {len(service_semantic_success)/len(service_results)*100:.1f}%")
            print(f"  Avg Response Time: {statistics.mean(service_times):.1f}ms")
            
            # Evaluation category breakdown
            categories = {}
            for r in service_results:
                cat = r.get("evaluation_category", "general")
                if cat not in categories:
                    categories[cat] = {"total": 0, "success": 0}
                categories[cat]["total"] += 1
                if r.get("semantic_success", False):
                    categories[cat]["success"] += 1
            
            if categories:
                print(f"\n  By Evaluation Category:")
                for cat, stats in sorted(categories.items()):
                    success_rate = stats["success"] / stats["total"] * 100 if stats["total"] > 0 else 0
                    print(f"    {cat.capitalize()}: {stats['success']}/{stats['total']} ({success_rate:.1f}%)")
            
            # Difficulty level breakdown
            difficulties = {}
            for r in service_results:
                diff = r.get("difficulty_level", 0)
                if diff not in difficulties:
                    difficulties[diff] = {"total": 0, "success": 0}
                difficulties[diff]["total"] += 1
                if r.get("semantic_success", False):
                    difficulties[diff]["success"] += 1
            
            if difficulties:
                print(f"\n  By Difficulty Level:")
                for diff, stats in sorted(difficulties.items()):
                    success_rate = stats["success"] / stats["total"] * 100 if stats["total"] > 0 else 0
                    print(f"    Level {diff}: {stats['success']}/{stats['total']} ({success_rate:.1f}%)")
            
            # Group by model
            models = {}
            for result in service_results:
                model = result["model"]
                if model not in models:
                    models[model] = []
                models[model].append(result)
            
            for model, model_results in models.items():
                http_successful_model = [r for r in model_results if r.get("http_success", False)]
                semantic_successful_model = [r for r in model_results if r.get("semantic_success", False)]
                model_times = [r["response_time_ms"] for r in model_results]
                
                print(f"\n  📊 {model}:")
                print(f"    HTTP Success: {len(http_successful_model)}/{len(model_results)} ({len(http_successful_model)/len(model_results)*100:.1f}%)")
                print(f"    Semantic Success: {len(semantic_successful_model)}/{len(model_results)} ({len(semantic_successful_model)/len(model_results)*100:.1f}%)")
                print(f"    Avg Response Time: {statistics.mean(model_times):.1f}ms")
                if len(model_times) > 1:
                    print(f"    Response Time Std Dev: {statistics.stdev(model_times):.1f}ms")
        
        print(f"\n{'='*60}")
        print(f"📁 Environment Metadata:")
        print(f"{'='*60}")
        for key, value in self.metadata.items():
            if key == "python_version":
                print(f"  {key}: {value.split()[0]}")  # Shorten Python version
            elif key == "os":
                print(f"  {key}: {value}")
            else:
                print(f"  {key}: {value}")
        print()


async def main():
    """Run comprehensive benchmark"""
    print("\n🚀 Starting Comprehensive AI Service Benchmark...\n")
    
    # Check if AI service is running
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get("http://localhost:8000/api/v1/health", timeout=5.0)
            if response.status_code != 200:
                print("❌ AI service is not running!")
                print("Start it with: python -m uvicorn app.main:app --reload --port 8000")
                return
    except Exception as e:
        print("❌ Cannot connect to AI service!")
        print(f"Error: {e}")
        print("Start it with: python -m uvicorn app.main:app --reload --port 8000")
        return
    
    benchmark = ComprehensiveAIBenchmark()
    await benchmark.run_comprehensive_benchmark(repeat_count=1)
    
    print("\n✨ Comprehensive benchmark complete!\n")
    print("📊 What was generated:")
    print("   ✅ Benchmark results (JSON)")
    print("   ✅ Analytics report (MD + CSV)")
    print("   ✅ Global summary (JSON)")
    print()
    print("📂 Check your results:")
    print(f"   • data/benchmark_results/<model_name>/")
    print(f"   • data/analytics_export/<model_name>/")
    print(f"   • data/benchmark_results/GLOBAL_SUMMARY.json")
    print()
    print("🔄 To test another model:")
    print("   1. Edit .env and change OPENAI_MODEL_NAME")
    print("   2. Run this script again")
    print("   3. Compare results in GLOBAL_SUMMARY.json")
    print()


if __name__ == "__main__":
    asyncio.run(main())
