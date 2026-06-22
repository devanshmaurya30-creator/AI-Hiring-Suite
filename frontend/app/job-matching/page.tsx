'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, RefreshCw, Cpu, Sparkles, HelpCircle, MapPin, Building } from 'lucide-react';
import { matching as matchingApi, skills as skillsApi } from '@/lib/api/endpoints';
import { useAuthStore } from '@/lib/store/authStore';
import type { MatchResult } from '@/types';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import AuthGuard from '@/components/layout/AuthGuard';
import GlassCard from '@/components/ui/GlassCard';
import ProgressRing from '@/components/ui/ProgressRing';
import SkillBadge from '@/components/ui/SkillBadge';
import Button from '@/components/ui/Button';

export default function JobMatchingPage() {
  const { user } = useAuthStore();
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [candidateSkills, setCandidateSkills] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMatching, setIsMatching] = useState(false);

  const fetchMatchesAndSkills = async () => {
    const token = localStorage.getItem('auth_token');
    try {
      setIsLoading(true);
      const meRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (meRes.ok) {
        const meData = await meRes.json();
        const candidateId = meData.candidate?.id;
        if (candidateId) {
          // Fetch existing matches
          const matchesData = await matchingApi.getCandidateMatches(candidateId);
          setMatches(matchesData);

          // Fetch skills
          const skillsData = await (skillsApi as any).getCandidateSkills ? await (skillsApi as any).getCandidateSkills(candidateId) : [];
          setCandidateSkills(skillsData);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMatchesAndSkills();
  }, []);

  const handleRunMatching = async () => {
    const token = localStorage.getItem('auth_token');
    try {
      setIsMatching(true);
      const meRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`, {

        headers: { Authorization: `Bearer ${token}` }
      });
      if (meRes.ok) {
        const meData = await meRes.json();
        const candidateId = meData.candidate?.id;
        if (candidateId) {
          await matchingApi.matchCandidate(candidateId);
          await fetchMatchesAndSkills();
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsMatching(false);
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
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 25 } },
  };

  return (
    <AuthGuard requiredRole="candidate">
      <div className="min-h-screen bg-[#020208]">
        <Sidebar />
        <div className="lg:pl-[280px] flex flex-col min-h-screen">
          <Header title="AI Opportunity Matcher" />
          <main className="flex-1 p-6 lg:p-8 grid grid-cols-1 xl:grid-cols-4 gap-6">
            
            {/* Left section: Matches list */}
            <div className="xl:col-span-3 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.03] pb-4">
                <div>
                  <h2 className="text-xs uppercase font-extrabold text-slate-400 tracking-widest">
                    Matching Job Recommendations
                  </h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Matched against active listings</p>
                </div>
                <Button
                  onClick={handleRunMatching}
                  isLoading={isMatching}
                  variant="primary"
                  className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider relative overflow-hidden"
                >
                  <RefreshCw className={`w-4 h-4 ${isMatching && 'animate-spin'}`} />
                  <span>Run AI Matcher Engine</span>
                </Button>
              </div>

              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-44 rounded-2xl bg-white/[0.01] border border-white/[0.05] shimmer" />
                  ))}
                </div>
              ) : matches.length > 0 ? (
                <motion.div 
                  variants={listContainerVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-5"
                >
                  {matches.map((match) => (
                    <motion.div key={match.job_id} variants={itemVariants}>
                      <GlassCard className="p-6 border border-white/[0.08] hover:border-white/[0.16] transition-all duration-300 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center relative group">
                        
                        {/* Hover back glow */}
                        <div className="absolute inset-0 bg-indigo-500/[0.01] group-hover:bg-indigo-500/[0.02] pointer-events-none transition-colors" />

                        <div className="flex-1 space-y-4 relative z-10 w-full">
                          {/* Title & Company */}
                          <div className="flex items-start gap-4">
                            <div className="p-3 rounded-xl bg-slate-950/40 border border-white/5 text-indigo-400 shadow-md">
                              <Briefcase className="w-5.5 h-5.5" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-base font-bold text-slate-100 group-hover:text-indigo-300 transition-colors truncate">
                                {match.job_title}
                              </h3>
                              <div className="flex flex-wrap items-center gap-3 text-slate-500 text-[10px] uppercase font-bold mt-1 tracking-wider">
                                <span className="flex items-center gap-1">
                                  <Building className="w-3 h-3 text-slate-600" />
                                  <span>{match.company}</span>
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-slate-600" />
                                  <span>{match.location || 'Remote'}</span>
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Gap analysis */}
                          <div className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light bg-slate-950/20 p-4 rounded-xl border border-white/5 shadow-inner">
                            {match.skill_gap_analysis}
                          </div>

                          {/* Skills breakdown */}
                          <div className="space-y-2.5">
                            {match.matched_skills?.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 items-center">
                                <span className="text-[9px] font-extrabold text-emerald-400 mr-2.5 uppercase tracking-wider shrink-0">Matched:</span>
                                <div className="flex flex-wrap gap-1">
                                  {match.matched_skills.map((s) => (
                                    <SkillBadge key={s} name={s} matched />
                                  ))}
                                </div>
                              </div>
                            )}
                            {match.missing_skills?.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 items-center">
                                <span className="text-[9px] font-extrabold text-rose-400 mr-2.5 uppercase tracking-wider shrink-0">Missing:</span>
                                <div className="flex flex-wrap gap-1">
                                  {match.missing_skills.map((s) => (
                                    <SkillBadge key={s} name={s} matched={false} />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right score ring & CTA */}
                        <div className="flex flex-row md:flex-col items-center justify-between md:justify-center gap-5 shrink-0 w-full md:w-40 border-t md:border-t-0 md:border-l border-white/[0.08] pt-4 md:pt-0 md:pl-6 relative z-10">
                          <div className="flex flex-col items-center gap-2">
                            <ProgressRing value={match.overall_score || match.match_percentage} size={74} strokeWidth={6} />
                            <span className="text-[8px] uppercase font-bold text-slate-500 tracking-widest">Suitability Fit</span>
                          </div>
                          
                          <span className={`px-3 py-1 rounded-full border text-[9px] font-bold uppercase tracking-widest text-center block ${getRecColor(match.recommendation)}`}>
                            {match.recommendation?.replace('_', ' ')}
                          </span>
                        </div>
                      </GlassCard>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <div className="text-center py-20 bg-white/[0.01] border border-white/[0.06] rounded-2xl text-slate-500 text-xs font-semibold">
                  No job matches calculated yet. Please click "Run AI Matcher Engine" above to analyze active postings.
                </div>
              )}
            </div>

            {/* Right section: Candidate skills summary */}
            <div className="xl:col-span-1">
              <GlassCard className="p-6 border border-white/[0.08] min-h-[400px] flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-6">
                    <Cpu className="w-4.5 h-4.5 text-indigo-400" />
                    <h3 className="text-xs uppercase font-extrabold text-slate-400 tracking-widest">
                      Your Skill Map
                    </h3>
                  </div>
                  
                  <div className="flex flex-wrap gap-1.5">
                    {candidateSkills.length > 0 ? (
                      candidateSkills.map((cs) => (
                        <SkillBadge
                          key={cs.skill_id}
                          name={cs.name}
                          proficiency={cs.proficiency_level}
                        />
                      ))
                    ) : (
                      <div className="text-slate-500 text-xs py-8">
                        No skills added yet. Go to{' '}
                        <Link href="/resume-upload" className="text-indigo-400 font-bold hover:underline">
                          Resume Upload
                        </Link>{' '}
                        to parse skills.
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-6 border-t border-white/[0.04] text-[9px] uppercase font-bold text-slate-500 tracking-widest">
                  Profile taxonomy synced
                </div>
              </GlassCard>
            </div>

          </main>
        </div>
      </div>
    </AuthGuard>
  );
}

// Fallback dynamic mapping if getCandidateSkills doesn't exist
if (!(skillsApi as any).getCandidateSkills) {
  (skillsApi as any).getCandidateSkills = (candId: number) => {
    return fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/skills/candidate/${candId}`).then((r) => r.json());
  };
}
