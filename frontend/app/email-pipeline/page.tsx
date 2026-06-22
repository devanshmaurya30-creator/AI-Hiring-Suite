'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, CheckCircle2, XCircle, Clock } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import AuthGuard from '@/components/layout/AuthGuard';
import GlassCard from '@/components/ui/GlassCard';
import { emails } from '@/lib/api/endpoints';
import type { EmailLog } from '@/types';

export default function EmailPipelinePage() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const data = await emails.getLogs();
      setLogs(data);
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
          <Header title="Email Pipeline" />
          <main className="flex-1 p-6 lg:p-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8 text-slate-200"
            >
              <GlassCard className="p-6 border border-white/[0.08]">
                <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-50 via-indigo-200 to-indigo-400 mb-6">
                  Email Communications Log
                </h1>
                
                {loading ? (
                  <p className="text-slate-400">Loading logs...</p>
                ) : logs.length === 0 ? (
                  <p className="text-slate-400">No emails have been sent yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-white/[0.05] border-b border-white/[0.08]">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Recipient</th>
                          <th className="px-4 py-3 font-semibold">Subject</th>
                          <th className="px-4 py-3 font-semibold">Type</th>
                          <th className="px-4 py-3 font-semibold">Status</th>
                          <th className="px-4 py-3 font-semibold">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.05]">
                        {logs.map((log) => (
                          <tr key={log.id} className="hover:bg-white/[0.02] transition">
                            <td className="px-4 py-4">{log.recipient_email}</td>
                            <td className="px-4 py-4 font-medium">{log.subject}</td>
                            <td className="px-4 py-4 capitalize">
                              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                {log.email_type.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              {log.status === 'sent' ? (
                                <span className="flex items-center text-emerald-400"><CheckCircle2 className="w-4 h-4 mr-1.5" /> Sent</span>
                              ) : log.status === 'failed' ? (
                                <span className="flex items-center text-rose-400"><XCircle className="w-4 h-4 mr-1.5" /> Failed</span>
                              ) : (
                                <span className="flex items-center text-amber-400"><Clock className="w-4 h-4 mr-1.5" /> Pending</span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-slate-400">
                              {new Date(log.created_at).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
