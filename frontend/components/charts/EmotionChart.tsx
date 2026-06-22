'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface EmotionChartProps {
  data?: { emotion: string; count: number }[];
}

const COLORS = {
  Confidence: '#6366f1', // Indigo
  Neutral: '#94a3b8',    // Slate
  Happy: '#10b981',      // Emerald
  Nervous: '#f59e0b',    // Amber
  Stressed: '#f43f5e',   // Rose
};

export default function EmotionChart({ data }: EmotionChartProps) {
  const chartData = data && data.length > 0 ? data : [
    { emotion: 'Confidence', count: 25 },
    { emotion: 'Neutral', count: 40 },
    { emotion: 'Happy', count: 15 },
    { emotion: 'Nervous', count: 12 },
    { emotion: 'Stressed', count: 8 },
  ];

  const formattedData = chartData.map((item) => ({
    name: item.emotion,
    value: item.count,
    fill: COLORS[item.emotion as keyof typeof COLORS] || '#8b5cf6',
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const entry = payload[0];
      return (
        <div className="bg-slate-950/90 backdrop-blur-md border border-white/10 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-200 shadow-xl">
          <p style={{ color: entry.payload.fill }} className="font-bold">{entry.name}</p>
          <p className="mt-1">Frequency: <span className="text-slate-100 font-extrabold">{entry.value} occurrences</span></p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-72 flex flex-col justify-center items-center">
      <ResponsiveContainer width="100%" height="90%">
        <PieChart>
          <Pie
            data={formattedData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={4}
            dataKey="value"
          >
            {formattedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-2 text-[10px] uppercase tracking-wider font-bold text-slate-400">
        {formattedData.map((entry, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
            <span>{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
