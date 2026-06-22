'use client';

import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  gradient?: boolean;
  onClick?: () => void;
  animate?: boolean;
}

export default function GlassCard({
  children,
  className,
  hover = false,
  gradient = false,
  onClick,
  animate = true,
}: GlassCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Mouse position inside card (relative -0.5 to 0.5)
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth hover tilt springs
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), { damping: 22, stiffness: 220 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), { damping: 22, stiffness: 220 });

  // Light reflection spot
  const reflectionX = useMotionValue(-1000);
  const reflectionY = useMotionValue(-1000);
  const background = useTransform(
    [reflectionX, reflectionY],
    (coords) => `radial-gradient(150px circle at ${coords[0]}px ${coords[1]}px, rgba(255,255,255,0.06), transparent 75%)`
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || !hover) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    const relX = (e.clientX - rect.left) / width - 0.5;
    const relY = (e.clientY - rect.top) / height - 0.5;

    x.set(relX);
    y.set(relY);

    reflectionX.set(e.clientX - rect.left);
    reflectionY.set(e.clientY - rect.top);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    reflectionX.set(-1000);
    reflectionY.set(-1000);
  };

  const baseClasses = cn(
    'backdrop-blur-xl bg-white/[0.02] border rounded-2xl p-6 relative overflow-hidden group',
    gradient ? 'border-transparent' : 'border-white/[0.08]',
    hover && 'cursor-pointer transition-colors duration-300 hover:border-white/[0.18]',
    className
  );

  const cardContent = (
    <motion.div
      ref={cardRef}
      className={baseClasses}
      style={hover ? {
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
      } : undefined}
      initial={animate ? { opacity: 0, y: 15 } : undefined}
      animate={animate ? { opacity: 1, y: 0 } : undefined}
      transition={animate ? { duration: 0.5, ease: [0.16, 1, 0.3, 1] } : undefined}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      {/* Dynamic light reflection spot */}
      {hover && (
        <motion.div
          className="absolute inset-0 pointer-events-none z-10"
          style={{ background }}
        />
      )}
      
      {/* Content container with depth translation */}
      <div style={hover ? { transform: 'translateZ(12px)' } : undefined}>
        {children}
      </div>
    </motion.div>
  );

  if (gradient) {
    return (
      <div style={{ perspective: 1000 }} className="relative rounded-2xl p-[1px] bg-gradient-to-br from-indigo-500/30 via-purple-500/30 to-pink-500/30">
        {cardContent}
      </div>
    );
  }

  return (
    <div style={{ perspective: 1000 }}>
      {cardContent}
    </div>
  );
}
