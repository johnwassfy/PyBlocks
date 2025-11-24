
import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChatbot } from './KidSidebar';
import { X, Send, Sparkles, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/kid-sidebar.css';

interface ChatInterfaceProps {
    chatbot: ReturnType<typeof useChatbot>;
    className?: string;
}

export default function ChatInterface({ chatbot, className = '' }: ChatInterfaceProps) {
    const {
        messages,
        inputValue,
        setInputValue,
        isTyping,
        isChatOpen,
        setIsChatOpen,
        messagesEndRef,
        quickPrompts,
        handlePromptClick,
        handleSendMessage
    } = chatbot;

    return (
        <AnimatePresence>
            {isChatOpen && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 50, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className={`fixed bottom-24 right-6 w-[450px] h-[600px] max-h-[80vh] flex flex-col bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 z-50 ${className}`}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-t-3xl">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                                <span className="text-xl">🤖</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800 text-lg">CodeBuddy</h3>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                    <span className="text-xs text-gray-500 font-medium">Online & Ready</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsChatOpen(false)}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                        {/* Welcome / Quick Prompts */}
                        {messages.length <= 1 && (
                            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-indigo-200 scrollbar-track-transparent">
                                {quickPrompts.map((prompt, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handlePromptClick(prompt.text)}
                                        className="flex-shrink-0 flex items-center gap-2 p-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 transition-all border border-indigo-100 hover:border-indigo-200 group whitespace-nowrap"
                                    >
                                        <span className="text-lg group-hover:scale-110 transition-transform duration-200">{prompt.emoji}</span>
                                        <span className="text-xs font-semibold text-indigo-900 leading-tight">{prompt.text}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {messages.map((message, index) => (
                            <div
                                key={index}
                                className={`flex gap-3 ${message.isUser ? 'flex-row-reverse' : ''}`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${message.isUser ? 'bg-indigo-100 text-indigo-600' : 'bg-green-100 text-green-600'
                                    }`}>
                                    {message.isUser ? '👤' : '🤖'}
                                </div>

                                <div className={`max-w-[80%] p-3.5 rounded-2xl shadow-sm text-sm leading-relaxed ${message.isUser
                                    ? 'bg-indigo-600 text-white rounded-tr-none'
                                    : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
                                    }`}>
                                    {message.isUser ? (
                                        message.text
                                    ) : (
                                        <div className="prose prose-sm max-w-none prose-p:my-1 prose-pre:bg-gray-800 prose-pre:text-gray-100 prose-pre:rounded-lg prose-code:text-pink-600 prose-code:bg-pink-50 prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {message.text}
                                            </ReactMarkdown>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isTyping && (
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
                                    🤖
                                </div>
                                <div className="bg-white border border-gray-100 p-4 rounded-2xl rounded-tl-none shadow-sm">
                                    <div className="flex gap-1.5">
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-white border-t border-gray-100 rounded-b-3xl">
                        <div className="relative flex items-center gap-2">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder="Ask for a hint..."
                                className="flex-1 bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-full py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-gray-400"
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!inputValue.trim() || isTyping}
                                className="p-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 active:scale-95"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                        <div className="text-center mt-2">
                            <span className="text-[10px] text-gray-400 flex items-center justify-center gap-1">
                                <Sparkles size={10} />
                                Powered by AI • Context Aware
                            </span>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
