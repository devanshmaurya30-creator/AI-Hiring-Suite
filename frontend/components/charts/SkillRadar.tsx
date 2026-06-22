'use client';

import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';

interface SkillRadarProps {
  data: { skill: string; count: number }[];
}

export default function SkillRadar({ data }: SkillRadarProps) {
  // Safe default data
  const chartData = data && data.length > 0 ? data : [
    { skill: 'Python', count: 12 },
    { skill: 'React', count: 10 },
    { skill: 'Docker', count: 8 },
    { skill: 'SQL', count: 7 },
    { skill: 'Java', count: 5 },
    { skill: 'AWS', count: 4 },
  ];

  return (
    <div className="w-full h-72 p-1 flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
          <PolarGrid stroke="rgba(255,255,255,0.06)" />
          <PolarAngleAxis
            dataKey="skill"
            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 'auto']}
            tick={{ fill: '#475569', fontSize: 8 }}
            axisLine={false}
          />
          
          <Radar
            name="Skills"
            dataKey="count"
            stroke="#818cf8" // indigo-400
            fill="#6366f1" // indigo-500
            fillOpacity={0.25}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
