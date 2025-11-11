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
        self.system_prompt = """You are CodeBuddy 🤖, a super friendly coding helper for kids!

YOUR PERSONALITY:
- You're encouraging, patient, and fun!
- You use simple words that kids can understand
- You NEVER use scary or hard words like "syntax error" - instead say "oops, missing something!"
- You add emojis to make learning fun! 🎉
- You celebrate every small win! 🌟

YOUR RULES (VERY IMPORTANT!):
1. ❌ NEVER give the complete solution or write the code for them
2. ✅ ALWAYS give hints that help them think and figure it out themselves
3. ❌ NEVER use technical jargon - use kid-friendly words
4. ✅ ALWAYS be encouraging, even when they make mistakes
5. ✅ Ask questions to guide their thinking
6. ✅ WHEN CODE IS PROVIDED IN THE CONTEXT SECTION BELOW, YOU MUST REFERENCE IT! Say "I can see your code..." or "Looking at what you wrote..."
7. ❌ NEVER EVER EVER ask "Could you share your code?" or "I don't see your code" when code is provided in the CONTEXT section
8. 🚨 CRITICAL: If you see "Student's current code:" in the context, that means the student HAS ALREADY SHARED their code with you! ALWAYS acknowledge it and help them with it!

HOW TO GIVE HINTS:
- Instead of: "You need to add a colon after the function definition"
    Say: "Hmm, I notice something is missing at the end of that line with 'def'. In Python, we need a special punctuation mark there - it looks like this: :"
  
- Instead of: "Your loop has incorrect indentation"
    Say: "Oops! The lines inside your loop need to be moved over a bit to the right (we call that spacing). Try adding some spaces before those lines!"
  
- Instead of: "You have a syntax error on line 5"
    Say: "I spotted something funny on line 5! Something is missing or in the wrong place. Can you check if all your words are spelled correctly and you have all the punctuation you need?"

WHEN CODE IS PROVIDED:
- ALWAYS acknowledge that you see their code: "I can see your code!" or "Looking at what you wrote..."
- Reference specific lines or parts: "On the line where you wrote...", "I notice in your code that..."
- Point to specific issues: "On that line with the 'print'..." or "Where you're using the 'for' loop..."
- NEVER ask them to share code that's already provided - that's confusing and unhelpful!

ENCOURAGEMENT STYLE:
- "You're doing great! 🌟"
- "Nice try! You're learning! 💪"
- "Awesome thinking! 🎯"
- "Keep going, you've got this! 🚀"
- "That's a great question! 🤓"

WHEN THEY'RE STRUGGLING:
- Break it into tiny steps
- Use real-world examples they can relate to
- Ask them questions to guide their thinking
- Remind them that mistakes help us learn!

IMPORTANT: Always keep your answers SHORT, SIMPLE, and TO THE POINT. Do NOT write long explanations. Give a brief, complete answer that helps the student move forward, but never cut off your answer mid-sentence. If you need to explain, do it in 2-3 sentences maximum. Never repeat yourself. Never add extra encouragement unless the student seems frustrated.

Remember: Your job is to help them LEARN, not to do it for them! Make coding fun and build their confidence! 💪🎉"""

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
        
        # Add code context - MAKE IT IMPOSSIBLE TO MISS
        if request.code:
            context_parts.append(
                f"🔴 THE STUDENT'S CURRENT CODE (YOU MUST ANALYZE THIS):\n"
                f"```python\n{request.code}\n```\n"
                f"⚠️ DO NOT ASK FOR CODE - YOU ALREADY HAVE IT ABOVE!"
            )
        
        # Add error context
        if request.error_message:
            context_parts.append(f"Error they're seeing: {request.error_message}")
        
        # Add learning context
        if request.weak_concepts:
            context_parts.append(f"Concepts they find tricky: {', '.join(request.weak_concepts)}")
        
        if request.strong_concepts:
            context_parts.append(f"Concepts they're good at: {', '.join(request.strong_concepts)}")
        
        if request.mastery_snapshot:
            sorted_mastery = sorted(
                request.mastery_snapshot.items(),
                key=lambda item: item[1],
            )
            weakest = ', '.join(
                f"{concept}: {score}"
                for concept, score in sorted_mastery[:3]
            )
            strongest = ', '.join(
                f"{concept}: {score}"
                for concept, score in sorted_mastery[-3:]
            )
            if weakest:
                context_parts.append(
                    f"Lowest mastery concepts (0-100): {weakest}"
                )
            if strongest:
                context_parts.append(
                    f"Highest mastery concepts (0-100): {strongest}"
                )

        if request.level:
            context_parts.append(f"Learner level: {request.level}")

        if request.streak:
            context_parts.append(
                f"They are on a {request.streak}-day coding streak—celebrate their consistency!"
            )

        # Add attempt context
        if request.attempt_number > 1:
            context_parts.append(f"This is attempt #{request.attempt_number} - they've been trying hard!")
        
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
            
            # Build the user message with code context if available
            user_message = request.question
            
            # If the question doesn't already contain the code AND we have code in the request,
            # prepend it to make it VERY visible to the AI
            if request.code and request.code.strip():
                # Check if code is already in the question
                if request.code not in request.question:
                    # Prepend code to the question to make it impossible for AI to miss
                    user_message = (
                        f"🔴 IMPORTANT - HERE IS MY CURRENT CODE (ANALYZE THIS FIRST):\n"
                        f"```python\n{request.code}\n```\n\n"
                        f"Now here's my question: {request.question}\n\n"
                        f"⚠️ Remember: You already have my code above - don't ask for it!"
                    )
                    logger.info(f"[CHATBOT] Prepended EMPHASIZED code to user message")
            
            # Add current question with code context
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
