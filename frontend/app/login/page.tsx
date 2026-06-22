'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import Logo from '@/components/ui/Logo';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import GlassCard from '@/components/ui/GlassCard';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();

  const [role, setRole] = useState<'candidate' | 'hr'>('candidate');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    try {
      await login(email, password);
      // Wait, we need to redirect based on user role.
      // But the login action updates useAuthStore. Let's fetch current user state.
      const state = useAuthStore.getState();
      if (state.user) {
        if (state.user.role === 'hr') {
          router.push('/dashboard');
        } else {
          router.push('/resume-upload');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Invalid email or password. Please try again.');
    }
  };

  return (
    <div className="relative min-h-screen bg-surface flex items-center justify-center p-6 overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[20%] left-[20%] w-[40%] h-[40%] rounded-full bg-brand-cyan/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[20%] w-[45%] h-[45%] rounded-full bg-brand-violet/10 blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <GlassCard className="p-8 shadow-2xl border border-white/[0.08]">
          {/* Logo & Header */}
          <div className="flex flex-col items-center mb-8">
            <Logo variant="navbar" className="mb-3" />
            <h2 className="text-xl font-extrabold text-slate-100">Welcome Back</h2>
            <p className="text-xs text-slate-500 mt-1 font-semibold">Sign in to your hiring assistant dashboard</p>
          </div>

          {/* Role Switching Tabs */}
          <div className="grid grid-cols-2 p-1 bg-white/[0.03] border border-white/[0.08] rounded-xl mb-6">
            <button
              onClick={() => setRole('candidate')}
              className={`py-2 text-xs font-bold rounded-lg transition-all duration-300 ${
                role === 'candidate'
                  ? 'bg-indigo-500 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Candidate
            </button>
            <button
              onClick={() => setRole('hr')}
              className={`py-2 text-xs font-bold rounded-lg transition-all duration-300 ${
                role === 'hr'
                  ? 'bg-indigo-500 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Recruiter / HR
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              label="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. candidate@demo.com"
              icon={Mail}
              required
            />
            <Input
              type="password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              icon={Lock}
              required
            />

            {errorMsg && (
              <div className="flex items-start gap-2 p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-400 text-xs font-semibold">
                <AlertCircle className="w-4.5 h-4.5 mt-0.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              className="w-full py-3 flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </Button>
          </form>

          {/* Registration Link */}
          <div className="mt-6 text-center">
            <span className="text-xs text-slate-500 font-semibold">Don't have an account? </span>
            <Link href="/register" className="text-xs text-indigo-400 font-bold hover:underline">
              Create an Account
            </Link>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
