'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Calendar, Download, ChevronDown, CheckCircle2, MessageSquare, TrendingUp } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useDashboardStore } from '@/lib/store/dashboardStore';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import AuthGuard from '@/components/layout/AuthGuard';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import FunnelChart from '@/components/charts/FunnelChart';
import SkillRadar from '@/components/charts/SkillRadar';
import MatchChart from '@/components/charts/MatchChart';

export default function HiringAnalyticsPage() {
  const { stats, analytics, isLoading, fetchStats, fetchAnalytics } = useDashboardStore();
  const [dateRange, setDateRange] = useState('90');

  useEffect(() => {
    fetchStats();
    fetchAnalytics();
  }, [fetchStats, fetchAnalytics]);

  const handleExport = () => {
    alert('Exporting recruiting metrics as CSV...');
  };

  if (isLoading || !stats || !analytics) {
    return (
      <AuthGuard requiredRole="hr">
        <div className="min-h-screen bg-[#0a0a1a]">
          <Sidebar />
          <div className="lg:pl-[280px] flex flex-col min-h-screen">
            <Header title="Recruiting Analytics" />
            <main className="flex-1 p-6 lg:p-8 space-y-6">
              <div className="h-20 rounded-2xl bg-white/[0.02] border border-white/[0.08] shimmer" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-80 rounded-3xl bg-white/[0.02] border border-white/[0.08] shimmer" />
                ))}
              </div>
            </main>
          </div>
        </div>
      </AuthGuard>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/90 backdrop-blur-md border border-white/10 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-200 shadow-xl">
          <p className="text-slate-400">Month: <span className="text-slate-100 font-bold">{payload[0].payload.month}</span></p>
          <p className="text-indigo-400 mt-1">Applicants: <span className="font-extrabold">{payload[0].value}</span></p>
          <p className="text-pink-400 mt-0.5">Interviews: <span className="font-extrabold">{payload[1]?.value || 0}</span></p>
        </div>
      );
    }
    return null;
  };

  return (
    <AuthGuard requiredRole="hr">
      <div className="min-h-screen bg-[#0a0a1a]">
        <Sidebar />
        <div className="lg:pl-[280px] flex flex-col min-h-screen">
          <Header title="Recruiting Analytics" />
          <main className="flex-1 p-6 lg:p-8 space-y-6 text-slate-200">
            
            {/* Filter controls row */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white/[0.02] border border-white/[0.08] backdrop-blur-md rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-indigo-400 shrink-0" />
                <div className="relative w-44">
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-4 py-2 text-xs font-semibold text-slate-200 outline-none appearance-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    <option value="7">Last 7 Days</option>
                    <option value="30">Last 30 Days</option>
                    <option value="90">Last 90 Days</option>
                    <option value="all">All Time</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
              </div>

              <Button
                onClick={handleExport}
                variant="secondary"
                size="sm"
                className="flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                <Download className="w-4 h-4" />
                <span>Export Report</span>
              </Button>
            </div>

            {/* Funnel chart (Full width) */}
            <GlassCard className="p-6 border border-white/[0.08]">
              <h3 className="text-sm font-bold text-slate-100 mb-4 tracking-tight flex items-center gap-2">
                <BarChart3 className="w-4.5 h-4.5 text-indigo-400" />
                <span>Hiring Pipeline Conversion (Funnel)</span>
              </h3>
              <FunnelChart data={analytics.hiring_funnel} />
            </GlassCard>

            {/* Radar & Histogram distributions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GlassCard className="p-6 border border-white/[0.08]">
                <h3 className="text-sm font-bold text-slate-100 mb-4 tracking-tight">Top Skills Taxonomy</h3>
                <SkillRadar data={analytics.skill_distribution} />
              </GlassCard>

              <GlassCard className="p-6 border border-white/[0.08]">
                <h3 className="text-sm font-bold text-slate-100 mb-4 tracking-tight">Score Distribution Summary</h3>
                <MatchChart data={analytics.match_score_distribution} />
              </GlassCard>
            </div>

            {/* Trends and Interview specifics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Trends chart */}
              <GlassCard className="p-6 lg:col-span-2 border border-white/[0.08]">
                <h3 className="text-sm font-bold text-slate-100 mb-4 tracking-tight flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-400" />
                  <span>Applicant Growth & Interview Trends</span>
                </h3>
                <div className="w-full h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.hiring_trends} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCand" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorInt" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ec4899" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                      <XAxis dataKey="month" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} dy={8} />
                      <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} dx={-8} />
                      <ChartTooltip content={<CustomTooltip />} />
                      
                      <Area
                        type="monotone"
                        dataKey="candidates"
                        stroke="#818cf8"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorCand)"
                      />
                      <Area
                        type="monotone"
                        dataKey="interviews"
                        stroke="#f472b6"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorInt)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>

              {/* Interview analytics details */}
              <GlassCard className="p-6 border border-white/[0.08] flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 mb-4 tracking-tight">Interview Breakdown</h3>
                  <div className="space-y-4">
                    {/* Score detail */}
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                          <MessageSquare className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-200">Average Performance</span>
                          <span className="text-[10px] text-slate-500 font-semibold">Technical & HR overall</span>
                        </div>
                      </div>
                      <span className="text-sm font-extrabold text-indigo-400">
                        {analytics.interview_analytics?.avg_score || 72.5}%
                      </span>
                    </div>

                    {/* Technical sessions count */}
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-200">Technical Sessions</span>
                          <span className="text-[10px] text-slate-500 font-semibold">Coding, DB, and System Design</span>
                        </div>
                      </div>
                      <span className="text-sm font-extrabold text-emerald-400">
                        {analytics.interview_analytics?.by_type?.technical || 12}
                      </span>
                    </div>

                    {/* HR sessions count */}
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-pink-500/10 text-pink-400">
                          <MessageSquare className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-200">Behavioral (HR) Sessions</span>
                          <span className="text-[10px] text-slate-500 font-semibold">Cultural, situational fit</span>
                        </div>
                      </div>
                      <span className="text-sm font-extrabold text-pink-400">
                        {analytics.interview_analytics?.by_type?.hr || 8}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/[0.06] text-center text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                  Recruiter metrics synced
                </div>
              </GlassCard>
            </div>

          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
