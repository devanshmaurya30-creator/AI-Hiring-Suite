'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import CountUp from 'react-countup';
import GlassCard from './GlassCard';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  gradient?: string;
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  gradient = 'from-indigo-500 to-purple-500',
}: StatCardProps) {
  const numericValue = typeof value === 'number' ? value : parseFloat(value);
  const isNumeric = !isNaN(numericValue) && isFinite(numericValue);

  const TrendIcon =
    trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  const trendColor =
    trend === 'up'
      ? 'text-emerald-400'
      : trend === 'down'
        ? 'text-red-400'
        : 'text-slate-500';

  return (
    <GlassCard hover>
      <div className="flex items-start justify-between mb-4">
        <div
          className={cn(
            'p-3 rounded-xl bg-gradient-to-br opacity-90',
            gradient
          )}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend && trendValue && (
          <div className={cn('flex items-center gap-1 text-sm', trendColor)}>
            <TrendIcon className="w-4 h-4" />
            <span className="font-medium">{trendValue}</span>
          </div>
        )}
      </div>

      <motion.div
        className="text-3xl font-bold text-white mb-1 tracking-tight"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {isNumeric ? (
          <CountUp end={numericValue} duration={1.5} separator="," />
        ) : (
          value
        )}
      </motion.div>

      <p className="text-sm font-medium text-slate-400">{title}</p>

      {subtitle && (
        <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
      )}
    </GlassCard>
  );
}
