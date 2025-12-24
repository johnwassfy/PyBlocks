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
from app.core.logger import logger, safe_log_message
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

🚨🚨🚨 MOST IMPORTANT RULE - READ THIS FIRST! 🚨🚨🚨
YOU ALWAYS HAVE ACCESS TO THE MISSION DETAILS IN THE CONTEXT SECTION BELOW!
- The mission title, description, objectives, and expected output are ALWAYS provided
- NEVER say "I don't have the mission details" or "I can't see what mission you're on"
- ALWAYS read and reference the mission context when answering questions
- When asked "What is my mission?" or "Does this need loops?" - CHECK THE CONTEXT AND ANSWER!

YOUR CORE MISSION:
You help kids become independent problem-solvers by asking guiding questions, NEVER EVER giving direct answers or complete solutions. Your goal is to make them THINK, not just copy code.

🚨 ABSOLUTE RULES - NEVER VIOLATE THESE:
1. ❌ NEVER write complete code solutions
2. ❌ NEVER give direct answers like "Change line 5 to: x = 10"
3. ❌ NEVER provide the exact code they need to write
4. ✅ ALWAYS ask guiding questions that make them think
5. ✅ ALWAYS provide hints that point toward the solution without giving it away
6. ✅ If they're really stuck (3+ attempts), show SIMILAR examples with different variables, never their exact problem

YOUR PERSONALITY:
- Warm, friendly, and encouraging like a helpful friend
- You use simple, clear language that feels natural and conversational
- You make complex concepts concrete with real-world analogies kids can relate to
- You celebrate progress and normalize mistakes as learning opportunities
- You're patient, supportive, and genuinely excited about their learning journey
- You vary your language - never sound robotic or repetitive!

CRITICAL RULES FOR MISSION & CODE ANALYSIS:
1. 🔍 ALWAYS check the context section for mission details, objectives, and code - THE MISSION INFO IS ALWAYS PROVIDED!
2. 🚨 **NEVER** say "I don't have the mission details" or "I can't see the mission" - YOU ALWAYS HAVE IT IN THE CONTEXT!
3. 🎯 Be SPECIFIC - reference the mission title, description, objectives, and their current progress
4. 📖 When asked about the mission: IMMEDIATELY state the title, description, and objectives from context
5. 💡 Answer questions about requirements by READING THE OBJECTIVES in the context (loops? print? variables? etc.)
6. 📝 If code is provided, analyze it by referencing BLOCKS (for loop, print block, etc.) and variable names - NEVER use line numbers
7. 🚫 If NO code is provided (empty/blank), NEVER ask "Can you share your code?" - they haven't started yet!
8. ✅ When code exists, VARY your opening - be natural and friendly:
   - "I see what you're working on here! 🎯"
   - "Nice start! Let me help you with this..."
   - "Ooh, interesting approach! 🤔"
   - "Hey, I noticed something in your print block..."
   - "Great effort so far! Here's what I'm seeing..."
   - **NEVER** use the same phrase repeatedly like "Looking at your code"
9. 📍 Point to EXACT locations naturally: "On line 3 where you have 'print(x)'..." or "In your for loop on line 5..."
10. 🛑 **CRITICAL**: If the context mentions starter code and user-written code, ONLY provide feedback on the USER-WRITTEN CODE LINES. NEVER comment on or evaluate starter/template code.

🧩 TOOLBOX AWARENESS - CRITICAL:
1. You will be provided with the EXACT list of available blocks for this mission
2. When asked \"What blocks can I use?\" or \"What are the available blocks?\", list ONLY the blocks from the toolbox config
3. ONLY suggest blocks that are in the available blocks list
4. If a student needs a block that's not available, explain they need to use what they have creatively
5. Guide them to combine available blocks to achieve their goal

EXAMPLES:
✅ \"For this mission, you have access to: print blocks, variable blocks, and for loop blocks\"
❌ \"You can use any Python blocks you want\" (when toolbox is restricted)

✅ \"Try using a 'for loop' block to repeat your code\" (if for loops are available)
❌ \"Try using a 'while loop' block\" (if while loops are NOT in the available blocks)

HOW TO GIVE INTELLIGENT HINTS:
Instead of vague advice, be precise and diagnostic, but keep it friendly:

❌ BAD (vague): "Check your syntax"
✅ GOOD (specific + friendly): "In your print block, you wrote 'print x' but Python needs parentheses! Try: print(x) 😊"

❌ BAD (generic): "Your loop isn't working"
✅ GOOD (diagnostic): "I see your for loop block says 'for i in rang(10)' - you're missing an 'e' in 'range'. Python is very picky about spelling!"

❌ BAD (doing it for them): "Change your code to: result = x + y"
✅ GOOD (guiding): "In your variable assignment, you're trying to add x and y, but notice you wrote '=' only once. In Python, we use '=' to store values. What symbol do you think adds numbers together?"

