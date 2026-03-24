import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, Clock, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TimelineStatus = 'success' | 'warning' | 'error' | 'info' | 'pending';

export interface TimelineEvent {
  id: string;
  timestamp: Date;
  status: TimelineStatus;
  title: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface StatusTimelineProps {
  events: TimelineEvent[];
  className?: string;
  isLoading?: boolean;
  maxEvents?: number;
}

const statusConfig: Record<TimelineStatus, { icon: React.ReactNode; color: string; bg: string }> = {
  success: {
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
  },
  warning: {
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
  },
  error: {
    icon: <XCircle className="h-4 w-4" />,
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-100 dark:bg-rose-900/30',
  },
  info: {
    icon: <Activity className="h-4 w-4" />,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
  },
  pending: {
    icon: <Clock className="h-4 w-4" />,
    color: 'text-slate-500 dark:text-slate-400',
    bg: 'bg-slate-100 dark:bg-slate-800',
  },
};

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export function StatusTimeline({
  events,
  className,
  isLoading = false,
  maxEvents = 10,
}: StatusTimelineProps) {
  const displayEvents = events.slice(0, maxEvents);

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)} aria-label="Loading timeline">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-800" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className={cn('py-8 text-center text-slate-500 dark:text-slate-400', className)}>
        No events to display
      </div>
    );
  }

  return (
    <div
      className={cn('relative', className)}
      role="list"
      aria-label="Status timeline"
    >
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-800" />

      <div className="space-y-4">
        {displayEvents.map((event, index) => {
          const config = statusConfig[event.status];
          const isLast = index === displayEvents.length - 1;

          return (
            <div
              key={event.id}
              className="relative flex gap-4"
              role="listitem"
            >
              {/* Icon */}
              <div
                className={cn(
                  'relative z-10 flex h-8 w-8 items-center justify-center rounded-full',
                  config.bg,
                  config.color
                )}
                aria-hidden="true"
              >
                {config.icon}
              </div>

              {/* Content */}
              <div className={cn('flex-1 pb-4', isLast && 'pb-0')}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {event.title}
                    </h4>
                    {event.description && (
                      <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                        {event.description}
                      </p>
                    )}
                  </div>
                  <time
                    className="text-xs text-slate-400 whitespace-nowrap"
                    dateTime={new Date(event.timestamp).toISOString()}
                  >
                    {formatRelativeTime(event.timestamp)}
                  </time>
                </div>

                {/* Metadata */}
                {event.metadata && Object.keys(event.metadata).length > 0 && (
                  <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    {Object.entries(event.metadata).map(([key, value]) => (
                      <div key={key} className="flex gap-1 text-xs">
                        <dt className="text-slate-400">{key}:</dt>
                        <dd className="font-mono text-slate-600 dark:text-slate-300">
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default StatusTimeline;
