'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, Briefcase, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { schedules } from '@/lib/api/endpoints';
import type { InterviewSchedule } from '@/types';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import AuthGuard from '@/components/layout/AuthGuard';
import { useAuthStore } from '@/lib/store/authStore';

export default function SchedulePage() {
  const { user } = useAuthStore();
  const isHR = user?.role === 'hr';
  
  const [schedulesList, setSchedulesList] = useState<InterviewSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [form, setForm] = useState({
    candidate_id: '',
    job_id: '',
    scheduled_time: '',
    duration_minutes: '60',
    meeting_link: ''
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Edit / Reschedule state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTime, setEditTime] = useState('');

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const data = await schedules.list();
      setSchedulesList(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setSubmitting(true);
    try {
      await schedules.create({
        candidate_id: Number(form.candidate_id),
        job_id: form.job_id ? Number(form.job_id) : undefined,
        scheduled_time: new Date(form.scheduled_time).toISOString(),
        duration_minutes: Number(form.duration_minutes),
        meeting_link: form.meeting_link || undefined,
      });
      setMsg('Interview scheduled successfully. Invites sent.');
      setForm({ candidate_id: '', job_id: '', scheduled_time: '', duration_minutes: '60', meeting_link: '' });
      fetchSchedules();
    } catch (err: any) {
      setMsg(err.response?.data?.detail || 'Failed to schedule interview');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: number) => {
    if (!window.confirm('Are you sure you want to cancel this interview?')) return;
    try {
      await schedules.cancel(id);
      fetchSchedules();
    } catch (err) {
      console.error(err);
      alert('Failed to cancel');
    }
  };

  const handleReschedule = async (id: number) => {
    if (!editTime) return;
    try {
      await schedules.update(id, { scheduled_time: new Date(editTime).toISOString() });
      setEditingId(null);
      setEditTime('');
      fetchSchedules();
    } catch (err) {
      console.error(err);
      alert('Failed to reschedule');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#020208]">
        <Sidebar />
        <div className="lg:pl-[280px] flex flex-col min-h-screen">
          <Header title={isHR ? "Interview Management" : "My Schedule"} />
          <main className="flex-1 p-6 lg:p-8">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-8 text-slate-200"
            >
              {/* Header */}
              <GlassCard className="p-6 border border-white/[0.08] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-10">
                  <Calendar className="w-24 h-24 text-indigo-400" />
                </div>
                <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-50 via-indigo-200 to-indigo-400 relative z-10">
                  {isHR ? "Interview Scheduling" : "Upcoming Interviews"}
                </h1>
                <p className="text-xs text-slate-400 mt-1 relative z-10">
                  {isHR ? "Plan, view and manage upcoming interview sessions." : "View your upcoming interview times and meeting links."}
                </p>
              </GlassCard>

              {/* Create Schedule Form (HR Only) */}
              {isHR && (
                <GlassCard className="p-6 border border-white/[0.08]">
                  <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] font-bold uppercase text-slate-500 block mb-1">Candidate ID</label>
                      <input type="number" name="candidate_id" value={form.candidate_id} onChange={handleChange} required className="w-full px-3 py-2 rounded-xl bg-slate-950/40 border border-white/5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/40 focus:bg-slate-950/60" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase text-slate-500 block mb-1">Job ID (optional)</label>
                      <input type="number" name="job_id" value={form.job_id} onChange={handleChange} className="w-full px-3 py-2 rounded-xl bg-slate-950/40 border border-white/5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/40 focus:bg-slate-950/60" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[9px] font-bold uppercase text-slate-500 block mb-1">Scheduled Time</label>
                      <input type="datetime-local" name="scheduled_time" value={form.scheduled_time} onChange={handleChange} required className="w-full px-3 py-2 rounded-xl bg-slate-950/40 border border-white/5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/40 focus:bg-slate-950/60" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase text-slate-500 block mb-1">Duration (min)</label>
                      <input type="number" name="duration_minutes" value={form.duration_minutes} onChange={handleChange} min={1} className="w-full px-3 py-2 rounded-xl bg-slate-950/40 border border-white/5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/40 focus:bg-slate-950/60" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase text-slate-500 block mb-1">Meeting Link (optional)</label>
                      <input type="url" name="meeting_link" value={form.meeting_link} onChange={handleChange} placeholder="https://..." className="w-full px-3 py-2 rounded-xl bg-slate-950/40 border border-white/5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/40 focus:bg-slate-950/60" />
                    </div>
                    {msg && (
                      <div className="md:col-span-2 text-xs font-bold text-center" style={{ color: msg.includes('success') ? '#34D399' : '#F87171' }}>
                        {msg}
                      </div>
                    )}
                    <div className="md:col-span-2 flex justify-end">
                      <Button type="submit" variant="primary" disabled={submitting} isLoading={submitting} className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs uppercase tracking-widest">
                        <Clock className="w-4 h-4 mr-1" />
                        Schedule Interview
                      </Button>
                    </div>
                  </form>
                </GlassCard>
              )}

              {/* Upcoming Schedules */}
              <GlassCard className="p-6 border border-white/[0.08]">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-400" /> 
                  {isHR ? "All Master Schedules" : "Your Itinerary"}
                </h2>
                
                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                  </div>
                ) : schedulesList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-slate-500 p-6 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                    <Clock className="w-8 h-8 mb-3 opacity-50" />
                    <p className="text-sm font-bold">No interviews scheduled yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {schedulesList.map((s) => (
                      <div key={s.id} className="p-5 rounded-2xl bg-[#050515]/60 border border-white/5 hover:border-white/10 transition-colors flex flex-col lg:flex-row gap-4 justify-between lg:items-center">
                        <div className="space-y-1">
                          {isHR && (
                            <h3 className="text-sm font-extrabold text-slate-100">
                              {s.candidate?.full_name || `Candidate #${s.candidate_id}`}
                            </h3>
                          )}
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <Briefcase className="w-3 h-3" />
                            <span>{s.job ? s.job.title : 'General Interview'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-400 mt-2">
                            <Clock className="w-3 h-3 text-indigo-400" />
                            <span className="font-medium text-slate-200">
                              {new Date(s.scheduled_time).toLocaleString()} ({s.duration_minutes} min)
                            </span>
                          </div>
                          {s.meeting_link && (
                            <div className="mt-2 text-xs">
                              <a href={s.meeting_link} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline break-all">
                                Join Meeting
                              </a>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-3">
                          <span className={`px-3 py-1 rounded text-[10px] uppercase font-bold tracking-widest border ${
                            s.status === 'scheduled' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 
                            s.status === 'rescheduled' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            s.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}>
                            {s.status}
                          </span>

                          {isHR && s.status !== 'canceled' && s.status !== 'completed' && (
                            <div className="flex items-center gap-2">
                              {editingId === s.id ? (
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="datetime-local" 
                                    value={editTime}
                                    onChange={(e) => setEditTime(e.target.value)}
                                    className="px-2 py-1 bg-slate-900 border border-white/10 rounded text-xs text-slate-200"
                                  />
                                  <button onClick={() => handleReschedule(s.id)} className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs hover:bg-amber-500/30">Save</button>
                                  <button onClick={() => setEditingId(null)} className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-xs hover:bg-slate-700">Cancel</button>
                                </div>
                              ) : (
                                <>
                                  <button 
                                    onClick={() => { setEditingId(s.id); setEditTime(s.scheduled_time.slice(0, 16)); }} 
                                    className="p-2 bg-amber-500/10 text-amber-400 rounded-lg hover:bg-amber-500/20 transition-colors"
                                    title="Reschedule"
                                  >
                                    <RefreshCw className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleCancel(s.id)} 
                                    className="p-2 bg-rose-500/10 text-rose-400 rounded-lg hover:bg-rose-500/20 transition-colors"
                                    title="Cancel"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
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
