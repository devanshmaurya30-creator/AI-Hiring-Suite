'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import ProgressRing from '@/components/ui/ProgressRing';

interface VoiceAnalyticsWidgetProps {
  data?: {
    voice_answers_submitted: number;
    average_voice_score: number;
    voice_vs_text_ratio: { voice: number; text: number };
  };
}

export default function VoiceAnalyticsWidget({ data }: VoiceAnalyticsWidgetProps) {
  const averageScore = data?.average_voice_score ?? 78.5;
  const submissions = data?.voice_answers_submitted ?? 18;
  const ratio = data?.voice_vs_text_ratio ?? { voice: 18, text: 32 };

  const chartData = [
    { name: 'Voice Screening', value: ratio.voice, fill: '#8b5cf6' },
    { name: 'Standard Text', value: ratio.text, fill: '#475569' }
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const entry = payload[0].payload;
      return (
        <div className="bg-slate-950/90 backdrop-blur-md border border-white/10 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-200 shadow-xl">
          <p style={{ color: entry.fill }} className="font-bold">{entry.name}</p>
          <p className="mt-1">Count: <span className="text-slate-100 font-extrabold">{entry.value} submissions</span></p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
      {/* Metrics Row */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4 p-3 bg-slate-950/40 border border-white/5 rounded-xl shadow-inner">
          <div className="shrink-0">
            <ProgressRing value={averageScore} size={64} strokeWidth={5} />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Average Voice Score</span>
            <span className="text-lg font-black text-slate-200 mt-0.5">{averageScore}%</span>
            <span className="text-[10px] text-slate-500 font-semibold mt-0.5">Whisper & Gemini Evaluated</span>
          </div>
        </div>

        <div className="flex flex-col p-3 bg-slate-950/40 border border-white/5 rounded-xl shadow-inner text-xs">
          <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Screening Activity</span>
          <div className="flex justify-between mt-2.5">
            <span className="text-slate-400 font-semibold">Total Audios:</span>
            <span className="text-slate-200 font-bold">{submissions} logs</span>
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-slate-400 font-semibold">Completion Rate:</span>
            <span className="text-slate-200 font-bold">
              {ratio.voice + ratio.text > 0 ? Math.round((ratio.voice / (ratio.voice + ratio.text)) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Chart Column */}
      <div className="w-full h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
            <Bar dataKey="value" barSize={25} radius={[6, 6, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
