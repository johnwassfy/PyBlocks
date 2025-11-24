'use client';

import { useState, useEffect, useRef } from 'react';
import { sendChatMessage, getPredefinedPrompts, type ChatRequest } from '../services/chatbotApi';
import { useWorkspace } from '../context/WorkspaceContext';
import '../styles/kid-sidebar.css';

export default function KidSidebar() {
  const { mission, user, profile, insights } = useWorkspace();

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border-r border-indigo-100 shadow-2xl relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-10 -left-10 w-40 h-40 bg-purple-300/20 rounded-full blur-3xl animate-blob" />
        <div className="absolute top-40 -right-10 w-40 h-40 bg-yellow-300/20 rounded-full blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute -bottom-10 left-20 w-40 h-40 bg-pink-300/20 rounded-full blur-3xl animate-blob animation-delay-4000" />
      </div>

      {/* Mission Header */}
      <div className="p-6 pb-4 relative z-10">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30 flex items-center justify-center text-3xl transform -rotate-6 hover:rotate-0 transition-transform duration-300 cursor-default">
            🎯
          </div>
          <div>
            <h2 className="font-black text-2xl text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 tracking-tight leading-none mb-1">
              {mission?.title || 'Your Mission'}
            </h2>
            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${(mission?.difficulty || 'easy').toLowerCase() === 'hard'
                ? 'bg-rose-100 text-rose-600 border-rose-200'
                : (mission?.difficulty || 'easy').toLowerCase() === 'medium'
                  ? 'bg-amber-100 text-amber-600 border-amber-200'
                  : 'bg-emerald-100 text-emerald-600 border-emerald-200'
              }`}>
              {mission?.difficulty || 'Easy'}
            </span>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6 scrollbar-thin scrollbar-thumb-indigo-200 scrollbar-track-transparent relative z-10">

        {/* Description Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-sm border border-white/50 relative group hover:shadow-lg hover:scale-[1.02] transition-all duration-300 flex-shrink-0">
          <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-indigo-400 to-purple-500 rounded-l-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
          <p className="text-gray-700 leading-relaxed font-medium text-lg md:text-xl relative z-10">
            {mission?.description || "🌟 Welcome, Code Explorer! Ready for an adventure? 🌟"}
          </p>
          <div className="absolute -bottom-2 -right-2 text-4xl opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:rotate-12">
            🚀
          </div>
        </div>

        {/* Objectives */}
        {mission?.objectives && mission.objectives.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-black text-indigo-900 uppercase tracking-wider flex items-center gap-2 ml-1">
              <span className="w-6 h-6 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center text-xs shadow-sm">✨</span>
              What You'll Learn
            </h3>
            <div className="grid gap-3">
              {mission.objectives.map((obj, i) => (
                <div key={i} className="flex items-start gap-3 bg-white/60 p-4 rounded-2xl border border-white/50 hover:bg-white hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
                  <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold group-hover:scale-110 transition-transform">
                    {i + 1}
                  </div>
                  <span className="text-sm text-gray-700 font-medium group-hover:text-gray-900 transition-colors">{obj}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expected Output */}
        {mission?.expectedOutput && (
          <div className="space-y-3">
            <h3 className="text-sm font-black text-indigo-900 uppercase tracking-wider flex items-center gap-2 ml-1">
              <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs shadow-sm">🎬</span>
              Expected Output
            </h3>
            <div className="bg-gray-900 rounded-2xl p-1 shadow-inner border-4 border-gray-800 relative overflow-hidden group hover:border-gray-700 transition-colors">
              <div className="bg-gray-800 rounded-t-xl px-3 py-2 flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 group-hover:bg-red-400 transition-colors" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 group-hover:bg-yellow-400 transition-colors" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 group-hover:bg-green-400 transition-colors" />
              </div>
              <div className="p-4 bg-gray-900/50">
                <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap break-words font-bold">
                  {mission.expectedOutput}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {mission?.estimatedTime && (
            <div className="bg-blue-50/80 backdrop-blur-sm p-4 rounded-2xl border border-blue-100 flex flex-col items-center justify-center text-center hover:bg-blue-50 hover:scale-105 transition-all duration-300 cursor-default group">
              <span className="text-3xl mb-2 group-hover:animate-bounce">⏱️</span>
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wide">Time</span>
              <span className="text-lg font-black text-blue-600">{mission.estimatedTime}m</span>
            </div>
          )}
          {mission?.xpReward && (
            <div className="bg-purple-50/80 backdrop-blur-sm p-4 rounded-2xl border border-purple-100 flex flex-col items-center justify-center text-center hover:bg-purple-50 hover:scale-105 transition-all duration-300 cursor-default group">
              <span className="text-3xl mb-2 group-hover:animate-spin">⭐</span>
              <span className="text-xs font-bold text-purple-400 uppercase tracking-wide">Reward</span>
              <span className="text-lg font-black text-purple-600">{mission.xpReward} XP</span>
            </div>
          )}
        </div>
      </div>

      {/* CSS for custom animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}} />
    </div>
  );
}

// Export the chatbot state and handlers for use in BlocklyWorkspace
export function useChatbot() {
  const { mission, user, profile, insights } = useWorkspace();
  const [messages, setMessages] = useState<Array<{ text: string, isUser: boolean }>>([
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
        context: {
          mission: mission ? {
            title: mission.title,
            description: mission.description,
            objectives: mission.objectives,
            expectedOutput: mission.expectedOutput,
          } : undefined,
          userProfile: {
            username: user?.username,
            weakSkills: profile?.weakSkills,
            strongSkills: profile?.strongSkills,
          }
        }
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
        context: {
          mission: mission ? {
            title: mission.title,
            description: mission.description,
            objectives: mission.objectives,
            expectedOutput: mission.expectedOutput,
          } : undefined,
          userProfile: {
            username: user?.username,
            weakSkills: profile?.weakSkills,
            strongSkills: profile?.strongSkills,
          }
        }
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
