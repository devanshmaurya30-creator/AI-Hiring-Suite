'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Sparkles, Shield, Cpu, Award } from 'lucide-react';
import Spotlight from './spotlight';
import Button from './Button';

// Premium Cinematic SVG/CSS Fallback Neural Network Orb
function PremiumNeuralOrb() {
  return (
    <div className="relative w-full h-full min-h-[400px] flex items-center justify-center bg-transparent">
      {/* Outer ambient glow */}
      <div className="absolute w-72 h-72 rounded-full bg-brand-cyan/10 blur-[60px] animate-pulse-slow" />
      <div className="absolute w-96 h-96 rounded-full bg-brand-violet/5 blur-[90px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
      
      {/* Animated SVG Neural Network */}
      <motion.svg
        className="w-72 h-72 relative z-10 text-brand-cyan/20"
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        animate={{ rotate: 360 }}
        transition={{ duration: 40, ease: "linear", repeat: Infinity }}
      >
        {/* Connection Lines */}
        <line x1="100" y1="100" x2="60" y2="60" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
        <line x1="100" y1="100" x2="140" y2="60" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
        <line x1="100" y1="100" x2="140" y2="140" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
        <line x1="100" y1="100" x2="60" y2="140" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
        
        <line x1="60" y1="60" x2="140" y2="60" stroke="currentColor" strokeWidth="0.5" />
        <line x1="140" y1="60" x2="140" y2="140" stroke="currentColor" strokeWidth="0.5" />
        <line x1="140" y1="140" x2="60" y2="140" stroke="currentColor" strokeWidth="0.5" />
        <line x1="60" y1="140" x2="60" y2="60" stroke="currentColor" strokeWidth="0.5" />

        {/* Nodes with pulsing animations */}
        <motion.circle 
          cx="100" cy="100" r="10" 
          fill="url(#glow-cyan)" 
          animate={{ scale: [1, 1.15, 1] }} 
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} 
        />
        
        <motion.circle 
          cx="60" cy="60" r="6" 
          fill="url(#glow-violet)" 
          animate={{ scale: [1, 1.2, 1] }} 
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }} 
        />
        <motion.circle 
          cx="140" cy="60" r="6" 
          fill="url(#glow-violet)" 
          animate={{ scale: [1, 1.2, 1] }} 
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }} 
        />
        <motion.circle 
          cx="140" cy="140" r="6" 
          fill="url(#glow-violet)" 
          animate={{ scale: [1, 1.2, 1] }} 
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1.5 }} 
        />
        <motion.circle 
          cx="60" cy="140" r="6" 
          fill="url(#glow-violet)" 
          animate={{ scale: [1, 1.2, 1] }} 
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 2 }} 
        />

        {/* Outer Orbit Nodes */}
        <circle cx="100" cy="30" r="4" fill="#00E5FF" opacity="0.8" />
        <circle cx="170" cy="100" r="4" fill="#7B61FF" opacity="0.8" />
        <circle cx="100" cy="170" r="4" fill="#FFB547" opacity="0.8" />
        <circle cx="30" cy="100" r="4" fill="#00E5FF" opacity="0.8" />

        <defs>
          <radialGradient id="glow-cyan" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00E5FF" />
            <stop offset="100%" stopColor="#7B61FF" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="glow-violet" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7B61FF" />
            <stop offset="100%" stopColor="#00E5FF" stopOpacity="0" />
          </radialGradient>
        </defs>
      </motion.svg>
      
      <div className="absolute bottom-6 flex flex-col items-center gap-1 z-20">
        <span className="text-[10px] uppercase font-bold text-brand-cyan/60 tracking-wider">Neural Net Core Active</span>
        <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Responsive GPU Render</span>
      </div>
    </div>
  );
}

