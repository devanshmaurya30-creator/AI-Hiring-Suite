'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Briefcase, 
  MessageSquare, 
  Target, 
  Trophy, 
  Clock, 
  CheckCircle2, 
  ShieldAlert, 
  Send, 
  Sparkles, 
  TrendingUp, 
  AlertTriangle,
  Fingerprint,
  Download
} from 'lucide-react';
import { useDashboardStore } from '@/lib/store/dashboardStore';
import { offers } from '@/lib/api/endpoints';
import StatCard from '@/components/ui/StatCard';
import GlassCard from '@/components/ui/GlassCard';
import ProgressRing from '@/components/ui/ProgressRing';
import Button from '@/components/ui/Button';
import dynamic from 'next/dynamic';
import CountUp from 'react-countup';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

// Dynamically import heavy chart components
const FunnelChart = dynamic(() => import('@/components/charts/FunnelChart'), { ssr: false });
const SkillRadar = dynamic(() => import('@/components/charts/SkillRadar'), { ssr: false });
const MatchChart = dynamic(() => import('@/components/charts/MatchChart'), { ssr: false });
const PipelineBoard = dynamic(() => import('@/components/dashboard/PipelineBoard'), { ssr: false });
const EmotionChart = dynamic(() => import('@/components/charts/EmotionChart'), { ssr: false });
const VoiceAnalyticsWidget = dynamic(() => import('@/components/charts/VoiceAnalyticsWidget'), { ssr: false });