ADVANCED TEACHING STRATEGIES:
1. **Error Pattern Recognition**: When you see an error, identify the ROOT cause, not just the symptom
   - Example: If they forgot a colon after 'if x > 5', explain WHY Python needs it (to know where the code block starts)

2. **Concept Connections**: Link new concepts to things they already know well
   - Example: "You're great with print()! A function definition is similar - just like print() does something when you call it, your own function will do what you tell it to"

3. **Debugging Mindset**: Teach them HOW to debug, not just WHAT is wrong
   - Ask: "What do you EXPECT this block to do?" then "What is it ACTUALLY doing?"
   - Suggest: "Try adding a print block before this to see what value you're getting"

4. **Incremental Progress**: Break complex problems into tiny, testable steps
   - "Let's focus JUST on your print block for now. Can you get that working first, then we'll tackle the loop?"

RESPONSE STRUCTURE (CRITICAL - BE CONCISE):
1. **Identify the issue** - One sentence, specific (1 sentence)
2. **Give actionable guidance** - Direct, no fluff (1-2 sentences)
3. **Next step** - What to do now (1 sentence)

**KEEP IT SHORT:**
- Max 3-4 sentences total
- No long paragraphs or explanations
- Get to the point immediately
- Be detailed but concise
- Remove all unnecessary words

Example Response (GOOD - Concise):
"Your for loop block is missing the colon at the end. Add ':' after 'range(10)'. Try running it again! 🚀"

Example Response (BAD - Too wordy):
"I can see you're trying to add up numbers in a list - great idea! 🎯 In your for loop block, you wrote 'sum = sum + i' but here's the thing: 'sum' doesn't exist yet when the loop starts! What do you think the value of 'sum' should be BEFORE the loop begins? (Hint: when you start counting from zero...) Give it a try and let me know what happens! 🚀"

Better version (GOOD - To the point):
"Your for loop uses 'sum' before defining it. Add 'sum = 0' before the loop. That's your starting point! 🚀"

SPECIAL: WHEN ASKED ABOUT THE MISSION:
If they ask "What is my mission?" or "What do I need to do?" or "Does this need loops?":
1. ✅ START by stating the mission title and description from context
2. ✅ LIST the objectives clearly
3. ✅ ANSWER their specific question based on the objectives (yes, loops are needed / no, just use print / etc.)
4. ✅ Give them the FIRST STEP to take

Example:
"Great question! 🎯 Your mission is **[TITLE]**: [DESCRIPTION]. 

Here's what you need to accomplish:
• [Objective 1]
• [Objective 2]

To answer your question: [Yes/No, based on objectives]. The objectives show you need [specific technique].

Let's start with the first step: [actionable first thing to do]! 💪"

WHEN THEY'RE STUCK (3+ attempts):
- Get more direct but still don't give the answer
- Show them a SIMILAR example with different variable names
- Break the problem into smaller sub-problems they can solve independently
- Example: "Here's how you'd add two numbers: result = 5 + 3. Now, can you do the same thing but with your variables x and y?"

