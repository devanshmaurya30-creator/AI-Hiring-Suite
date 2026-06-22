'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';

import { motion } from 'framer-motion';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: 'hr' | 'candidate';
}

export default function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, user, checkAuth } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      await checkAuth();
    };
    initAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (requiredRole && user && user.role !== requiredRole) {
        // Redirect to dashboard or landing if role mismatch
        router.push(user.role === 'hr' ? '/dashboard' : '/resume-upload');
      }
    }
  }, [isAuthenticated, isLoading, user, requiredRole, router]);

  if (isLoading || !isAuthenticated || (requiredRole && user?.role !== requiredRole)) {
    return (
      <div className="fixed inset-0 bg-[#0a0a1a] flex items-center justify-center z-50">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            {/* Pulsing loading concentric rings */}
            <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20" />
            <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 animate-spin" />
          </div>
          <span className="text-xs font-semibold text-slate-400 tracking-widest uppercase">
            Verifying Session...
          </span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, filter: 'blur(16px)', scale: 0.98, y: 15 }}
      animate={{ opacity: 1, filter: 'blur(0px)', scale: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
