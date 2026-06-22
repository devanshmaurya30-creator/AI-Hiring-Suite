'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SkillBadgeProps {
  name: string;
  matched?: boolean;
  proficiency?: string; // 'beginner', 'intermediate', 'advanced', 'expert'
  className?: string;
}

export default function SkillBadge({ name, matched = true, proficiency, className }: SkillBadgeProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'group relative inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border backdrop-blur-md transition-all duration-300',
        matched
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 glow-emerald'
          : 'bg-white/[0.02] border-white/10 text-slate-400 hover:text-slate-200',
        className
      )}
    >
      {/* Pulse Dot Indicator */}
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full shrink-0',
          matched ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
        )}
      />
      
      <span>{name}</span>

      {/* Hover Tooltip showing Proficiency */}
      {proficiency && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10 text-[10px] font-bold text-slate-200 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 shadow-xl whitespace-nowrap z-30">
          Proficiency: <span className="capitalize text-indigo-400">{proficiency}</span>
        </div>
      )}
    </motion.div>
  );
}
