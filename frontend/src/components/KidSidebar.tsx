'use client';

import { useState, useEffect, useRef } from 'react';
import { sendChatMessage, getPredefinedPrompts, type ChatRequest } from '../services/chatbotApi';
import { useWorkspace } from '../context/WorkspaceContext';

export default function KidSidebar() {
  const { mission, user, profile } = useWorkspace();
  const [messages, setMessages] = useState<Array<{text: string, isUser: boolean}>>([
    { text: "Hi there! 👋 I'm here to help you learn Python! Pick a question below or type your own!", isUser: false }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentCode, setCurrentCode] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for code changes from BlockPy editor (if available)
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

  // Pre-defined kid-friendly prompts
  const quickPrompts = [
    { icon: "🤔", text: "What does this block do?", emoji: "🧩" },
    { icon: "💡", text: "Give me a hint!", emoji: "✨" },
    { icon: "❓", text: "How do I use loops?", emoji: "🔄" },
    { icon: "🎯", text: "Show me an example!", emoji: "📝" },
    { icon: "🐛", text: "Help! I have a bug!", emoji: "🔍" },
    { icon: "🎉", text: "What can I do next?", emoji: "🚀" }
  ];

  const handlePromptClick = async (promptText: string) => {
    // Add user message
    setMessages(prev => [...prev, { text: promptText, isUser: true }]);
    setIsTyping(true);

    try {
      // Map frontend messages to backend format
      const conversationHistory = [
        ...messages.map(m => ({
          role: m.isUser ? 'user' : 'assistant',
          content: m.text
        })),
        { role: 'user', content: promptText }
      ];
      // Prepare request for AI service
      const request: ChatRequest = {
        userId: user?.username || 'anonymous',
        missionId: mission?._id || 'free-play',
        question: promptText,
        promptId: undefined, // You can set this if you track which prompt was clicked
        code: currentCode,
        weakConcepts: profile?.weakSkills || [],
        attemptNumber: 1,
        submissionId: undefined, // Set if available
        conversationHistory: conversationHistory as any[],
      };

      // Send to AI service
      const response = await sendChatMessage(request);
      
      // Only show concise main response
      let conciseResponse = response.response;
      // Optionally truncate long responses
      if (conciseResponse.length > 200) {
        conciseResponse = conciseResponse.slice(0, 200) + '...';
      }
      setMessages(prev => [...prev, { text: conciseResponse, isUser: false }]);
      
      // Log difficulty analysis if available
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
      // Map frontend messages to backend format
      const conversationHistory = [
        ...messages.map(m => ({
          role: m.isUser ? 'user' : 'assistant',
          content: m.text
        })),
        { role: 'user', content: userMessage }
      ];
      // Prepare request for AI service
      const request: ChatRequest = {
        userId: user?.username || 'anonymous',
        missionId: mission?._id || 'free-play',
        question: userMessage,
        promptId: undefined,
        code: currentCode,
        weakConcepts: profile?.weakSkills || [],
        attemptNumber: 1,
        submissionId: undefined,
        conversationHistory: conversationHistory as any[],
      };

      // Send to AI service
      const response = await sendChatMessage(request);
      
      // Only show concise main response
      let conciseResponse = response.response;
      if (conciseResponse.length > 200) {
        conciseResponse = conciseResponse.slice(0, 200) + '...';
      }
      setMessages(prev => [...prev, { text: conciseResponse, isUser: false }]);
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

  return (
    <div className="kid-sidebar">
      {/* Mission Description Section */}
      <div className="mission-section">
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
              <strong>Objectives:</strong>
              <ul className="list-disc ml-6">
                {mission.objectives.map((obj, i) => <li key={i}>{obj}</li>)}
              </ul>
            </div>
          )}
          {mission?.expectedOutput && (
            <div className="mission-expected-output">
              <strong>Expected Output:</strong>
              <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">{mission.expectedOutput}</pre>
            </div>
          )}
        </div>
      </div>

      {/* Chatbot Section */}
      <div className="chatbot-section">
        <div className="chatbot-header">
          <span className="chatbot-icon">🤖</span>
          <h2 className="chatbot-title">Ask Me Anything!</h2>
        </div>

        {/* Quick Prompt Buttons */}
        <div className="quick-prompts">
          {quickPrompts.map((prompt, index) => (
            <button
              key={index}
              className="prompt-button"
              onClick={() => handlePromptClick(prompt.text)}
            >
              <span className="prompt-emoji">{prompt.icon}</span>
              <span className="prompt-text">{prompt.text}</span>
            </button>
          ))}
        </div>

        {/* Chat Messages */}
        <div className="chat-messages">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`chat-message ${message.isUser ? 'user-message' : 'bot-message'}`}
            >
              <div className="message-avatar">
                {message.isUser ? '😊' : '🤖'}
              </div>
              <div className="message-bubble">
                {message.text}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="chat-message bot-message">
              <div className="message-avatar">🤖</div>
              <div className="message-bubble typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div className="chat-input-container">
          <input
            type="text"
            className="chat-input"
            placeholder="Type your question here... ✨"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <button className="send-button" onClick={handleSendMessage}>
            <span className="send-icon">📤</span>
          </button>
        </div>
      </div>
    </div>
  );
}
