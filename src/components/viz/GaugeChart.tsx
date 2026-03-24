import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';

export interface GaugeChartProps {
  value: number;
  max?: number;
  min?: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'critical';
  showValue?: boolean;
  className?: string;
  isLoading?: boolean;
}

export function GaugeChart({
  value,
  max = 100,
  min = 0,
  label,
  size = 'md',
  variant = 'default',
  showValue = true,
  className,
  isLoading = false,
}: GaugeChartProps) {
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const percentageInt = Math.round(percentage);

  const sizeClasses = {
    sm: { width: 80, height: 60, fontSize: 16, strokeWidth: 8 },
    md: { width: 120, height: 90, fontSize: 24, strokeWidth: 10 },
    lg: { width: 160, height: 120, fontSize: 32, strokeWidth: 12 },
  };

  const { width, height, fontSize, strokeWidth } = sizeClasses[size];

  const variantColors = {
    default: '#6366f1', // indigo-500
    success: '#10b981', // emerald-500
    warning: '#f59e0b', // amber-500
    critical: '#f43f5e', // rose-500
  };

  const color = variantColors[variant];

  // Create gauge data - background arc + value arc
  const data = [
    { name: 'value', value: percentage },
    { name: 'empty', value: 100 - percentage },
  ];

  if (isLoading) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center',
          'animate-pulse',
          className
        )}
        style={{ width, height: height + 20 }}
      >
        <div className="rounded-full bg-slate-200 dark:bg-slate-800" style={{ width, height }} />
      </div>
    );
  }

  return (
    <div
      className={cn('flex flex-col items-center', className)}
      role="img"
      aria-label={`Gauge showing ${percentageInt}%`}
    >
      <div style={{ width, height }} className="relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="100%"
              startAngle={180}
              endAngle={0}
              innerRadius={width / 2 - strokeWidth}
              outerRadius={width / 2}
              paddingAngle={0}
              dataKey="value"
              stroke="none"
              cornerRadius={4}
            >
              <Cell key="value" fill={color} />
              <Cell key="empty" fill="#e2e8f0" />
            </Pie>
            <Tooltip
              content={() => (
                <div className="rounded bg-slate-900 px-2 py-1 text-xs text-white">
                  {percentageInt}%
                </div>
              )}
            />
          </PieChart>
        </ResponsiveContainer>

        {showValue && (
          <div
            className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-1/2 text-center"
          >
            <span
              className="font-bold text-slate-900 dark:text-slate-100"
              style={{ fontSize }}
            >
              {percentageInt}%
            </span>
          </div>
        )}
      </div>

      {label && (
        <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-400">
          {label}
        </p>
      )}
    </div>
  );
}

export default GaugeChart;