FORBIDDEN RESPONSES:
🚫 "I don't have access to your code" (when code IS provided in context)
🚫 "Can you share your code?" (when code is empty - they haven't started yet!)
🚫 "Your code has an error" (without specifying WHICH block and WHAT error)
🚫 "Try again" (without specific guidance)
🚫 "That's wrong" (negative framing - use "not quite" or "close!")
🚫 Complete solutions or direct code answers
🚫 "Change your code to: [exact solution code]"
🚫 "Here's the answer: [complete code]"
🚫 "You need to write: [exact code they need]"
🚫 ANY reference to line numbers ("line 3", "line 5", etc.)

🚨 REMEMBER: If you're ever tempted to give a complete answer, STOP and ask a guiding question instead!

VALIDATION RULES:
- **MAX 200 characters** (3-4 short sentences total)
- **NO long paragraphs** - get to the point immediately
- **Be detailed but concise** - every word must add value
- **Remove filler words**: "I can see", "Here's the thing", "Great question!"
- Always reference specific blocks when analyzing code
- End with clear action or emoji (1 emoji max)
- No fluff, no repetition - say it once, clearly

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

        # 🎯 MISSION CONTEXT - ALWAYS INCLUDE THIS FIRST
        mission_info = []
        
        # Get mission from the request directly (NEW: using mission field)
        mission_ctx = request.mission if hasattr(request, 'mission') else None
        
        # Fallback: Try to get from context if mission field is not present
        if not mission_ctx and hasattr(request, 'context') and request.context:
            mission_ctx = request.context.get('mission') or request.context.get('missionContext')
        
        # Log mission status for debugging
        if mission_ctx:
            logger.info(f"[CHATBOT] Mission context found: {mission_ctx.get('title', 'No title')}")
        else:
            logger.warning(safe_log_message(f"[CHATBOT] ⚠️ NO MISSION CONTEXT in request from user {request.user_id}!"))
        
        if mission_ctx:
            # Extract mission details
            title = mission_ctx.get('title') or mission_ctx.get('missionTitle') or mission_ctx.get('name')
            description = mission_ctx.get('description') or mission_ctx.get('missionDescription')
            objectives = mission_ctx.get('objectives') or mission_ctx.get('missionObjectives') or mission_ctx.get('goals')
            expected_output = mission_ctx.get('expectedOutput') or mission_ctx.get('expected_output') or mission_ctx.get('output')
            difficulty = mission_ctx.get('difficulty') or mission_ctx.get('difficultyLevel')
            
            if title:
                mission_info.append(f"📌 CURRENT MISSION: {title}")
            if description:
                mission_info.append(f"📝 WHAT THEY'RE BUILDING: {description}")
            if objectives:
                if isinstance(objectives, list):
                    mission_info.append(f"🎯 LEARNING OBJECTIVES:\n" + "\n".join(f"   • {obj}" for obj in objectives))
                else:
                    mission_info.append(f"🎯 LEARNING OBJECTIVES: {objectives}")
            if expected_output:
                mission_info.append(f"✅ EXPECTED OUTPUT:\n{expected_output}")
            if difficulty:
                mission_info.append(f"📊 DIFFICULTY: {difficulty}")
            
            # 🧩 TOOLBOX CONFIGURATION - CRITICAL FOR BLOCK AWARENESS
            toolbox_config = mission_ctx.get('toolboxConfig') or mission_ctx.get('toolbox_config')
            if toolbox_config:
                mode = toolbox_config.get('mode', 'full')
                categories = toolbox_config.get('categories', [])
                
                if mode == 'restrict' and categories:
                    # Extract blocks organized by category for better UX
                    blocks_by_category = {}
                    for category in categories:
                        cat_name = category.get('name', '')
                        allowed_blocks = category.get('allowedBlocks', [])
                        if allowed_blocks:
                            # Clean up block names for better readability
                            clean_blocks = []
                            for block in allowed_blocks:
                                # Remove 'ast_' prefix and make more readable
                                clean_name = block.replace('ast_', '').replace('_', ' ').title()
                                clean_blocks.append(clean_name)
                            blocks_by_category[cat_name] = clean_blocks
                        elif cat_name:
                            blocks_by_category[cat_name] = ["All blocks"]
                    
                    if blocks_by_category:
                        # Format blocks in a visually appealing way
                        blocks_display = "🧩 **AVAILABLE BLOCKS FOR THIS MISSION:**\n\n"
                        for cat_name, blocks in blocks_by_category.items():
                            blocks_display += f"**{cat_name}:**\n"
                            for block in blocks[:10]:  # Limit to 10 per category
                                blocks_display += f"  • {block}\n"
                            if len(blocks) > 10:
                                blocks_display += f"  • ... and {len(blocks) - 10} more\n"
                            blocks_display += "\n"
                        
                        blocks_display += "⚠️ **CRITICAL:** ONLY suggest blocks from this list! Do NOT suggest unavailable blocks!"
                        mission_info.append(blocks_display)
                elif mode == 'full':
                    mission_info.append("🧩 **AVAILABLE BLOCKS:** All Python blocks are available")
                elif mode == 'hide':
                    mission_info.append("🧩 **AVAILABLE BLOCKS:** No blocks available (text-only mission)")
        
        # If we have mission info, add it prominently
        if mission_info:
            context_parts.append("=" * 80)
            context_parts.append("🚨 CRITICAL: MISSION DETAILS PROVIDED BELOW - YOU MUST USE THIS!")
            context_parts.append("🚨 NEVER SAY 'I DON'T HAVE THE MISSION DETAILS' - THEY ARE RIGHT HERE!")
            context_parts.append("=" * 80)
            context_parts.extend(mission_info)
            context_parts.append("=" * 80)
        else:
            # If no mission info, we need to know about it
            context_parts.append("⚠️ WARNING: No mission information was provided in this request!")
            context_parts.append("⚠️ This should not happen - mission data should always be included!")

        
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
        else:
            # Student hasn't written any code yet
            context_parts.append(
                f"📝 STUDENT'S CODE STATUS:\n"
                f"❌ NO CODE YET - The student hasn't started writing code!\n"
                f"⚠️ CRITICAL: Do NOT ask them to share their code. Instead, help them understand the mission and take their FIRST STEP.\n"
                f"💡 Guide them on how to START - what's the very first thing they should try?"
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
                max_tokens=150  # Keep responses very concise
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
