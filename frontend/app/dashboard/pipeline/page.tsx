'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard } from 'lucide-react';
import AuthGuard from '@/components/layout/AuthGuard';
import PipelineBoard from '@/components/dashboard/PipelineBoard';

export default function PipelinePage() {
  return (
    <AuthGuard requiredRole="hr">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8 text-slate-200 h-full flex flex-col"
      >
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-[#050515]/40 border border-white/[0.08] backdrop-blur-2xl rounded-2xl p-6 shadow-xl">
          <div>
            <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-50 via-slate-100 to-cyan-200 tracking-tight flex items-center gap-3">
              <LayoutDashboard className="w-7 h-7 text-cyan-400" />
              Candidate Pipeline
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-2 uppercase tracking-wider">
              Drag and drop candidates across stages
            </p>
          </div>
        </div>

        {/* Pipeline Board */}
        <div className="flex-1 rounded-3xl bg-[#050515]/20 border border-white/[0.04] p-6 lg:p-8 overflow-hidden">
          <PipelineBoard />
        </div>
      </motion.div>
    </AuthGuard>
  );
}
