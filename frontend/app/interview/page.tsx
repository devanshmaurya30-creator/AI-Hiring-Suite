'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Sparkles, AlertCircle, ChevronDown, CheckCircle2, RefreshCw, Cpu, Award } from 'lucide-react';
import { useInterviewStore } from '@/lib/store/interviewStore';
import { useAuthStore } from '@/lib/store/authStore';
import { interviews as interviewsApi, jobs as jobsApi } from '@/lib/api/endpoints';
import type { Job, Interview } from '@/types';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import AuthGuard from '@/components/layout/AuthGuard';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import ProgressRing from '@/components/ui/ProgressRing';
import InterviewPanel from '@/components/interview/InterviewPanel';

export default function InterviewBotPage() {
  const { user } = useAuthStore();
  const { currentInterview, startInterview, reset, isLoading } = useInterviewStore();

  const completedInterview = (currentInterview && 'id' in currentInterview)
    ? currentInterview as Interview
    : null;

  const [jobs, setJobs] = useState<Job[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  
  // Setup state
  const [selectedJobId, setSelectedJobId] = useState<number | ''>('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [interviewType, setInterviewType] = useState<'technical' | 'hr'>('technical');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchSetupData = async () => {
      try {
        const jobsData = await jobsApi.list();
        setJobs(jobsData);
        if (jobsData.length > 0) {
          setSelectedJobId(jobsData[0].id);
        }

        const catsData = await interviewsApi.getCategories();
        setCategories(catsData);
        if (catsData.length > 0) {
          setSelectedCategory(catsData[0]);
        }
      } catch (err) {
        console.error('Failed to load setup data:', err);
      }
    };
    fetchSetupData();
  }, []);

  const handleStart = async () => {
    setErrorMsg('');
    const token = localStorage.getItem('auth_token');

    try {
      const meRes = await fetch('http://localhost:8000/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!meRes.ok) {
        throw new Error('Failed to retrieve user candidate profile.');
      }

      const meData = await meRes.json();
      const candidateId = meData.candidate?.id;

      if (!candidateId) {
        setErrorMsg('Candidate profile not found. Please upload a resume first.');
        return;
      }

      if (!selectedJobId) {
        setErrorMsg('Please select a job.');
        return;
      }

      await startInterview({
        candidate_id: candidateId,
        job_id: Number(selectedJobId),
        interview_type: interviewType,
        category: interviewType === 'technical' ? selectedCategory : 'Behavioral & Situational',
        difficulty,
      });
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to start interview.');
    }
  };

  return (
    <AuthGuard requiredRole="candidate">
      <div className="min-h-screen bg-[#020208]">
        <Sidebar />
        <div className="lg:pl-[280px] flex flex-col min-h-screen">
          <Header title="AI Interview Terminal" />
          <main className="flex-1 p-6 lg:p-8 flex flex-col justify-center items-center">
            
            {/* 1. Setup Panel (If no active interview, or completed) */}
            {!currentInterview ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-xl"
              >
                <GlassCard className="p-8 border border-white/[0.08] shadow-2xl relative overflow-hidden">
                  
                  {/* Decorative glow background */}
                  <div className="absolute -top-24 left-1/2 transform -translate-x-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                  {/* Header */}
                  <div className="flex flex-col items-center mb-8 text-center relative z-10">
                    <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-3.5 animate-float shadow-inner">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-slate-100 to-indigo-200 tracking-tight">Configure Interview Session</h2>
                    <p className="text-[10px] text-slate-500 mt-1.5 font-bold uppercase tracking-wider">AI Conversational Screenings</p>
                  </div>

                  {/* Form */}
                  <div className="space-y-6 relative z-10">
                    {/* Toggle interview type */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block">
                        Interview Mode
                      </label>
                      <div className="grid grid-cols-2 p-1 bg-slate-950/40 border border-white/5 rounded-xl shadow-inner">
                        <button
                          onClick={() => setInterviewType('technical')}
                          className={`py-2.5 text-xs font-bold rounded-lg transition-all duration-300 ${
                            interviewType === 'technical'
                              ? 'bg-indigo-600 text-white shadow-md border border-white/10'
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          Technical Inquiries
                        </button>
                        <button
                          onClick={() => setInterviewType('hr')}
                          className={`py-2.5 text-xs font-bold rounded-lg transition-all duration-300 ${
                            interviewType === 'hr'
                              ? 'bg-indigo-600 text-white shadow-md border border-white/10'
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          Behavioral / HR Screen
                        </button>
                      </div>
                    </div>

                    {/* Job selector */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block">
                        Target Job Posting
                      </label>
                      <div className="relative">
                        <select
                          value={selectedJobId}
                          onChange={(e) => setSelectedJobId(e.target.value ? Number(e.target.value) : '')}
                          className="w-full bg-slate-950/40 border border-white/5 rounded-xl px-4 py-3 text-xs font-semibold text-slate-200 outline-none appearance-none focus:ring-2 focus:ring-indigo-500/50"
                        >
                          <option value="">Select job posting...</option>
                          {jobs.map((job) => (
                            <option key={job.id} value={job.id}>
                              {job.title} ({job.company || 'AI Hiring'})
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-4 w-4 h-4 text-slate-500 pointer-events-none" />
                      </div>
                    </div>

                    {/* Category (only for Tech) */}
                    {interviewType === 'technical' && (
                      <div className="space-y-1.5">
                        <label className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block">
                          Technical Category
                        </label>
                        <div className="relative">
                          <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full bg-slate-950/40 border border-white/5 rounded-xl px-4 py-3 text-xs font-semibold text-slate-200 outline-none appearance-none focus:ring-2 focus:ring-indigo-500/50"
                          >
                            {categories.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-4 w-4 h-4 text-slate-500 pointer-events-none" />
                        </div>
                      </div>
                    )}

                    {/* Difficulty */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block">
                        Difficulty Level
                      </label>
                      <div className="grid grid-cols-3 p-1 bg-slate-950/40 border border-white/5 rounded-xl shadow-inner">
                        {(['easy', 'medium', 'hard'] as const).map((diff) => (
                          <button
                            key={diff}
                            onClick={() => setDifficulty(diff)}
                            className={`py-2.5 text-xs font-bold rounded-lg transition-all duration-300 capitalize ${
                              difficulty === diff
                                ? 'bg-indigo-600 text-white shadow-md border border-white/10'
                                : 'text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            {diff}
                          </button>
                        ))}
                      </div>
                    </div>

                    {errorMsg && (
                      <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-400 text-xs font-semibold">
                        <AlertCircle className="w-4.5 h-4.5 mt-0.5 shrink-0" />
                        <span>{errorMsg}</span>
                      </div>
                    )}

                    <Button
                      onClick={handleStart}
                      isLoading={isLoading}
                      variant="primary"
                      className="w-full py-4 flex items-center justify-center gap-2 mt-2 uppercase font-extrabold tracking-wider text-xs border border-white/10 shadow-lg"
                    >
                      <MessageSquare className="w-4.5 h-4.5" />
                      <span>Start Interview Terminal</span>
                    </Button>
                  </div>
                </GlassCard>
              </motion.div>
            ) : currentInterview.status === 'in_progress' ? (
              /* 2. Active Interview Panel */
              <InterviewPanel />
            ) : (
              /* 3. Completed Interview Summary Card */
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-2xl"
              >
                <GlassCard className="p-8 border border-white/[0.08] shadow-2xl flex flex-col items-center text-center gap-6 relative overflow-hidden">
                  <div className="absolute -top-24 left-1/2 transform -translate-x-1/2 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

                  {/* Icon & Title */}
                  <div className="flex flex-col items-center gap-2 relative z-10">
                    <div className="p-3.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-md">
                      <CheckCircle2 className="w-9 h-9" />
                    </div>
                    <h2 className="text-xl font-extrabold text-slate-100 mt-3">Interview Completed!</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Responses submitted for HR evaluation</p>
                  </div>

                  {/* Circular Score */}
                  <div className="flex flex-col items-center gap-2.5 relative z-10">
                    <ProgressRing value={(completedInterview?.total_score ?? 0) * 10} size={110} strokeWidth={8} />
                    <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest mt-1">
                      Overall Evaluation Score
                    </span>
                  </div>

                  {/* Feedback Text */}
                  {completedInterview?.feedback && (
                    <div className="p-5 rounded-xl border border-white/[0.06] bg-slate-950/40 w-full text-left relative z-10">
                      <span className="text-[9px] uppercase font-bold text-indigo-400 tracking-widest block mb-2">
                        Interviewer Feedback Summary:
                      </span>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light">
                        {completedInterview?.feedback}
                      </p>
                    </div>
                  )}

                  {/* Restart button */}
                  <Button
                    onClick={reset}
                    variant="secondary"
                    className="flex items-center gap-2 mt-2 px-8 py-3.5 text-xs uppercase font-bold tracking-widest border border-white/5 bg-white/[0.02] hover:bg-white/[0.04]"
                  >
                    <RefreshCw className="w-4 h-4 text-slate-400" />
                    <span>Take Another Interview</span>
                  </Button>
                </GlassCard>
              </motion.div>
            )}

          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