export default function HRDashboard() {
  const { stats, analytics, isLoading, fetchStats, fetchAnalytics } = useDashboardStore();

  // Offer Form State
  const [candidateIdInput, setCandidateIdInput] = useState('');
  const [jobIdInput, setJobIdInput] = useState('');
  const [salaryInput, setSalaryInput] = useState('');
  const [offerSending, setOfferSending] = useState(false);
  const [offerSuccess, setOfferSuccess] = useState<string | null>(null);
  const [offerError, setOfferError] = useState<string | null>(null);
  const [activeFraudTab, setActiveFraudTab] = useState<'alerts' | 'suspicious' | 'duplicates' | 'trends'>('alerts');

  useEffect(() => {
    fetchStats();
    fetchAnalytics();
  }, [fetchStats, fetchAnalytics]);

  const handleSendOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setOfferSuccess(null);
    setOfferError(null);
    if (!candidateIdInput || !jobIdInput || !salaryInput) {
      setOfferError('Please fill in all offer details.');
      return;
    }
    setOfferSending(true);
    try {
      await offers.create({
        candidate_id: parseInt(candidateIdInput),
        job_id: parseInt(jobIdInput),
        salary_offered: salaryInput,
      });
      setOfferSuccess('Offer successfully sent to candidate.');
      setCandidateIdInput('');
      setJobIdInput('');
      setSalaryInput('');
      fetchAnalytics(); // Refresh funnel metrics
    } catch (err: any) {
      console.error(err);
      setOfferError(err.response?.data?.detail || 'Failed to dispatch offer. Verify IDs exist.');
    } finally {
      setOfferSending(false);
    }
  };

  const handleExportCSV = () => {
    if (!stats || !stats.top_candidates) return;
    
    // Create CSV header
    let csvContent = 'Candidate ID,Candidate Name,Job Title,Overall Score,Recommendation\n';
    
    // Add rows
    stats.top_candidates.forEach(cand => {
      const row = [
        cand.candidate_id,
        `"${cand.candidate_name || ''}"`,
        `"${cand.job_title || ''}"`,
        cand.overall_score,
        `"${cand.recommendation || ''}"`
      ].join(',');
      csvContent += row + '\n';
    });

    // Create Blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `hr_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
  };

  if (isLoading || !stats || !analytics) {
    return (
      <div className="space-y-6">
        {/* Loading Skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-white/[0.01] border border-white/[0.05] shimmer" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 rounded-2xl bg-white/[0.01] border border-white/[0.05] shimmer" />
          <div className="h-80 rounded-2xl bg-white/[0.01] border border-white/[0.05] shimmer" />
        </div>
      </div>
    );
  }

  const totalCand = stats.total_candidates ?? 0;
  const totalJobs = stats.total_jobs ?? 0;
  const interviewsConducted = stats.interviews_conducted ?? 0;
  const avgMatch = stats.avg_match_score ?? 0;
  const topCandidates = stats.top_candidates || [];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 text-slate-200"
    >
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.03] pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-50 via-slate-100 to-cyan-200 tracking-tight">
            Recruitment Command Center
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-wider">
            Automated intelligence & candidate evaluations
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            onClick={handleExportCSV}
            variant="secondary"
            size="sm"
            className="flex items-center gap-2 text-xs font-bold text-slate-300 bg-slate-900/50 border border-white/10 hover:bg-slate-800/80 px-4 py-2"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </Button>
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 rounded-xl shadow-inner hidden md:flex">
            <Sparkles className="w-4 h-4" />
            <span>REAL-TIME ENGINE ONLINE</span>
          </div>
        </div>
      </div>

      {/* Top StatCards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <motion.div variants={itemVariants}>
          <StatCard
            title="Total Candidates"
            value={totalCand}
            subtitle="Registered applicants"
            icon={Users}
            gradient="from-blue-600/40 via-cyan-600/30 to-transparent border border-white/[0.05]"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            title="Active Jobs"
            value={totalJobs}
            subtitle="Open job postings"
            icon={Briefcase}
            gradient="from-blue-600/40 via-cyan-600/30 to-transparent border border-white/[0.05]"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            title="Interviews"
            value={interviewsConducted}
            subtitle="Conducted sessions"
            icon={MessageSquare}
            gradient="from-cyan-600/40 via-sky-600/30 to-transparent border border-white/[0.05]"
          />
        </motion.div>
        
        {/* StatCard with Center ProgressRing */}
        <motion.div variants={itemVariants}>
          <GlassCard className="p-5 flex flex-col justify-between h-32 relative overflow-hidden group border border-white/[0.08]" animate={false}>
            <div className="flex flex-col justify-between h-full">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block mb-1">
                  Avg Match Score
                </span>
                <span className="block text-3xl font-black text-slate-100 tracking-tight">
                  <CountUp end={avgMatch} duration={1.8} suffix="%" />
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-semibold block">Across all jobs</span>
            </div>
            <div className="absolute right-5 top-1/2 transform -translate-y-1/2">
              <ProgressRing value={avgMatch} size={68} strokeWidth={6} />
            </div>
          </GlassCard>
        </motion.div>

        <motion.div variants={itemVariants}>
          <StatCard
            title="Top Fit Rate"
            value={`${topCandidates.length > 0 ? Math.round(topCandidates[0].overall_score) : 88}%`}
            subtitle="Best match score"
            icon={Trophy}
            gradient="from-amber-600/40 via-orange-600/30 to-transparent border border-white/[0.05]"
          />
        </motion.div>
      </div>

      {/* Second Row: Funnel & Skill Radars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={itemVariants}>
          <GlassCard className="p-6 border border-white/[0.08]" animate={false}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs uppercase font-extrabold text-slate-400 tracking-widest">Hiring Funnel</h3>
              <span className="text-[10px] text-slate-500 font-bold uppercase">Conversion analysis</span>
            </div>
            <FunnelChart data={analytics.hiring_funnel} />
          </GlassCard>
        </motion.div>

        <motion.div variants={itemVariants}>
          <GlassCard className="p-6 border border-white/[0.08]" animate={false}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs uppercase font-extrabold text-slate-400 tracking-widest">Skill Distribution</h3>
              <span className="text-[10px] text-slate-500 font-bold uppercase">Core taxonomies</span>
            </div>
            <SkillRadar data={analytics.skill_distribution} />
          </GlassCard>
        </motion.div>
      </div>

      {/* Pipeline Board */}
      <motion.div variants={itemVariants} className="w-full">
        <PipelineBoard />
      </motion.div>

      {/* Third Row: Score distribution & top candidates */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Histogram */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <GlassCard className="p-6 border border-white/[0.08]" animate={false}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs uppercase font-extrabold text-slate-400 tracking-widest">Match Score Distribution</h3>
              <span className="text-[10px] text-slate-500 font-bold uppercase">Candidate density</span>
            </div>
            <MatchChart data={analytics.match_score_distribution} />
          </GlassCard>
        </motion.div>

        {/* Top Candidates list */}
        <motion.div variants={itemVariants}>
          <GlassCard className="p-6 border border-white/[0.08] flex flex-col justify-between" animate={false}>
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs uppercase font-extrabold text-slate-400 tracking-widest">Top Matches</h3>
                <span className="text-[10px] text-cyan-400 font-bold uppercase">Leaderboard</span>
              </div>
              
              <div className="space-y-3.5">
                {topCandidates.length > 0 ? (
                  topCandidates.slice(0, 4).map((cand, idx) => (
                    <div key={`${cand.candidate_id || idx}-${idx}`} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.01] border border-white/[0.04] hover:border-white/[0.1] hover:bg-white/[0.03] transition-all duration-300">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 font-extrabold text-xs flex items-center justify-center border border-blue-500/20 shadow-md">
                          {cand.candidate_name ? cand.candidate_name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-slate-200 truncate">{cand.candidate_name}</span>
                          <span className="text-[9px] text-slate-500 uppercase font-extrabold tracking-wider truncate max-w-[120px]">{cand.job_title}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <ProgressRing value={cand.overall_score} size={32} strokeWidth={3} />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500 text-xs font-semibold">
                    No matches evaluated yet.
                  </div>
                )}
              </div>
            </div>
            
            <div className="pt-4 border-t border-white/[0.04] flex items-center justify-between text-slate-500">
              <span className="text-[9px] font-bold uppercase tracking-widest">
                Security: Enabled
              </span>
              <span className="text-[9px] font-bold uppercase tracking-widest">
                DB: SQlite
              </span>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* Fifth Row: Emotion Analytics & Voice Interview Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={itemVariants}>
          <GlassCard className="p-6 border border-white/[0.08]" animate={false}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs uppercase font-extrabold text-slate-400 tracking-widest">Candidate Facial Expression Analysis</h3>
              <span className="text-[10px] text-slate-500 font-bold uppercase">Emotion logs</span>
            </div>
            <EmotionChart data={analytics.emotion_analytics} />
          </GlassCard>
        </motion.div>

        <motion.div variants={itemVariants}>
          <GlassCard className="p-6 border border-white/[0.08]" animate={false}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs uppercase font-extrabold text-slate-400 tracking-widest">Voice Screening Performance</h3>
              <span className="text-[10px] text-slate-500 font-bold uppercase">Whisper transcribe metrics</span>
            </div>
            <VoiceAnalyticsWidget data={analytics.voice_interview_analytics} />
          </GlassCard>
        </motion.div>
      </div>

      {/* Fourth Row: Security / Fraud Logs & Offer dispatcher */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fraud Log Widget */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <GlassCard className="p-6 border border-white/[0.08] flex flex-col justify-between" animate={false}>
            <div>
              {/* Tab Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 border-b border-white/[0.04] pb-4">
                <div className="flex items-center gap-2">
                  <Fingerprint className="w-5 h-5 text-red-400/80 drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
                  <h3 className="text-xs uppercase font-extrabold text-slate-400 tracking-widest">Recruiter Integrity Center</h3>
                </div>
                <div className="flex flex-wrap gap-1 bg-slate-950/40 p-0.5 rounded-lg border border-white/5">
                  {(['alerts', 'suspicious', 'duplicates', 'trends'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveFraudTab(tab)}
                      className={`text-[9px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md transition-all ${
                        activeFraudTab === tab
                          ? 'bg-red-500/20 text-red-400 border border-red-500/10'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab 1: Active Alerts list */}
              {activeFraudTab === 'alerts' && (
                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                  {analytics.fraud_alerts && analytics.fraud_alerts.length > 0 ? (
                    analytics.fraud_alerts.map((log, idx) => (
                      <div key={`${log.id}-${idx}`} className="p-3.5 rounded-xl bg-slate-950/30 border border-red-500/10 hover:border-red-500/20 flex items-start gap-3.5 hover:bg-slate-950/50 transition-all duration-300">
                        <AlertTriangle className="w-4.5 h-4.5 text-red-400/80 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-200">{log.candidate_name}</span>
                            <span className="text-[9px] font-bold text-red-400 px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20">
                              Score: {log.fraud_score}%
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed font-light">{log.reason}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-500 text-xs font-semibold">
                      No integrity alerts logged.
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Suspicious Candidates list */}
              {activeFraudTab === 'suspicious' && (
                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                  {analytics.suspicious_candidates && analytics.suspicious_candidates.length > 0 ? (
                    analytics.suspicious_candidates.map((cand, idx) => (
                      <div key={`${cand.candidate_id}-${idx}`} className="p-3.5 rounded-xl bg-slate-950/30 border border-white/5 flex flex-col gap-2.5 hover:bg-slate-950/50 transition-all duration-300">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-200">{cand.name} (ID: {cand.candidate_id})</span>
                          <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded border ${
                            cand.risk_level === 'Critical Risk' ? 'bg-red-500/20 text-red-400 border-red-500/20' :
                            cand.risk_level === 'High Risk' ? 'bg-orange-500/20 text-orange-400 border-orange-500/20' :
                            cand.risk_level === 'Medium Risk' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20' :
                            'bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                          }`}>
                            {cand.risk_level} ({cand.fraud_score}%)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-light leading-relaxed">{cand.explanation}</p>
                        <div className="text-[10px] font-semibold text-red-400/80 bg-red-500/5 p-2 rounded-lg border border-red-500/5">
                          Action: {cand.recommended_action}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-500 text-xs font-semibold">
                      No suspicious candidates found.
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Duplicate Resume Stats & Heatmap */}
              {activeFraudTab === 'duplicates' && (
                <div className="space-y-4 max-h-[280px] overflow-y-auto pr-1">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-950/40 p-3 rounded-xl border border-white/5 flex flex-col justify-between">
                      <span className="text-[9px] uppercase font-bold text-slate-500">Dup Emails</span>
                      <span className="text-lg font-bold text-red-400 mt-1">{analytics.duplicate_resume_analytics?.duplicate_emails ?? 0}</span>
                    </div>
                    <div className="bg-slate-950/40 p-3 rounded-xl border border-white/5 flex flex-col justify-between">
                      <span className="text-[9px] uppercase font-bold text-slate-500">Dup Phones</span>
                      <span className="text-lg font-bold text-red-400 mt-1">{analytics.duplicate_resume_analytics?.duplicate_phones ?? 0}</span>
                    </div>
                    <div className="bg-slate-950/40 p-3 rounded-xl border border-white/5 flex flex-col justify-between">
                      <span className="text-[9px] uppercase font-bold text-slate-500">LinkedIn Clones</span>
                      <span className="text-lg font-bold text-red-400 mt-1">{analytics.duplicate_resume_analytics?.duplicate_linkedins ?? 0}</span>
                    </div>
                    <div className="bg-slate-950/40 p-3 rounded-xl border border-white/5 flex flex-col justify-between">
                      <span className="text-[9px] uppercase font-bold text-slate-500">GitHub Clones</span>
                      <span className="text-lg font-bold text-red-400 mt-1">{analytics.duplicate_resume_analytics?.duplicate_githubs ?? 0}</span>
                    </div>
                  </div>

                  <div className="border-t border-white/[0.04] pt-3">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block mb-2">Resume Overlap Matrix</span>
                    <div className="space-y-2">
                      {analytics.candidate_similarity_heatmap && analytics.candidate_similarity_heatmap.length > 0 ? (
                        analytics.candidate_similarity_heatmap.slice(0, 4).map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/30 border border-white/5 text-[10px]">
                            <span className="text-slate-300 truncate max-w-[200px]">{item.candidate_1} ⇄ {item.candidate_2}</span>
                            <span className="text-red-400 font-bold px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20">{item.similarity}% duplicate match</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4 text-slate-500 text-xs font-semibold">
                          No duplicate profile segments detected.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Trend Charts */}
              {activeFraudTab === 'trends' && (
                <div className="w-full h-64 p-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.fraud_trend_charts ?? []} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="alertGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" stroke="#475569" fontSize={9} tickLine={false} axisLine={false} />
                      <YAxis stroke="#475569" fontSize={9} tickLine={false} axisLine={false} />
                      <RechartsTooltip contentStyle={{ background: '#0B1020', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '10px', color: '#fff' }} />
                      <Area type="monotone" dataKey="alerts" stroke="#ef4444" fillOpacity={1} fill="url(#alertGrad)" name="Total Alerts" />
                      <Area type="monotone" dataKey="critical" stroke="#f97316" fillOpacity={0} name="Critical Alerts" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>

        {/* Offer Dispatcher & Conversion Ring */}
        <motion.div variants={itemVariants}>
          <GlassCard className="p-6 border border-white/[0.08] flex flex-col justify-between" animate={false}>
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs uppercase font-extrabold text-slate-400 tracking-widest">Offer Dispatcher</h3>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Conversion:</span>
                  <span className="text-xs font-extrabold text-emerald-400">{analytics.offer_conversion_rate || 75}%</span>
                </div>
              </div>

              <form onSubmit={handleSendOffer} className="space-y-4">
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Candidate ID
                  </label>
                  <input
                    type="number"
                    value={candidateIdInput}
                    onChange={(e) => setCandidateIdInput(e.target.value)}
                    placeholder="e.g. 1"
                    className="w-full px-3.5 py-3 rounded-xl bg-slate-950/40 border border-white/5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/40 focus:bg-slate-950/60 transition-all font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Job ID
                  </label>
                  <input
                    type="number"
                    value={jobIdInput}
                    onChange={(e) => setJobIdInput(e.target.value)}
                    placeholder="e.g. 5"
                    className="w-full px-3.5 py-3 rounded-xl bg-slate-950/40 border border-white/5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/40 focus:bg-slate-950/60 transition-all font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Salary Offered
                  </label>
                  <input
                    type="text"
                    value={salaryInput}
                    onChange={(e) => setSalaryInput(e.target.value)}
                    placeholder="e.g. $125,000 / year"
                    className="w-full px-3.5 py-3 rounded-xl bg-slate-950/40 border border-white/5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/40 focus:bg-slate-950/60 transition-all font-semibold"
                    required
                  />
                </div>

                {offerSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 leading-normal">
                    {offerSuccess}
                  </div>
                )}

                {offerError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-[10px] font-bold text-red-400 leading-normal">
                    {offerError}
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  disabled={offerSending}
                  isLoading={offerSending}
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 border-cyan-500/20 text-white font-extrabold text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-lg border border-white/10"
                >
                  <Send className="w-3.5 h-3.5" />
                  Dispatch Offer
                </Button>
              </form>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </motion.div>
  );
}
