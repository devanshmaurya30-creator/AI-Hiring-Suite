'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Bot, User, Trash2 } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import AuthGuard from '@/components/layout/AuthGuard';
import { useChatbotStore } from '@/lib/store/chatbotStore';
import Button from '@/components/ui/Button';

export default function ChatbotPage() {
  const { messages, isLoading, fetchHistory, sendMessage, clearSession } = useChatbotStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const msg = input.trim();
    setInput('');
    await sendMessage(msg);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <AuthGuard requiredRole="candidate">
      <div className="min-h-screen bg-[#020208]">
        <Sidebar />
        <div className="lg:pl-[280px] flex flex-col min-h-screen">
          <Header title="AI Assistant" />
          <main className="flex-1 p-6 lg:p-8 flex flex-col h-[calc(100vh-80px)]">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-50 via-indigo-200 to-indigo-400">
                Career Assistant
              </h1>
              <Button variant="secondary" size="sm" onClick={clearSession}>
                <Trash2 className="w-4 h-4 mr-2" /> Clear Chat
              </Button>
            </div>
            
            <div className="flex-1 bg-white/[0.02] border border-white/[0.08] rounded-2xl flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.length === 0 && (
                  <div className="text-center text-slate-500 mt-10">
                    <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Hello! I am your AI career assistant. How can I help you today?</p>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl p-4 text-sm ${
                        msg.role === 'user'
                          ? 'bg-indigo-600 text-white rounded-tr-none'
                          : 'bg-slate-800 border border-white/10 text-slate-200 rounded-tl-none'
                      }`}
                    >
                      {msg.content}
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </motion.div>
                ))}
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-4 justify-start"
                  >
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="max-w-[80%] rounded-2xl p-4 bg-slate-800 border border-white/10 text-slate-400 rounded-tl-none text-sm animate-pulse">
                      Thinking...
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>
              
              <div className="p-4 bg-black/20 border-t border-white/[0.08]">
                <div className="flex gap-4">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message..."
                    className="flex-1 bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  />
                  <Button onClick={handleSend} disabled={isLoading || !input.trim()} className="px-6 rounded-xl">
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
