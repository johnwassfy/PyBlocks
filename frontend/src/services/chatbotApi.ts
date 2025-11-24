/**
 * Chatbot API Service
 * Connects the kid-friendly chatbot to the AI service
 */

const AI_SERVICE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://localhost:8000';
const API_KEY = process.env.NEXT_PUBLIC_AI_API_KEY || 'dev-key-12345';

export interface ChatMessage {
  text: string;
  isUser: boolean;
  timestamp?: Date;
}

export interface ChatRequest {
  userId?: string;
  missionId?: string;
  question: string;
  promptId?: string;
  code?: string;
  weakConcepts?: string[];
  strongConcepts?: string[];
  attemptNumber?: number;
  submissionId?: string;
  conversationHistory?: ChatMessage[];
  masterySnapshot?: Record<string, number> | null;
  streak?: number;
  level?: number;
  context?: any; // NEW: Allow passing additional context (e.g., from proactive hints)
}

export interface ChatResponse {
  success: boolean;
  response: string;
  emoji?: string;
  hintType?: string;
  nextSteps?: string[];
  encouragement?: string;
  difficultyAnalysis?: {
    difficultConcepts: string[];
    easyConcepts: string[];
    questionPatterns: string[];
    helpFrequency: string;
  };
}

export interface PredefinedPrompt {
  id: string;
  category: string;
  text: string;
  kidFriendlyText: string;
}

export interface PromptsResponse {
  prompts: {
    [category: string]: PredefinedPrompt[];
  };
}

/**
 * Send a chat message to the AI service
 */
export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  try {
    console.log('[ChatAPI] Sending request to:', `${AI_SERVICE_URL}/api/v1/chat`);
    console.log('[ChatAPI] Request payload:', request);
    
    const response = await fetch(`${AI_SERVICE_URL}/api/v1/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify({
        userId: request.userId || 'anonymous',
        missionId: request.missionId || 'free-play',
        mission: request.context?.mission, // NEW: Extract mission from context and send directly
        question: request.question,
        promptId: request.promptId,
        code: request.code || '',
        weakConcepts: request.weakConcepts || [],
        strongConcepts: request.strongConcepts || [],
        attemptNumber: request.attemptNumber || 1,
        submissionId: request.submissionId,
        conversationHistory: request.conversationHistory || [],
        masterySnapshot: request.masterySnapshot || undefined,
        streak: request.streak,
        level: request.level,
        context: request.context, // Keep context for backward compatibility
      }),
    });

    console.log('[ChatAPI] Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[ChatAPI] Error response:', errorData);
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('[ChatAPI] Response data:', data);
    
    return {
      success: data.success || true,
      response: data.response || data.message || 'Got it! Let me think... 🤔',
      emoji: data.emoji || '🤖',
      hintType: data.hint_type || 'gentle',
      nextSteps: data.next_steps || [],
      encouragement: data.encouragement || "You're doing great! Keep going! 🌟",
      difficultyAnalysis: data.difficulty_analysis ? {
        difficultConcepts: data.difficulty_analysis.difficult_concepts || [],
        easyConcepts: data.difficulty_analysis.easy_concepts || [],
        questionPatterns: data.difficulty_analysis.question_patterns || [],
        helpFrequency: data.difficulty_analysis.help_frequency || 'low',
      } : undefined,
    };
  } catch (error) {
    console.error('[ChatAPI] Error sending message:', error);
    // Return fallback response
    return {
      success: false,
      response: "Oops! I'm having trouble connecting right now. But I'm here to help! Try asking again in a moment. 😊",
      emoji: '😅',
      hintType: 'gentle',
      nextSteps: [], // No default next steps
      encouragement: "Don't worry, you're doing great! 💪",
    };
  }
}

/**
 * Get predefined prompts from the AI service
 */
export async function getPredefinedPrompts(): Promise<PromptsResponse> {
  try {
    const response = await fetch(`${AI_SERVICE_URL}/api/v1/chat/prompts`, {
      method: 'GET',
      headers: {
        'X-API-Key': API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[ChatAPI] Error fetching prompts:', error);
    
    // Return default prompts as fallback
    return {
      prompts: {
        stuck: [
          {
            id: 'stuck_1',
            category: 'stuck',
            text: "I don't know how to start",
            kidFriendlyText: "😕 I'm not sure how to begin!",
          },
          {
            id: 'stuck_2',
            category: 'stuck',
            text: "What should I do next?",
            kidFriendlyText: "🤔 What should I do next?",
          },
        ],
        error: [
          {
            id: 'error_1',
            category: 'error',
            text: "Why isn't my code working?",
            kidFriendlyText: "🐛 Why doesn't this work?",
          },
        ],
        understanding: [
          {
            id: 'understand_1',
            category: 'understanding',
            text: "What does this code do?",
            kidFriendlyText: "🤓 What does this part do?",
          },
        ],
      },
    };
  }
}

/**
 * Check if AI service is available
 */
export async function checkAIServiceHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${AI_SERVICE_URL}/health`, {
      method: 'GET',
    });
    return response.ok;
  } catch (error) {
    console.error('[ChatAPI] AI service health check failed:', error);
    return false;
  }
}
