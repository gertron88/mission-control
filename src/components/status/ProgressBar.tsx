import React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressBarProps {
  value: number;
  max?: number;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'critical';
  className?: string;
  isLoading?: boolean;
  label?: string;
}

const sizeClasses = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

const variantClasses = {
  default: 'bg-slate-600 dark:bg-slate-400',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  critical: 'bg-rose-500',
};

export function ProgressBar({
  value,
  max = 100,
  showPercentage = false,
  size = 'md',
  variant = 'default',
  className,
  isLoading = false,
  label,
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const percentageInt = Math.round(percentage);

  return (
    <div
      className={cn('w-full space-y-2', className)}
      role="progressbar"
      aria-valuenow={isLoading ? undefined : percentageInt}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label || 'Progress'}
    >
      {(label || showPercentage) && (
        <div className="flex justify-between text-sm">
          {label && (
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {label}
            </span>
          )}
          {showPercentage && !isLoading && (
            <span className="text-slate-500 dark:text-slate-400">
              {percentageInt}%
            </span>
          )}
        </div>
      )}
      <div
        className={cn(
          'w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800',
          sizeClasses[size]
        )}
      >
        {isLoading ? (
          <div
            className={cn(
              'h-full animate-pulse rounded-full bg-slate-300 dark:bg-slate-700',
              variantClasses[variant]
            )}
            style={{ width: '100%' }}
          />
        ) : (
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500 ease-out',
              variantClasses[variant]
            )}
            style={{ width: `${percentage}%` }}
          />
        )}
      </div>
    </div>
  );
}

export default ProgressBar;