export default function SplineHero() {
  const textBlurReveal = {
    hidden: { filter: 'blur(10px)', opacity: 0, y: 20 },
    visible: { 
      filter: 'blur(0px)', 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      }
    }
  };

  const rightSideReveal = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }
    }
  };

  return (
    <section className="relative w-full min-h-[100vh] lg:h-[100vh] flex items-center justify-center overflow-hidden bg-surface py-20 lg:py-0 border-b border-white/[0.04]">
      {/* Dynamic Cinematic spotlight background elements */}
      <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="rgba(0, 229, 255, 0.25)" />
      <Spotlight className="top-20 right-0 md:right-40" fill="rgba(123, 97, 255, 0.2)" />
      
      {/* Dynamic gradients & Neural Energy blur */}
      <div className="absolute top-1/4 left-1/4 w-[35vw] h-[35vw] rounded-full bg-brand-cyan/5 blur-[120px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-[40vw] h-[40vw] rounded-full bg-brand-violet/5 blur-[150px] pointer-events-none animate-pulse-slow" style={{ animationDelay: '3s' }} />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 h-full flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-6">
        
        {/* Left Side Info Panel */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full lg:w-1/2 flex flex-col items-start text-left space-y-6 lg:space-y-8"
        >
          {/* Premium Badge */}
          <motion.div 
            variants={textBlurReveal}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand-cyan/20 bg-brand-cyan/5 backdrop-blur-md text-brand-cyan text-[10px] font-extrabold uppercase tracking-widest shadow-[0_0_15px_rgba(0,229,255,0.15)] animate-neural-pulse"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Next-Gen Recruiter OS v2.0</span>
          </motion.div>

          {/* Headline with dynamic color gradient text */}
          <motion.h1 
            variants={textBlurReveal}
            className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1] sm:leading-none"
          >
            Hire Smarter with <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-cyan via-brand-violet to-brand-orange animate-glow">
              Artificial Intelligence
            </span>
          </motion.h1>

          {/* Description */}
          <motion.p 
            variants={textBlurReveal}
            className="text-sm sm:text-base lg:text-lg text-slate-400 font-light leading-relaxed max-w-xl"
          >
            AI-powered recruitment platform featuring resume intelligence, fraud detection, interview automation, predictive analytics, and enterprise hiring workflows.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div 
            variants={textBlurReveal}
            className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
          >
            <Link href="/register" className="w-full sm:w-auto">
              <Button 
                variant="primary" 
                className="w-full sm:w-auto px-8 py-4 flex items-center justify-center gap-3 text-xs uppercase font-extrabold tracking-widest relative overflow-hidden group hover:scale-[1.03] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(0,229,255,0.2)]"
              >
                <span>Candidate Portal</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
              </Button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <Button 
                variant="secondary" 
                className="w-full sm:w-auto px-8 py-4 justify-center text-xs uppercase font-extrabold tracking-widest hover:bg-white/10 transition-all border-white/10 bg-white/[0.03]"
              >
                Recruiter / HR Terminal
              </Button>
            </Link>
          </motion.div>

          {/* Trust indicators */}
          <motion.div 
            variants={textBlurReveal}
            className="flex items-center gap-6 pt-6 border-t border-white/[0.04] w-full text-left"
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-brand-cyan opacity-80" />
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Secure Audit Logs</span>
            </div>
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-brand-violet opacity-80" />
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Whisper Offline Voice</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-brand-orange opacity-80" />
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Gemini Evaluation</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Right Side Fallback Canvas */}
        <motion.div 
          variants={rightSideReveal}
          initial="hidden"
          animate="visible"
          className="w-full lg:w-1/2 h-[45vh] lg:h-[75vh] flex items-center justify-center relative overflow-hidden"
        >
          {/* Glassmorphic border ring behind Fallback */}
          <div className="absolute w-[80%] h-[80%] rounded-full border border-white/[0.03] bg-gradient-radial pointer-events-none z-0" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050816] via-transparent to-[#050816] pointer-events-none z-10" />
          
          <div className="w-full h-full relative z-0 scale-[1.05] lg:scale-[1.15]">
            <PremiumNeuralOrb />
          </div>
        </motion.div>

      </div>
    </section>
  );
}
