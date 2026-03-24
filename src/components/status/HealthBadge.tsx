import React from 'react';
import { cn } from '@/lib/utils';

export type HealthStatus = 'healthy' | 'warning' | 'critical';

export interface HealthBadgeProps {
  status: HealthStatus;
  label?: string;
  showDot?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  isLoading?: boolean;
}

const statusConfig: Record<HealthStatus, { 
  dot: string; 
  bg: string; 
  text: string;
  label: string;
}> = {
  healthy: {
    dot: 'bg-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    label: 'Healthy',
  },
  warning: {
    dot: 'bg-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-700 dark:text-amber-300',
    label: 'Warning',
  },
  critical: {
    dot: 'bg-rose-500',
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    text: 'text-rose-700 dark:text-rose-300',
    label: 'Critical',
  },
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

const dotSizes = {
  sm: 'h-1.5 w-1.5',
  md: 'h-2 w-2',
  lg: 'h-2.5 w-2.5',
};

export function HealthBadge({
  status,
  label,
  showDot = true,
  size = 'md',
  className,
  isLoading = false,
}: HealthBadgeProps) {
  const config = statusConfig[status];
  const displayLabel = label || config.label;

  if (isLoading) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full animate-pulse',
          'bg-slate-200 dark:bg-slate-700',
          sizeClasses[size],
          className
        )}
      >
        <span className="h-2 w-12 bg-slate-300 dark:bg-slate-600 rounded" />
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium transition-colors',
        config.bg,
        config.text,
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label={`Health status: ${displayLabel}`}
    >
      {showDot && (
        <span
          className={cn(
            'rounded-full',
            config.dot,
            dotSizes[size]
          )}
          aria-hidden="true"
        />
      )}
      {displayLabel}
    </span>
  );
}

export default HealthBadge;
