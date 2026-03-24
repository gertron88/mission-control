import React from 'react';
import { Bot, Activity, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { HealthBadge } from '@/components/status/HealthBadge';

export type AgentStatus = 'online' | 'offline' | 'busy' | 'idle';

export interface Agent {
  id: string;
  name: string;
  avatar?: string;
  initials?: string;
  status: AgentStatus;
  health: 'healthy' | 'warning' | 'critical';
  lastSeen: Date;
  currentTask?: string;
  tasksCompleted: number;
  capabilities?: string[];
}

export interface AgentCardProps {
  agent: Agent;
  onClick?: (agent: Agent) => void;
  className?: string;
  isLoading?: boolean;
  showCapabilities?: boolean;
}

const statusConfig: Record<AgentStatus, { icon: React.ReactNode; label: string; color: string }> = {
  online: {
    icon: <Activity className="h-3 w-3" />,
    label: 'Online',
    color: 'text-emerald-600 dark:text-emerald-400',
  },
  offline: {
    icon: <WifiOff className="h-3 w-3" />,
    label: 'Offline',
    color: 'text-slate-500 dark:text-slate-400',
  },
  busy: {
    icon: <Activity className="h-3 w-3" />,
    label: 'Busy',
    color: 'text-amber-600 dark:text-amber-400',
  },
  idle: {
    icon: <Wifi className="h-3 w-3" />,
    label: 'Idle',
    color: 'text-blue-600 dark:text-blue-400',
  },
};

export function AgentCard({
  agent,
  onClick,
  className,
  isLoading = false,
  showCapabilities = true,
}: AgentCardProps) {
  const status = statusConfig[agent.status];

  if (isLoading) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-800" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-3 w-16 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'transition-all duration-200 hover:shadow-md',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={() => onClick?.(agent)}
      role="button"
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick(agent);
        }
      }}
      aria-label={`Agent: ${agent.name}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="relative">
            <Avatar className="h-12 w-12">
              <AvatarImage src={agent.avatar} alt={agent.name} />
              <AvatarFallback className="bg-slate-200 dark:bg-slate-800">
                {agent.initials || agent.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span
              className={cn(
                'absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white dark:border-slate-950',
                agent.status === 'online'
                  ? 'bg-emerald-500'
                  : agent.status === 'busy'
                  ? 'bg-amber-500'
                  : agent.status === 'idle'
                  ? 'bg-blue-500'
                  : 'bg-slate-400'
              )}
              aria-label={`Status: ${status.label}`}
            >
              {React.cloneElement(status.icon as React.ReactElement, {
                className: 'h-2.5 w-2.5 text-white',
              })}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="truncate font-semibold text-slate-900 dark:text-slate-100">
                  {agent.name}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {agent.status === 'online' && agent.currentTask
                    ? `Working on: ${agent.currentTask}`
                    : `Last seen ${new Date(agent.lastSeen).toLocaleTimeString()}`}
                </p>
              </div>
              <HealthBadge status={agent.health} size="sm" />
            </div>

            {showCapabilities && agent.capabilities && (
              <div className="mt-2 flex flex-wrap gap-1">
                {agent.capabilities.slice(0, 3).map((cap) => (
                  <Badge
                    key={cap}
                    variant="outline"
                    className="text-xs"
                  >
                    {cap}
                  </Badge>
                ))}
                {agent.capabilities.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{agent.capabilities.length - 3}
                  </Badge>
                )}
              </div>
            )}

            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                <Bot className="h-3.5 w-3.5" />
                {agent.tasksCompleted} tasks
              </div>
              <span className={cn('text-xs font-medium', status.color)}>
                {status.label}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default AgentCard;
