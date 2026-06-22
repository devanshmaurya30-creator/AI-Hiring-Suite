'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ChatBubbleProps {
  message: string;
  isUser: boolean;
  score?: number | null;
  timestamp?: string;
}

export default function ChatBubble({ message, isUser, score, timestamp }: ChatBubbleProps) {
  const time = timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn(
        'flex w-full mb-4',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div className={cn(
        'relative max-w-[85%] sm:max-w-[70%] p-4 rounded-2xl flex flex-col gap-1.5 shadow-lg backdrop-blur-md',
        isUser
          ? 'bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 border border-indigo-400/20 text-white rounded-tr-none'
          : 'bg-white/[0.03] border border-white/[0.08] text-slate-200 rounded-tl-none'
      )}>
        {/* Score Badge (if technical evaluation is present) */}
        {!isUser && score !== undefined && score !== null && (
          <div className="absolute -top-3 -right-3 px-2.5 py-1 rounded-lg bg-emerald-500 text-white text-[10px] font-extrabold shadow-lg flex items-center gap-1 border border-emerald-400/20">
            <span>Score:</span>
            <span className="text-xs">{score}/10</span>
          </div>
        )}

        {/* Message body */}
        <p className="text-sm leading-relaxed font-medium whitespace-pre-wrap">{message}</p>

        {/* Timestamp */}
        <span className={cn(
          'text-[9px] font-semibold text-right block tracking-wider',
          isUser ? 'text-indigo-200' : 'text-slate-500'
        )}>
          {time}
        </span>
      </div>
    </motion.div>
  );
}
