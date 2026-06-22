'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface MatchChartProps {
  data: { range: string; count: number }[];
}

export default function MatchChart({ data }: MatchChartProps) {
  // Safe default data
  const chartData = data && data.length > 0 ? data : [
    { range: '0-49', count: 2 },
    { range: '50-59', count: 5 },
    { range: '60-69', count: 14 },
    { range: '70-79', count: 25 },
    { range: '80-89', count: 18 },
    { range: '90-100', count: 6 },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/90 backdrop-blur-md border border-white/10 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-200 shadow-xl">
          <p className="text-slate-400">Score Range: <span className="text-indigo-400 font-bold">{payload[0].payload.range}</span></p>
          <p className="mt-1">Candidates: <span className="text-slate-100 font-bold">{payload[0].value}</span></p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-72 p-1">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
          <XAxis
            dataKey="range"
            stroke="#475569" // slate-600
            fontSize={11}
            tickLine={false}
            axisLine={false}
            dy={8}
          />
          <YAxis
            stroke="#475569"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            dx={-8}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
          
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill="url(#barGradient)"
                opacity={0.85 + (index % 2) * 0.15} // staggered opacity for aesthetics
              />
            ))}
          </Bar>

          {/* Define Gradient */}
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" /> {/* Indigo */}
              <stop offset="100%" stopColor="#c084fc" /> {/* Purple */}
            </linearGradient>
          </defs>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
