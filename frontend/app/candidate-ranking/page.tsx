'use client';

import React, { useEffect, useState } from 'react';
import { Trophy, RefreshCw, Briefcase, ChevronDown, Award, Star, Eye, Sparkles, X } from 'lucide-react';
import { rankings as rankingsApi, jobs as jobsApi, predictions } from '@/lib/api/endpoints';
import type { Ranking, Job } from '@/types';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import AuthGuard from '@/components/layout/AuthGuard';
import GlassCard from '@/components/ui/GlassCard';
import ProgressRing from '@/components/ui/ProgressRing';
import Button from '@/components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';

export default function CandidateRankingPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | ''>('');
  const [rankings, setRankings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [insightsModalOpen, setInsightsModalOpen] = useState(false);
  const [selectedInsights, setSelectedInsights] = useState<any>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const data = await jobsApi.list();
        setJobs(data);
        if (data.length > 0) {
          setSelectedJobId(data[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch jobs:', err);
      }
    };
    fetchJobs();
  }, []);

  const fetchRankings = async (jobId: number) => {
    setIsLoading(true);
    try {
      const data = await rankingsApi.getByJob(jobId);
      setRankings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedJobId) {
      fetchRankings(Number(selectedJobId));
    }
  }, [selectedJobId]);

  const handleRecalculate = async () => {
    if (!selectedJobId) return;
    setIsRecalculating(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`http://localhost:8000/api/rankings/calculate/${selectedJobId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchRankings(Number(selectedJobId));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleOpenInsights = async (candidateId: number, jobId: number) => {
    setInsightsLoading(true);
    setInsightsModalOpen(true);
    setSelectedInsights(null);
    try {
      const salary = await predictions.salary(candidateId, jobId);
      const offer = await predictions.offerAcceptance(candidateId, jobId, 80000);
      const attrition = await predictions.attrition(candidateId, jobId);
      setSelectedInsights({ salary, offer, attrition });
    } catch (err) {
      console.error('Failed to fetch insights', err);
    } finally {
      setInsightsLoading(false);
    }
  };

  const getRankBadge = (idx: number) => {
    switch (idx) {
      case 0:
        return 'bg-amber-400/10 border-amber-400/30 text-amber-400'; // Gold
      case 1:
        return 'bg-slate-300/10 border-slate-300/30 text-slate-300'; // Silver
      case 2:
        return 'bg-amber-700/10 border-amber-700/30 text-amber-600'; // Bronze
      default:
        return 'bg-white/5 border-white/10 text-slate-500';
    }
  };

  const getRankIcon = (idx: number) => {
    switch (idx) {
      case 0:
        return <Star className="w-4 h-4 fill-amber-400 text-amber-400" />;
      case 1:
        return <Award className="w-4 h-4 text-slate-300" />;
      case 2:
        return <Trophy className="w-4 h-4 text-amber-600" />;
      default:
        return <span className="font-bold text-xs">{idx + 1}</span>;
    }
  };

  const getRecColor = (rec: string) => {
    switch (rec) {
      case 'strong_hire':
        return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
      case 'hire':
        return 'text-teal-400 border-teal-500/20 bg-teal-500/5';
      case 'maybe':
        return 'text-amber-400 border-amber-500/20 bg-amber-500/5';
      default:
        return 'text-rose-400 border-rose-500/20 bg-rose-500/5';
    }
  };

  const listContainerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 25 } }
  };

  return (
    <AuthGuard requiredRole="hr">
      <div className="min-h-screen bg-[#020208]">
        <Sidebar />
        <div className="lg:pl-[280px] flex flex-col min-h-screen">
          <Header title="Candidate Leaderboards" />
          <main className="flex-1 p-6 lg:p-8 space-y-6">
            
            {/* Filter & Action Row */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-[#070715]/40 border border-white/[0.06] backdrop-blur-md rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Briefcase className="w-4.5 h-4.5 text-indigo-400 shrink-0" />
                <div className="relative w-full sm:w-80">
                  <select
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-4 py-3 text-xs font-semibold text-slate-200 outline-none appearance-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    <option value="">Select a job posting...</option>
                    {jobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.title} ({job.company || 'AI Hiring'})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-4 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
              </div>

              {selectedJobId && (
                <Button
                  onClick={handleRecalculate}
                  isLoading={isRecalculating}
                  variant="primary"
                  className="flex items-center gap-2 w-full sm:w-auto justify-center px-6 py-3 text-xs font-bold uppercase tracking-wider relative overflow-hidden"
                >
                  <RefreshCw className={`w-4 h-4 ${isRecalculating && 'animate-spin'}`} />
                  <span>Recalculate Leaderboard</span>
                </Button>
              )}
            </div>

            {/* Rankings Table Card */}
            <GlassCard className="p-6 border border-white/[0.08] overflow-hidden">
              <div className="flex items-center justify-between mb-6 border-b border-white/[0.04] pb-4">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4.5 h-4.5 text-indigo-400" />
                  <h3 className="text-xs uppercase font-extrabold text-slate-400 tracking-widest">Ranked Applicants</h3>
                </div>
                <span className="text-[10px] text-slate-500 font-bold uppercase">{rankings.length} candidates evaluated</span>
              </div>

              {isLoading ? (
                <div className="space-y-4 py-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-16 rounded-xl bg-white/[0.01] border border-white/[0.05] shimmer" />
                  ))}
                </div>
              ) : rankings.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                      <tr className="border-b border-white/[0.04] text-slate-500 text-[9px] uppercase font-bold tracking-widest">
                        <th className="pb-3.5 w-14 text-center">Rank</th>
                        <th className="pb-3.5 pl-4">Candidate</th>
                        <th className="pb-3.5 text-center">Resume Ingest</th>
                        <th className="pb-3.5 text-center">Skill Taxonomy</th>
                        <th className="pb-3.5 text-center">Work Experience</th>
                        <th className="pb-3.5 text-center">AI Interview</th>
                        <th className="pb-3.5 text-center">Overall</th>
                        <th className="pb-3.5 text-center">Recommendation</th>
                        <th className="pb-3.5 text-center">AI Insights</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                      {rankings.map((r, idx) => (
                        <tr key={`${r.candidate_id}-${idx}`} className="hover:bg-white/[0.01] transition-all duration-200 group">
                          {/* Rank Medal */}
                          <td className="py-4 text-center">
                            <div className="flex justify-center">
                              <span className={`inline-flex w-7.5 h-7.5 rounded-lg border items-center justify-center font-extrabold shadow-md transition-all group-hover:scale-105 ${getRankBadge(idx)}`}>
                                {getRankIcon(idx)}
                              </span>
                            </div>
                          </td>

                          {/* Candidate details */}
                          <td className="py-4 pl-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500/10 to-purple-500/5 text-indigo-400 font-extrabold text-xs flex items-center justify-center border border-indigo-500/20 shadow-inner">
                                {r.candidate_name ? r.candidate_name.charAt(0).toUpperCase() : 'U'}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-bold text-slate-200 truncate max-w-[150px]">{r.candidate_name}</span>
                                <span className="text-[9px] text-slate-500 uppercase font-bold mt-0.5 tracking-wider truncate max-w-[150px]">{r.current_title || 'Software Developer'}</span>
                              </div>
                            </div>
                          </td>

                          {/* Resume Score */}
                          <td className="py-4 text-center">
                            <span className="text-xs font-bold text-slate-300">{r.resume_score}%</span>
                          </td>

                          {/* Skill Match */}
                          <td className="py-4 text-center">
                            <span className="text-xs font-bold text-slate-300">{r.skill_match_score}%</span>
                          </td>

                          {/* Experience */}
                          <td className="py-4 text-center">
                            <span className="text-xs font-bold text-slate-300">{r.experience_score}%</span>
                          </td>

                          {/* Interview */}
                          <td className="py-4 text-center">
                            <span className="text-xs font-bold text-slate-300">
                              {r.interview_score ? `${r.interview_score}%` : 'N/A'}
                            </span>
                          </td>

                          {/* Overall Score */}
                          <td className="py-4">
                            <div className="flex justify-center">
                              <ProgressRing value={r.overall_score} size={42} strokeWidth={4} />
                            </div>
                          </td>

                          {/* Recommendation badge */}
                          <td className="py-4">
                            <div className="flex justify-center">
                              <span className={`px-3 py-1 rounded-full border text-[9px] font-bold uppercase tracking-widest ${getRecColor(r.recommendation)}`}>
                                {r.recommendation?.replace('_', ' ')}
                              </span>
                            </div>
                          </td>

                          {/* AI Insights */}
                          <td className="py-4 text-center">
                            <div className="flex justify-center">
                              <Button variant="secondary" size="sm" onClick={() => handleOpenInsights(r.candidate_id, r.job_id)} className="bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20">
                                <Sparkles className="w-4 h-4 mr-1.5" /> Insights
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-16 text-slate-500 text-xs font-semibold">
                  No rankings computed for this job yet. Click "Recalculate Leaderboard" to match applicants.
                </div>
              )}
            </GlassCard>

          </main>
        </div>
      </div>

      {/* Insights Modal */}
      <AnimatePresence>
        {insightsModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setInsightsModalOpen(false)}
              className="fixed inset-0 bg-black z-50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-[#0a0a1a] border border-white/10 p-6 rounded-2xl z-50 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" /> AI Candidate Insights
                </h2>
                <button onClick={() => setInsightsModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {insightsLoading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-4">
                  <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                  <p className="text-sm text-slate-400">Analyzing ML Prediction models...</p>
                </div>
              ) : selectedInsights ? (
                <div className="space-y-6">
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <h4 className="text-sm font-semibold text-slate-300 mb-2">Predicted Expected Salary</h4>
                    <div className="flex items-end gap-2">
                      <span className="text-2xl font-bold text-emerald-400">
                        ${selectedInsights.salary.predicted_salary?.toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-500 mb-1">/ year</span>
                    </div>
                  </div>

                  <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <h4 className="text-sm font-semibold text-slate-300 mb-2">Offer Acceptance Probability</h4>
                    <div className="flex items-center gap-4">
                      <ProgressRing value={selectedInsights.offer.probability * 100} size={50} strokeWidth={4} />
                      <div className="flex-1">
                        <p className="text-sm text-slate-400">Based on a hypothetical $80,000 offer and fit score.</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <h4 className="text-sm font-semibold text-slate-300 mb-2">Attrition Risk</h4>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        selectedInsights.attrition.risk_level === 'High' ? 'bg-rose-500/20 text-rose-400' :
                        selectedInsights.attrition.risk_level === 'Medium' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {selectedInsights.attrition.risk_level} Risk
                      </span>
                      <span className="text-sm text-slate-400">Score: {(selectedInsights.attrition.risk_score * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-red-400">Failed to load insights.</p>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AuthGuard>
  );
}
