'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, TrendingDown, Target } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import AuthGuard from '@/components/layout/AuthGuard';
import GlassCard from '@/components/ui/GlassCard';
import { skills as skillsApi, jobs as jobsApi } from '@/lib/api/endpoints';
import type { CandidateSkill, Job } from '@/types';

export default function SkillGapPage() {
  const [candidateSkills, setCandidateSkills] = useState<CandidateSkill[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [skillsData, jobsData] = await Promise.all([
          skillsApi.list(), // using list for demo; in real usage, fetch for specific candidate
          jobsApi.list()
        ]);
        setCandidateSkills(skillsData as any); // mock mapping
        setJobs(jobsData);
        if (jobsData.length > 0) setSelectedJobId(jobsData[0].id);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const selectedJob = jobs.find(j => j.id === selectedJobId);
  const requiredSkills = selectedJob?.required_skills ? selectedJob.required_skills.split(',').map(s => s.trim()) : [];
  
  // Mock skill gap analysis
  const missingSkills = requiredSkills.filter(req => !candidateSkills.some(cs => cs.skill_name?.toLowerCase() === req.toLowerCase() || (cs as any).name?.toLowerCase() === req.toLowerCase()));

  return (
    <AuthGuard requiredRole="candidate">
      <div className="min-h-screen bg-[#020208]">
        <Sidebar />
        <div className="lg:pl-[280px] flex flex-col min-h-screen">
          <Header title="Skill Gap Analysis" />
          <main className="flex-1 p-6 lg:p-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8 text-slate-200"
            >
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-[#070715]/40 border border-white/[0.06] backdrop-blur-md rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Target className="w-4.5 h-4.5 text-indigo-400 shrink-0" />
                  <div className="relative w-full sm:w-80">
                    <select
                      value={selectedJobId}
                      onChange={(e) => setSelectedJobId(e.target.value ? Number(e.target.value) : '')}
                      className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-4 py-3 text-xs font-semibold text-slate-200 outline-none appearance-none focus:ring-2 focus:ring-indigo-500/50"
                    >
                      {jobs.map((job) => (
                        <option key={job.id} value={job.id}>{job.title}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <GlassCard className="p-6 border border-white/[0.08]">
                <h1 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-50 via-indigo-200 to-indigo-400 mb-6">
                  Gap Analysis Report
                </h1>
                
                {loading ? (
                  <p className="text-slate-400">Analyzing skills...</p>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-400" /> Possessed Skills
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {requiredSkills.filter(req => candidateSkills.some(cs => cs.skill_name?.toLowerCase() === req.toLowerCase() || (cs as any).name?.toLowerCase() === req.toLowerCase())).map(skill => (
                          <span key={skill} className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-rose-400" /> Missing Required Skills
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {missingSkills.length > 0 ? missingSkills.map(skill => (
                          <span key={skill} className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            {skill}
                          </span>
                        )) : (
                          <span className="text-sm text-emerald-400 font-semibold">Perfect Match! No missing skills.</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
