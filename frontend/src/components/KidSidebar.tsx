'use client';

import { useState, useEffect, useRef } from 'react';
import { sendChatMessage, getPredefinedPrompts, type ChatRequest } from '../services/chatbotApi';
import { useWorkspace } from '../context/WorkspaceContext';
import '../styles/kid-sidebar.css';

export default function KidSidebar() {
  const { mission, user, profile, insights } = useWorkspace();

  return (
    <div className="kid-sidebar">
      {/* Mission Description Section - Now takes full space */}
      <div className="mission-section-full">
        <div className="mission-header">
          <span className="mission-icon">🎯</span>
          <h2 className="mission-title">
            {mission?.title || 'Your Mission'}
          </h2>
        </div>
        <div className="mission-content">
          <p className="mission-text">
            {mission?.description || "🌟 Welcome, Code Explorer! 🌟"}
          </p>
          {mission?.objectives && mission.objectives.length > 0 && (
            <div className="mission-objectives">
              <strong className="objectives-title">🎯 What You'll Learn:</strong>
              <ul className="objectives-list">
                {mission.objectives.map((obj, i) => (
                  <li key={i} className="objective-item">
                    <span className="objective-bullet">✨</span>
                    {obj}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {mission?.expectedOutput && (
            <div className="mission-expected-output">
              <strong className="output-title">🎬 Expected Output:</strong>
              <pre className="output-code">{mission.expectedOutput}</pre>
            </div>
          )}
          {mission?.estimatedTime && (
            <div className="mission-time">
              <span className="time-icon">⏱️</span>
              <strong>Estimated Time:</strong> {mission.estimatedTime} minutes
            </div>
          )}
          {mission?.xpReward && (
            <div className="mission-reward">
              <span className="xp-icon">⭐</span>
              <strong>Reward:</strong> {mission.xpReward} XP
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Export the chatbot state and handlers for use in BlocklyWorkspace
export function useChatbot() {
  const { mission, user, profile, insights } = useWorkspace();
  const [messages, setMessages] = useState<Array<{text: string, isUser: boolean}>>([
    { text: "Hi there! 👋 I'm here to help you learn Python! Pick a question below or type your own!", isUser: false }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [currentCode, setCurrentCode] = useState('');
  const [proactiveContext, setProactiveContext] = useState<any>(null); // NEW: Store proactive context
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for code changes from BlockPy editor
  useEffect(() => {
    const handleCodeChange = (event: CustomEvent) => {
      if (event.detail && event.detail.code) {
        setCurrentCode(event.detail.code);
      }
    };

    window.addEventListener('blockpy-code-change' as any, handleCodeChange);
    return () => {
      window.removeEventListener('blockpy-code-change' as any, handleCodeChange);
    };
  }, []);

  const quickPrompts = [
    { icon: "🤔", text: "What does this block do?", emoji: "🧩" },
    { icon: "💡", text: "Give me a hint!", emoji: "✨" },
    { icon: "❓", text: "How do I use loops?", emoji: "🔄" },
    { icon: "🎯", text: "Show me an example!", emoji: "📝" },
    { icon: "🐛", text: "Help! I have a bug!", emoji: "🔍" },
    { icon: "🎉", text: "What can I do next?", emoji: "🚀" }
  ];

  const handlePromptClick = async (promptText: string) => {
    setMessages(prev => [...prev, { text: promptText, isUser: true }]);
    setIsTyping(true);

    try {
      const conversationHistory = [
        ...messages.map(m => ({
          role: m.isUser ? 'user' : 'assistant',
          content: m.text
        })),
        { role: 'user', content: promptText }
      ];
      
      const request: ChatRequest = {
        userId: user?.username || 'anonymous',
        missionId: mission?._id || 'free-play',
        question: promptText,
        promptId: undefined,
        code: currentCode,
        weakConcepts: insights?.weakConcepts || profile?.weakSkills || [],
        strongConcepts: insights?.strongConcepts || profile?.strongSkills || [],
        attemptNumber: 1,
        submissionId: undefined,
        conversationHistory: conversationHistory as any[],
        masterySnapshot: insights?.mastery,
        streak: insights?.gamification.streak,
        level: insights?.gamification.level,
      };

      const response = await sendChatMessage(request);
      console.log('[Chatbot] Response received:', response);
      setMessages(prev => [...prev, { text: response.response, isUser: false }]);
      
      if (response.difficultyAnalysis) {
        console.log('Difficulty Analysis:', response.difficultyAnalysis);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        text: "Oops! I'm having a little trouble. But don't worry! You're doing great! Keep trying! 💪✨", 
        isUser: false 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    const userMessage = inputValue.trim();
    setMessages(prev => [...prev, { text: userMessage, isUser: true }]);
    setInputValue('');
    setIsTyping(true);

    try {
      const conversationHistory = [
        ...messages.map(m => ({
          role: m.isUser ? 'user' : 'assistant',
          content: m.text
        })),
        { role: 'user', content: userMessage }
      ];
      
      const request: ChatRequest = {
        userId: user?.username || 'anonymous',
        missionId: mission?._id || 'free-play',
        question: userMessage,
        promptId: undefined,
        code: currentCode,
        weakConcepts: insights?.weakConcepts || profile?.weakSkills || [],
        strongConcepts: insights?.strongConcepts || profile?.strongSkills || [],
        attemptNumber: 1,
        submissionId: undefined,
        conversationHistory: conversationHistory as any[],
        masterySnapshot: insights?.mastery,
        streak: insights?.gamification.streak,
        level: insights?.gamification.level,
      };

      const response = await sendChatMessage(request);
      console.log('[Chatbot] Response received:', response);
      setMessages(prev => [...prev, { text: response.response, isUser: false }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        text: "Oops! I'm having a little trouble. But don't worry! You're doing great! Keep trying! 💪✨", 
        isUser: false 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // NEW: Handle proactive help with full context
  const handleProactiveHelp = async (context: any) => {
    console.log('[Chatbot] 🚀 Proactive help triggered with context:', context);
    
    if (!context) {
      console.warn('[Chatbot] ⚠️ No context provided to handleProactiveHelp!');
      return;
    }
    
    setProactiveContext(context);

    // Build a detailed question with the analysis context
    const problemContext = context.problemContext || {};
    const analysis = context.analysis || {};
    
    // Create a rich question that includes mission context
    let contextualQuestion = `I need help with the mission "${mission?.title || 'this challenge'}"!`;
    
    if (mission?.description) {
      contextualQuestion += `\nMission goal: ${mission.description}`;
    }
    
    contextualQuestion += `\n\nI'm stuck and here's what's happening:`;
    
    if (problemContext.errorType) {
      contextualQuestion += `\n- I keep getting a ${problemContext.errorType} error: "${problemContext.errorMessage}"`;
    }
    
    if (analysis.struggling_concepts?.length) {
      contextualQuestion += `\n- I'm struggling with: ${analysis.struggling_concepts.join(', ')}`;
    }
    
    if (problemContext.codeSnapshot) {
      contextualQuestion += `\n\nHere's my current code:\n${problemContext.codeSnapshot}`;
    } else if (currentCode) {
      contextualQuestion += `\n\nHere's my current code:\n${currentCode}`;
    }
    
    contextualQuestion += `\n\nCan you help me understand what I'm doing wrong and guide me to fix it?`;

    console.log('[Chatbot] 📝 Contextual question:', contextualQuestion);

    // Set the input value and trigger send
    setInputValue(contextualQuestion);
    console.log('[Chatbot] 📥 Input value set to:', contextualQuestion);
    
    // Add user message immediately
    console.log('[Chatbot] ➕ Adding user message to chat');
    setMessages(prev => [...prev, { text: contextualQuestion, isUser: true }]);
    setIsTyping(true);

    try {
      const conversationHistory = [
        ...messages.map(m => ({
          role: m.isUser ? 'user' : 'assistant',
          content: m.text
        })),
        { role: 'user', content: contextualQuestion }
      ];

      const request: ChatRequest = {
        userId: user?.username || 'anonymous',
        missionId: mission?._id || 'free-play',
        question: contextualQuestion,
        promptId: undefined,
        code: problemContext.codeSnapshot || currentCode,
        weakConcepts: problemContext.weakConcepts || insights?.weakConcepts || profile?.weakSkills || [],
        strongConcepts: problemContext.strongConcepts || insights?.strongConcepts || profile?.strongSkills || [],
        attemptNumber: 1,
        submissionId: undefined,
        conversationHistory: conversationHistory as any[],
        masterySnapshot: insights?.mastery,
        streak: insights?.gamification?.streak,
        level: insights?.gamification?.level,
        // Include FULL context in the request
        context: {
          isProactiveHelp: true,
          behaviorAnalysis: context.analysis,
          interventionType: context.interventionType,
          severity: context.severity,
          errorHistory: {
            type: problemContext.errorType,
            message: problemContext.errorMessage,
            repeatCount: context.metrics?.sameErrorCount,
          },
          strugglingConcepts: analysis.struggling_concepts || [],
          // Add mission details
          mission: {
            id: mission?._id,
            title: mission?.title,
            description: mission?.description,
            difficulty: mission?.difficulty,
            concepts: mission?.concepts,
            objectives: mission?.objectives,
          },
          // Add user profile
          userProfile: {
            username: user?.username,
            weakSkills: profile?.weakSkills,
            strongSkills: profile?.strongSkills,
          },
        }
      };

      console.log('[Chatbot] 📤 Sending proactive help request:', request);
      const response = await sendChatMessage(request);
      console.log('[Chatbot] ✅ Proactive help response received:', response);
      
      // Add AI response
      console.log('[Chatbot] 🤖 Adding AI response to chat');
      setMessages(prev => [...prev, { 
        text: response.response, 
        isUser: false 
      }]);
      
      // Clear input after successful send
      setInputValue('');
      console.log('[Chatbot] 🧹 Input cleared');
      
    } catch (error) {
      console.error('[Chatbot] ❌ Proactive help error:', error);
      setMessages(prev => [...prev, { 
        text: "I want to help, but I'm having trouble right now. Try asking me directly what you need help with! 💪", 
        isUser: false 
      }]);
    } finally {
      setIsTyping(false);
      setProactiveContext(null);
      console.log('[Chatbot] 🏁 Proactive help completed');
    }
  };

  return {
    messages,
    inputValue,
    setInputValue,
    isTyping,
    isChatOpen,
    setIsChatOpen,
    messagesEndRef,
    quickPrompts,
    handlePromptClick,
    handleSendMessage,
    handleProactiveHelp, // NEW: Expose proactive help
  };
}
