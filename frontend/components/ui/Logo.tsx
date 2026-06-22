'use client';

import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import Image from 'next/image';

interface LogoProps {
  variant?: 'navbar' | 'sidebar' | 'hero' | 'splash';
  className?: string;
}

export default function Logo({ variant = 'navbar', className }: LogoProps) {
  // Common animation variants for the logo image
  const logoVariants = {
    initial: { opacity: 0, scale: 0.9 },
    animate: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
    },
    float: {
      y: [0, -10, 0],
      transition: { duration: 6, ease: 'easeInOut', repeat: Infinity }
    },
    breathe: {
      scale: [1, 1.02, 1],
      filter: ['brightness(1)', 'brightness(1.15)', 'brightness(1)'],
      transition: { duration: 8, ease: 'easeInOut', repeat: Infinity }
    }
  };

  if (variant === 'hero') {
    return (
      <div className={clsx('relative flex flex-col items-center justify-center', className)}>
        {/* Deep ambient glow layer */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-brand-cyan/20 rounded-full blur-[50px] mix-blend-screen pointer-events-none animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 bg-brand-violet/30 rounded-full blur-[40px] mix-blend-screen pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />
        
        <motion.div
          variants={logoVariants}
          initial="initial"
          animate={['animate', 'float', 'breathe']}
          className="relative z-10 w-28 h-28 md:w-32 md:h-32 drop-shadow-[0_0_25px_rgba(0,229,255,0.4)]"
        >
          <Image 
            src="/ai-monogram.png" 
            alt="AI Hiring Suite Master Logo" 
            fill
            className="object-contain filter drop-shadow-2xl"
            priority
          />
          {/* Glass reflection highlight */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-transparent rounded-full opacity-50 pointer-events-none" />
        </motion.div>
      </div>
    );
  }

  if (variant === 'sidebar') {
    return (
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className={clsx('flex items-center gap-3', className)}
      >
        <div className="relative w-10 h-10 shrink-0 drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]">
          <Image 
            src="/ai-monogram.png" 
            alt="AI Hiring Suite" 
            fill
            className="object-contain"
            priority
          />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-black tracking-tight text-white leading-none">AI HIRING</span>
          <span className="text-[10px] font-bold text-brand-cyan uppercase tracking-[0.2em] leading-tight">SUITE</span>
        </div>
      </motion.div>
    );
  }

  if (variant === 'splash') {
    return (
      <div className={clsx('relative flex flex-col items-center justify-center', className)}>
        {/* Intense cinematic glow */}
        <div className="absolute w-[300px] h-[300px] bg-brand-cyan/20 rounded-full blur-[100px] pointer-events-none animate-glow" />
        <div className="absolute w-[200px] h-[200px] bg-brand-violet/20 rounded-full blur-[80px] pointer-events-none animate-glow" style={{ animationDelay: '1.5s' }} />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-32 h-32 md:w-40 md:h-40 drop-shadow-[0_0_35px_rgba(0,229,255,0.6)]"
        >
          <Image 
            src="/ai-monogram.png" 
            alt="AI Hiring Suite Splash Logo" 
            fill
            className="object-contain"
            priority
          />
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 1 }}
          className="mt-8 flex flex-col items-center text-center relative z-10"
        >
          <span className="text-2xl font-black tracking-widest text-white mb-2">AI HIRING SUITE</span>
          <span className="text-xs font-bold text-brand-cyan uppercase tracking-[0.3em]">INTELLIGENT HIRING. BETTER FUTURES.</span>
        </motion.div>
      </div>
    );
  }

  // Default: navbar (Compact monogram only)
  return (
    <motion.div 
      whileHover={{ scale: 1.05, filter: 'brightness(1.2)' }}
      className={clsx('relative w-10 h-10 drop-shadow-[0_0_12px_rgba(0,229,255,0.6)] cursor-pointer', className)}
    >
      <Image 
        src="/ai-monogram.png" 
        alt="AI Hiring Suite Logo" 
        fill
        className="object-contain"
        priority
      />
    </motion.div>
  );
}
