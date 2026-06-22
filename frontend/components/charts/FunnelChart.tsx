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

interface FunnelChartProps {
  data: {
    applied: number;
    screened: number;
    interviewed: number;
    offered: number;
    hired: number;
  };
}

export default function FunnelChart({ data }: FunnelChartProps) {
  // Map input object to vertical bar chart format
  const chartData = [
    { name: 'Applied', value: data?.applied ?? 120, fill: '#6366f1' },       // Indigo
    { name: 'Screened', value: data?.screened ?? 85, fill: '#8b5cf6' },      // Violet
    { name: 'Interviewed', value: data?.interviewed ?? 42, fill: '#a855f7' }, // Purple
    { name: 'Offered', value: data?.offered ?? 15, fill: '#ec4899' },        // Pink
    { name: 'Hired', value: data?.hired ?? 8, fill: '#10b981' },             // Emerald
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const entry = payload[0].payload;
      return (
        <div className="bg-slate-900/90 backdrop-blur-md border border-white/10 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-200 shadow-xl">
          <p style={{ color: entry.fill }} className="font-bold">{entry.name}</p>
          <p className="mt-1">Candidates: <span className="text-slate-100 font-extrabold">{entry.value}</span></p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-72 p-1">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 10, right: 30, left: 15, bottom: 0 }}
        >
          <XAxis type="number" stroke="#475569" fontSize={11} hide />
          <YAxis
            type="category"
            dataKey="name"
            stroke="#94a3b8" // slate-400
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={85}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
          
          <Bar dataKey="value" barSize={20} radius={[0, 6, 6, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
