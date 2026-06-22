'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface ProgressRingProps {
  value: number; // 0 to 100
  size?: number; // width and height in px
  strokeWidth?: number; // thickness of path in px
  color?: string; // fallback color if not using gradient
  className?: string;
}

export default function ProgressRing({
  value,
  size = 64,
  strokeWidth = 6,
  className,
}: ProgressRingProps) {
  // Clamp value between 0 and 100
  const cleanValue = Math.min(Math.max(value, 0), 100);
  
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (cleanValue / 100) * circumference;

  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background track circle */}
        <circle
          className="text-white/[0.04]"
          stroke="currentColor"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        
        {/* Gradients */}
        <defs>
          <linearGradient id="progressRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" /> {/* Indigo */}
            <stop offset="50%" stopColor="#8b5cf6" /> {/* Violet */}
            <stop offset="100%" stopColor="#d946ef" /> {/* Fuchsia */}
          </linearGradient>
        </defs>

        {/* Foreground animated progress circle */}
        <motion.circle
          stroke="url(#progressRingGradient)"
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeLinecap="round"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      
      {/* Center percentage label */}
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-xs font-extrabold text-slate-100">{Math.round(cleanValue)}%</span>
      </div>
    </div>
  );
}
