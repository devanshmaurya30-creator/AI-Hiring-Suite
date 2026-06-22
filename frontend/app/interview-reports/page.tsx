'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, CheckCircle2, XCircle } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import AuthGuard from '@/components/layout/AuthGuard';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import { interviews } from '@/lib/api/endpoints';
import type { Interview } from '@/types';

export default function InterviewReportsPage() {
  const [reports, setReports] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const data = await interviews.getAllReports();
      setReports(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard requiredRole="hr">
      <div className="min-h-screen bg-[#020208]">
        <Sidebar />
        <div className="lg:pl-[280px] flex flex-col min-h-screen">
          <Header title="Interview Reports" />
          <main className="flex-1 p-6 lg:p-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8 text-slate-200"
            >
              <GlassCard className="p-6 border border-white/[0.08]">
                <div className="flex items-center justify-between mb-6">
                  <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-50 via-indigo-200 to-indigo-400">
                    Generated Interview Reports
                  </h1>
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">{reports.length} Reports</span>
                </div>
                
                {loading ? (
                  <p className="text-slate-400">Loading reports...</p>
                ) : reports.length === 0 ? (
                  <p className="text-slate-400">No completed interviews yet.</p>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {reports.map((report) => (
                      <div key={report.id} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-indigo-500/30 transition-all group">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2 text-slate-300">
                            <FileText className="w-5 h-5 text-indigo-400" />
                            <span className="font-bold">Report #{report.id}</span>
                          </div>
                          <span className="text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/20">
                            Score: {report.total_score}/10
                          </span>
                        </div>
                        
                        <div className="space-y-2 mb-6">
                          <p className="text-xs text-slate-400"><span className="font-semibold text-slate-300">Type:</span> <span className="capitalize">{report.interview_type}</span></p>
                          <p className="text-xs text-slate-400"><span className="font-semibold text-slate-300">Date:</span> {report.completed_at ? new Date(report.completed_at).toLocaleDateString() : 'Unknown'}</p>
                          <p className="text-xs text-slate-400 line-clamp-3"><span className="font-semibold text-slate-300">Summary:</span> {report.feedback}</p>
                        </div>
                        
                        <Button variant="secondary" className="w-full text-xs font-bold uppercase tracking-wider flex justify-center">
                          <Download className="w-4 h-4 mr-2" /> Download PDF
                        </Button>
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
