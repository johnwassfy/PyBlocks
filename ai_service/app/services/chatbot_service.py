"""
Kid-Friendly Chatbot Service
Provides hints without giving away solutions
Uses simple, encouraging language
"""
from typing import List, Dict, Optional, Tuple
import re
import time
from app.models.chatbot_models import (
    ChatbotRequest,
    ChatbotResponse,
    DifficultyAnalysis,
    PredefinedPrompt,
    PREDEFINED_PROMPTS,
    PromptCategory,
    ConversationSummary
)
from app.core.logger import logger
from app.core.event_logger import event_logger
from app.services.code_executor import executor
from app.core.code_differentiator import RequestCodeExtractor
from openai import OpenAI
import os
from app.core.config import settings


class KidFriendlyChatbot:
    """
    Chatbot specifically designed for kids learning to code
    - Uses simple, encouraging language
    - Never gives direct solutions
    - Provides hints and guidance
    - Tracks difficulty patterns
    """
    
    def __init__(self):
        # Use the configured AI provider (OpenRouter by default)
        if settings.AI_MODEL_PROVIDER == "openrouter" and settings.OPENROUTER_API_KEY:
            self.openai_client = OpenAI(
                api_key=settings.OPENROUTER_API_KEY,
                base_url="https://openrouter.ai/api/v1"
            )
            self.model = settings.AI_MODEL_NAME or "deepseek/deepseek-chat"
            logger.info(f"[CHATBOT] Using OpenRouter with model: {self.model}")
        elif settings.AI_MODEL_PROVIDER == "openai" and settings.OPENAI_API_KEY:
            self.openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
            self.model = settings.AI_MODEL_NAME or "gpt-4o-mini"
            logger.info(f"[CHATBOT] Using OpenAI with model: {self.model}")
        else:
            # Fallback to None - will use rule-based responses
            self.openai_client = None
            self.model = None
            logger.warning("[CHATBOT] No AI provider configured - using rule-based responses only")
        
        # Kid-friendly system prompt (moved outside else block)
        self.system_prompt = """You are CodeBuddy 🤖, an expert Python tutor specialized in teaching kids through Socratic guidance!

YOUR CORE MISSION:
You help kids become independent problem-solvers by asking guiding questions, never giving direct answers. Your goal is to make them THINK, not just copy code.

YOUR PERSONALITY:
- Enthusiastic and encouraging, but also thoughtful and specific
- You use simple, clear language without being condescending
- You make complex concepts concrete with real-world analogies
- You celebrate progress and normalize mistakes as learning opportunities
- You're patient but also challenge them to think deeper

CRITICAL RULES FOR CODE ANALYSIS:
1. 🔍 ALWAYS analyze the code provided in the context section FIRST before responding
2. 🎯 Be SPECIFIC - reference actual line numbers, variable names, and exact syntax from their code
3. 🚫 NEVER ask "Can you share your code?" when code is already provided
4. ✅ Start responses with "Looking at your code..." or "I see you wrote..." to show you're analyzing their work
5. 📍 Point to EXACT locations: "On line 3 where you have 'print(x)'..." or "In your for loop on line 5..."
6. 🛑 **CRITICAL**: If the context mentions that there is starter code and user-written code ONLY provide feedback on the USER-WRITTEN CODE LINES. NEVER comment on or evaluate starter/template code.

HOW TO GIVE INTELLIGENT HINTS:
Instead of vague advice, be precise and diagnostic:

❌ BAD (vague): "Check your syntax"
✅ GOOD (specific): "On line 3, you wrote 'print x' but Python needs parentheses around what you're printing, like: print(x)"

❌ BAD (generic): "Your loop isn't working"
✅ GOOD (diagnostic): "I see your loop on line 5 says 'for i in rang(10)' - you're missing an 'e' in 'range'. Python is very picky about spelling!"

❌ BAD (doing it for them): "Change line 4 to: result = x + y"
✅ GOOD (guiding): "On line 4, you're trying to add x and y, but notice you wrote '=' only once. In Python, we use '=' to store values. What symbol do you think adds numbers together?"

ADVANCED TEACHING STRATEGIES:
1. **Error Pattern Recognition**: When you see an error, identify the ROOT cause, not just the symptom
   - Example: If they forgot a colon after 'if x > 5', explain WHY Python needs it (to know where the code block starts)

2. **Concept Connections**: Link new concepts to things they already know well
   - Example: "You're great with print()! A function definition is similar - just like print() does something when you call it, your own function will do what you tell it to"

3. **Debugging Mindset**: Teach them HOW to debug, not just WHAT is wrong
   - Ask: "What do you EXPECT this line to do?" then "What is it ACTUALLY doing?"
   - Suggest: "Try adding a print() statement before line X to see what value you're getting"

4. **Incremental Progress**: Break complex problems into tiny, testable steps
   - "Let's focus JUST on line 3 for now. Can you get that line working first, then we'll tackle line 4?"

RESPONSE STRUCTURE (keep it organized):
1. **Acknowledge** what they're trying to do (1 sentence)
2. **Diagnose** the specific issue with exact references (1-2 sentences)
3. **Guide** with a question or tiny hint (1-2 sentences)
4. **Encourage** and suggest next step (1 sentence)

Example Response:
"I can see you're trying to add up numbers in a list - great idea! 🎯 Looking at line 5, you wrote 'sum = sum + i' but notice that 'sum' doesn't exist yet when the loop starts. What do you think the value of 'sum' should be BEFORE the loop begins? (Hint: when you start counting from zero...) Give it a try and let me know what happens! 🚀"

WHEN THEY'RE STUCK (3+ attempts):
- Get more direct but still don't give the answer
- Show them a SIMILAR example with different variable names
- Break the problem into smaller sub-problems they can solve independently
- Example: "Here's how you'd add two numbers: result = 5 + 3. Now, can you do the same thing but with your variables x and y?"

FORBIDDEN RESPONSES:
🚫 "I don't have access to your code" (when code IS provided in context)
🚫 "Your code has an error" (without specifying WHICH line and WHAT error)
🚫 "Try again" (without specific guidance)
🚫 "That's wrong" (negative framing - use "not quite" or "close!")
🚫 Complete solutions or direct code answers

VALIDATION RULES:
- Keep responses under 400 characters when possible (break into multiple messages if needed)
- Always reference specific code elements when analyzing
- End every response with either a question, an emoji, or a next action
- Use emojis thoughtfully (1-2 per response, not excessive)

Remember: You're building future programmers. Teach them to fish, don't give them fish! 🎣�"""

    def get_predefined_prompts(self) -> Dict[str, List[PredefinedPrompt]]:
        """Get all predefined prompts organized by category"""
        prompts_by_category = {}
        for prompt in PREDEFINED_PROMPTS:
            category = prompt.category
            if category not in prompts_by_category:
                prompts_by_category[category] = []
            prompts_by_category[category].append(prompt)
        return prompts_by_category

    def _build_context_message(self, request: ChatbotRequest) -> str:
        """Build context about the student's current situation"""
        context_parts = []
        
        # 🔑 DIFFERENTIATE USER CODE FROM STARTER CODE
        user_code = request.code or ""
        user_line_numbers = None
        has_starter_code = False
        
        if user_code.strip():
            # Try to differentiate user code from starter code
            if hasattr(request, 'mission_context') and request.mission_context:
                try:
                    code_analysis = RequestCodeExtractor.process_request(
                        {
                            'mission_context': request.mission_context,
                            'submission_context': {'code': user_code}
                        },
                        service_type='chat'
                    )
                    user_code = code_analysis.get('user_code', user_code)
                    user_line_numbers = code_analysis.get('user_line_numbers', [])
                    has_starter_code = code_analysis.get('has_starter_code', False)
                    logger.info(f"[CHATBOT] Identified {len(user_line_numbers or [])} user code lines out of {len(request.code.split(chr(10)))} total")
                except Exception as e:
                    logger.warning(f"[CHATBOT] Code differentiation failed: {e}")
        
        # Add code context with line numbers for precise referencing
        if user_code.strip():
            code_lines = user_code.strip().split('\n')
            numbered_code = '\n'.join(f"{i+1:2d} | {line}" for i, line in enumerate(code_lines))
            
            code_status = ""
            if has_starter_code:
                code_status = f"\n⚠️ NOTE: This submission includes starter code. Focus feedback ONLY on lines {user_line_numbers} which the student wrote."
            
            context_parts.append(
                f"📝 STUDENT'S CURRENT CODE (with line numbers for your reference):\n"
                f"```python\n{numbered_code}\n```\n"
                f"⚠️ CRITICAL: This code is ALREADY PROVIDED - analyze it and reference specific lines!{code_status}"
            )
        
        # Add error context with helpful framing
        if request.error_message:
            context_parts.append(
                f"❌ ERROR MESSAGE THEY'RE SEEING:\n{request.error_message}\n"
                f"Your job: Help them understand WHY this error happened and HOW to fix it."
            )
        
        # Add learning context
        if request.weak_concepts:
            context_parts.append(
                f"🎯 Concepts they're still learning: {', '.join(request.weak_concepts[:5])}\n"
                f"→ Be extra clear when these concepts come up"
            )
        
        if request.strong_concepts:
            context_parts.append(
                f"💪 Concepts they've mastered: {', '.join(request.strong_concepts[:5])}\n"
                f"→ You can build on these when explaining new ideas"
            )
        
        if request.mastery_snapshot:
            sorted_mastery = sorted(
                request.mastery_snapshot.items(),
                key=lambda item: item[1],
            )
            if sorted_mastery:
                weakest = sorted_mastery[:2]  # Top 2 weakest
                strongest = sorted_mastery[-2:]  # Top 2 strongest
                
                if weakest:
                    weak_str = ', '.join(f"{concept} ({score}%)" for concept, score in weakest)
                    context_parts.append(f"📊 Weakest areas: {weak_str}")
                if strongest:
                    strong_str = ', '.join(f"{concept} ({score}%)" for concept, score in strongest)
                    context_parts.append(f"📊 Strongest areas: {strong_str}")

        if request.level:
            level_guidance = {
                1: "Complete beginner - use very simple terms",
                2: "Early learner - can handle basic concepts",
                3: "Developing - knows fundamentals, learning patterns",
                4: "Intermediate - can handle more complex logic",
                5: "Advanced - challenge them with deeper thinking"
            }
            guidance = level_guidance.get(request.level, "Adjust difficulty to their level")
            context_parts.append(f"👤 Learner level: {request.level} → {guidance}")

        if request.streak and request.streak > 1:
            context_parts.append(
                f"🔥 They're on a {request.streak}-day streak! Acknowledge their dedication!"
            )

        # Add attempt context for persistence
        if request.attempt_number > 1:
            persistence_msg = {
                2: "2nd attempt - they're trying again! 💪",
                3: "3rd attempt - show persistence! Give a clearer hint.",
                4: "4th attempt - they need more specific guidance.",
                5: "5+ attempts - be more direct, break it down into tiny steps."
            }
            key = min(request.attempt_number, 5)
            context_parts.append(f"🔄 Attempt #{request.attempt_number} → {persistence_msg.get(key, persistence_msg[5])}")
        
        return "\n\n".join(context_parts)

    def _determine_hint_type(self, request: ChatbotRequest) -> str:
        """Determine what type of hint to give based on context"""
        # If they're on their first attempt, give gentle hints
        if request.attempt_number == 1:
            return "gentle"
        
        # If they've tried many times, be more direct (but still no solutions!)
        if request.attempt_number >= 3:
            return "directional"
        
        # If they're asking about concepts, be explanatory
        if request.prompt_id and request.prompt_id.startswith("explain_"):
            return "conceptual"
        
        # Default to gentle
        return "gentle"

    def _analyze_difficulty_patterns(
        self,
        request: ChatbotRequest,
        conversation_history: List[Dict]
    ) -> DifficultyAnalysis:
        """
        Analyze what the student finds difficult based on their questions
        This helps update their learning state
        """
        difficult_concepts = set()
        easy_concepts = set()
        question_patterns = set()
        
        # Count help requests in this conversation
        help_count = len(conversation_history) // 2  # Approximate user messages
        
        # Analyze current request
        if request.prompt_id:
            if request.prompt_id.startswith("stuck_"):
                question_patterns.add("getting_stuck")
            elif request.prompt_id.startswith("error_"):
                question_patterns.add("error_confusion")
            elif request.prompt_id.startswith("understand_"):
                question_patterns.add("concept_confusion")
        
        # Add weak concepts as difficult
        if request.weak_concepts:
            difficult_concepts.update(request.weak_concepts)
        
        # Infer difficult concepts from code and errors
        if request.error_message:
            if "syntax" in request.error_message.lower():
                difficult_concepts.add("syntax")
            if "indent" in request.error_message.lower():
                difficult_concepts.add("indentation")
            if "name" in request.error_message.lower() and "defined" in request.error_message.lower():
                difficult_concepts.add("variables")
        
        # Infer from question content
        question_lower = request.question.lower()
        concept_keywords = {
            "loop": "loops",
            "for": "loops",
            "while": "loops",
            "function": "functions",
            "def": "functions",
            "if": "conditionals",
            "else": "conditionals",
            "variable": "variables",
            "list": "lists",
            "string": "strings",
            "print": "output"
        }
        
        for keyword, concept in concept_keywords.items():
            if keyword in question_lower:
                if any(word in question_lower for word in ["confused", "don't understand", "hard", "stuck"]):
                    difficult_concepts.add(concept)
        
        # Determine help frequency
        if help_count <= 1:
            help_frequency = "low"
        elif help_count <= 3:
            help_frequency = "medium"
        else:
            help_frequency = "high"
        
        return DifficultyAnalysis(
            difficult_concepts=list(difficult_concepts),
            easy_concepts=list(easy_concepts),
            question_patterns=list(question_patterns),
            help_frequency=help_frequency
        )

    def _get_encouragement(self, attempt_number: int, difficulty_analysis: DifficultyAnalysis) -> str:
        """Get appropriate encouragement based on context"""
        encouragements = {
            "low_attempts": [
                "You're doing great! Keep that curiosity going! 🌟",
                "Awesome job exploring! You're learning so much! 🎯",
                "Great thinking! You're on the right path! 🚀"
            ],
            "medium_attempts": [
                "You're working really hard and that's amazing! 💪",
                "Keep going! Every try teaches you something new! 🎓",
                "You're so close! Don't give up! 🌈"
            ],
            "high_attempts": [
                "Wow, you're super determined! That's the spirit of a real coder! 🏆",
                "You're not giving up and that's what makes you awesome! ⭐",
                "Remember: every great coder started exactly where you are! Keep pushing! 💪"
            ],
            "high_help": [
                "I'm proud of you for asking for help - that's what smart learners do! 🤓",
                "You're asking great questions! That shows you're really thinking! 🧠",
                "Keep asking questions - that's how you become a coding superstar! 🌟"
            ]
        }
        
        # Choose encouragement based on context
        if difficulty_analysis.help_frequency == "high":
            import random
            return random.choice(encouragements["high_help"])
        elif attempt_number >= 5:
            import random
            return random.choice(encouragements["high_attempts"])
        elif attempt_number >= 3:
            import random
            return random.choice(encouragements["medium_attempts"])
        else:
            import random
            return random.choice(encouragements["low_attempts"])

    def _suggest_follow_up_prompts(self, request: ChatbotRequest) -> List[PredefinedPrompt]:
        """Suggest relevant follow-up prompts based on current question"""
        suggestions = []
        
        # If they asked about being stuck, suggest error-related prompts
        if request.prompt_id and request.prompt_id.startswith("stuck_"):
            suggestions.extend([p for p in PREDEFINED_PROMPTS if p.id.startswith("error_")][:2])
        
        # If they asked about errors, suggest understanding prompts
        elif request.prompt_id and request.prompt_id.startswith("error_"):
            suggestions.extend([p for p in PREDEFINED_PROMPTS if p.id.startswith("understand_")][:2])
        
        # Always add hint and example options
        suggestions.append(next(p for p in PREDEFINED_PROMPTS if p.id == "stuck_4"))  # hint
        suggestions.append(next(p for p in PREDEFINED_PROMPTS if p.id == "ideas_1"))  # example
        
        return suggestions[:3]  # Return top 3

    async def generate_response(self, request: ChatbotRequest) -> ChatbotResponse:
        """
        Generate a kid-friendly response that helps without giving solutions
        """
        start_time = time.time()
        
        try:
            logger.info(f"[CHATBOT] Generating response for user {request.user_id}")
            
            # If no AI client, use rule-based responses
            if self.openai_client is None:
                return self._get_rule_based_response(request)
            
            # Build context message
            context = self._build_context_message(request)
            
            # Determine hint type
            hint_type = self._determine_hint_type(request)
            
            # Build conversation for OpenAI
            messages = [{"role": "system", "content": self.system_prompt}]
            
            # Add context with CODE FIRST and EMPHASIZED
            if context:
                context_message = "⚠️ IMPORTANT CONTEXT - THE STUDENT HAS ALREADY SHARED THEIR CODE WITH YOU:\n\n" + context
                messages.append({
                    "role": "system",
                    "content": context_message
                })
            
            # Add hint type instruction
            hint_instructions = {
                "gentle": "Give a VERY gentle hint - just point them in the right direction without telling them what to do.",
                "directional": "They've tried a few times - give a clearer hint that guides them more specifically, but still don't give the solution.",
                "conceptual": "They want to understand the concept - explain it in a fun, simple way with real-world examples kids can relate to."
            }
            messages.append({
                "role": "system",
                "content": f"HINT TYPE: {hint_instructions[hint_type]}"
            })
            
            # Add conversation history
            for msg in request.conversation_history:  # Use all messages, not just last 5
                messages.append({
                    "role": msg.role,
                    "content": msg.content
                })
            
            # Build the user message - keep question clean, code is already in context
            user_message = request.question
            
            # DO NOT embed code in the question anymore - it's already in the context system message
            # The code with line numbers is in the context message above for AI to analyze
            
            # Add current question
            messages.append({
                "role": "user",
                "content": user_message
            })
            
            # Call OpenAI/OpenRouter
            ai_start = time.time()
            response = self.openai_client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.8,  # A bit creative for personality
                max_tokens=300  # Keep responses concise for kids
            )
            ai_response_time = (time.time() - ai_start) * 1000  # milliseconds
            
            response_text = response.choices[0].message.content.strip()
            
            # 📊 LOG CHATBOT INTERACTION EVENT
            event_logger.log_chatbot_interaction(
                model_name=self.model or "rule-based",
                user_id=request.user_id,
                mission_id=request.mission_id or "unknown",
                user_message=request.question,
                ai_response=response_text,
                response_time_ms=ai_response_time,
                context_used=bool(context)
            )
            
            # Extract emoji from response (if any)
            emoji_match = re.search(r'[😀-🙏🌀-🗿🚀-🛿☀-⛿✀-➿]', response_text)
            emoji = emoji_match.group() if emoji_match else "🤖"
            
            # Analyze difficulty patterns
            difficulty_analysis = self._analyze_difficulty_patterns(
                request,
                request.conversation_history
            )
            
            # Generate next steps based on hint type
            next_steps = self._generate_next_steps(request, hint_type)
            
            # Get related concepts
            related_concepts = self._extract_related_concepts(request, response_text)
            
            # Get encouragement
            encouragement = self._get_encouragement(
                request.attempt_number,
                difficulty_analysis
            )
            
            # Get follow-up prompts
            suggested_prompts = self._suggest_follow_up_prompts(request)
            
            return ChatbotResponse(
                success=True,
                response=response_text,
                emoji=emoji,
                hint_type=hint_type,
                next_steps=next_steps,
                related_concepts=related_concepts,
                encouragement=encouragement,
                difficulty_analysis=difficulty_analysis,
                suggested_prompts=suggested_prompts
            )
            
        except Exception as e:
            logger.error(f"[CHATBOT] Error generating response: {e}")
            
            # 📊 LOG MODEL ERROR
            event_logger.log_model_error(
                model_name=self.model or "rule-based",
                user_id=request.user_id,
                mission_id=request.mission_id or "unknown",
                error_type="chatbot_generation_failed",
                error_message=str(e)
            )
            
            # Return friendly fallback response
            return ChatbotResponse(
                success=False,
                response="Oops! I'm having a little trouble right now. But don't worry - you're doing great! Try looking at your code carefully and see if you can spot anything that looks different from examples you've seen. You've got this! 💪",
                emoji="🤖",
                hint_type="gentle",
                next_steps=["Take a deep breath", "Look at your code line by line", "Check for spelling mistakes"],
                related_concepts=[],
                encouragement="Remember: every coder faces challenges! You're learning! 🌟",
                suggested_prompts=[]
            )

    def _generate_next_steps(self, request: ChatbotRequest, hint_type: str) -> List[str]:
        """Generate actionable next steps"""
        steps = []
        if request.error_message:
            steps.append("Check the line where the error appeared")
            steps.append("Look for missing punctuation (like : or ,)")
            steps.append("Make sure your spacing looks right")
        elif request.code:
            steps.append("Try running your code to see what happens")
            steps.append("Test one small part at a time")
            steps.append("Add a print() to see what your code is doing")
        # Remove default fallback steps
        return steps[:3]

    def _extract_related_concepts(self, request: ChatbotRequest, response: str) -> List[str]:
        """Extract related programming concepts from the context"""
        concepts = set()
        
        # Check request context
        if request.weak_concepts:
            concepts.update(request.weak_concepts)
        
        # Extract from code
        if request.code:
            code_lower = request.code.lower()
            if "def " in code_lower:
                concepts.add("functions")
            if "for " in code_lower or "while " in code_lower:
                concepts.add("loops")
            if "if " in code_lower:
                concepts.add("conditionals")
            if "print" in code_lower:
                concepts.add("output")
            if "[" in request.code or "list" in code_lower:
                concepts.add("lists")
        
        return list(concepts)[:3]

    def create_conversation_summary(
        self,
        request: ChatbotRequest,
        responses: List[ChatbotResponse]
    ) -> ConversationSummary:
        """
        Create a summary of the conversation for learning state updates
        """
        # Aggregate difficulty analysis from all responses
        all_difficult_concepts = set()
        all_easy_concepts = set()
        
        for response in responses:
            if response.difficulty_analysis:
                all_difficult_concepts.update(response.difficulty_analysis.difficult_concepts)
                all_easy_concepts.update(response.difficulty_analysis.easy_concepts)
        
        # Determine help frequency
        total_questions = len(responses)
        if total_questions <= 2:
            help_frequency = "low"
        elif total_questions <= 5:
            help_frequency = "medium"
        else:
            help_frequency = "high"
        
        # Determine conversation quality
        if total_questions >= 5 and len(all_difficult_concepts) >= 3:
            quality = "struggling"
        elif total_questions <= 2:
            quality = "exploring"
        else:
            quality = "productive"
        
        # Extract key issues
        key_issues = []
        if request.error_message:
            key_issues.append("encountering_errors")
        if request.attempt_number >= 3:
            key_issues.append("multiple_attempts")
        if any(p.startswith("stuck_") for r in responses for p in [request.prompt_id] if p):
            key_issues.append("getting_stuck")
        
        return ConversationSummary(
            user_id=request.user_id,
            mission_id=request.mission_id,
            submission_id=request.submission_id,
            total_questions=total_questions,
            difficult_concepts=list(all_difficult_concepts),
            easy_concepts=list(all_easy_concepts),
            help_frequency=help_frequency,
            conversation_quality=quality,
            key_issues=key_issues
        )

    def _get_rule_based_response(self, request: ChatbotRequest) -> ChatbotResponse:
        """
        Provide friendly fallback responses when AI service is unavailable.
        Uses the full conversation history for context.
        """
        logger.info(f"Using rule-based response for prompt: {request.prompt_id}")

        # Build a simple context from conversation history
        history_context = ""
        if request.conversation_history:
            history_context = "\n".join([
                f"{msg.role}: {msg.content}" for msg in request.conversation_history
            ])

        # Predefined responses for the 6 quick prompts
        rule_based_responses = {
            "stuck": {
                "message": f"🤔 Being stuck is totally normal! Let's break this down together. {history_context} Try looking at each block one by one. What does each piece do? Sometimes reading your code out loud helps too!",
                "suggestions": [
                    "Check if all your blocks are connected properly",
                    "Make sure you're using the right type of blocks",
                    "Try testing just one small part at a time"
                ]
            },
            "explain_concept": {
                "message": "📚 Great question! I love explaining things! Which concept are you curious about? Variables help you remember things, loops help you repeat actions, and conditions help you make choices. Think of them like superpowers for your code!",
                "suggestions": [
                    "Try the examples in the mission description",
                    "Experiment with changing one thing at a time",
                    "Ask yourself: what do I want to happen?"
                ]
            },
            "check_code": {
                "message": "🔍 Let me look at your code! I see you're working hard. Remember: good code is like a good story - each block should make sense and connect to the next one. Are all your blocks in the right order?",
                "suggestions": [
                    "Read through your code step by step",
                    "Check if blocks are in a logical sequence",
                    "Make sure variable names make sense"
                ]
            },
            "hint": {
                "message": "💡 Here's a hint without giving it away! Think about what you want to happen first, then second, then third. Coding is like giving instructions to a friend - be clear and specific!",
                "suggestions": [
                    "What's the first step you need?",
                    "What comes after that?",
                    "How do you know when to stop?"
                ]
            },
            "error_help": {
                "message": "🐛 Errors are just the computer's way of asking for help! Let's figure this out together. Most errors happen because something is in the wrong place or spelled differently than expected. Can you spot anything unusual?",
                "suggestions": [
                    "Check the error message - it's trying to help!",
                    "Look at where the error points to",
                    "Compare with working examples"
                ]
            },
            "encourage": {
                "message": "⭐ You're doing AMAZING! Every coder starts somewhere, and you're already learning so much. Keep going! Every mistake teaches you something new. I believe in you!",
                "suggestions": [
                    "Take a short break if you need to",
                    "Come back with fresh eyes",
                    "You've got this! Keep trying!"
                ]
            }
        }
        
        # Remove default next steps message
        # Only provide suggestions if relevant
        # Default response if prompt_id doesn't match
        default_response = {
            "message": f"🤖 Hi there! I'm here to help you learn coding! {history_context} I'm having trouble connecting to my brain right now, but I can still help! Ask me about your code, and let's figure it out together!",
            "suggestions": []
        }
        
        # Get the appropriate response based on prompt_id
        response_data = rule_based_responses.get(
            request.prompt_id or "",
            default_response
        )
        
        # Create a friendly response
        return ChatbotResponse(
            message=response_data["message"],
            suggestions=response_data["suggestions"],
            difficulty_analysis=None,  # Not available in rule-based mode
            conversation_summary=None,  # Not available in rule-based mode
            prompt_id=request.prompt_id,
            metadata={
                "mode": "rule_based",
                "reason": "AI service temporarily unavailable",
                "timestamp": "now"
            }
        )


# Global chatbot instance
chatbot = KidFriendlyChatbot()
