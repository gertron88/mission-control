'use client'

import { Bot, Timer, CheckCircle, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react';

interface Stats {
  totalProjects: number;
  activeProjects: number;
  totalTasks: number;
  runningTasks: number;
  totalAgents: number;
  onlineAgents: number;
}

interface StatusCardsProps {
  stats: Stats;
}

interface CardData {
  id: string;
  label: string;
  value: number;
  subValue: string;
  change: string;
  trend: 'up' | 'down';
  icon: React.ReactNode;
  accentColor: string;
}

export default function StatusCards({ stats }: StatusCardsProps) {
  const cards: CardData[] = [
    {
      id: 'agents',
      label: 'Active Agents',
      value: stats.totalAgents,
      subValue: `${stats.onlineAgents} online`,
      change: '+2',
      trend: 'up',
      icon: <Bot className="w-5 h-5" />,
      accentColor: '#22d3ee',
    },
    {
      id: 'projects',
      label: 'Active Projects',
      value: stats.activeProjects,
      subValue: `${stats.totalProjects} total`,
      change: '+1',
      trend: 'up',
      icon: <CheckCircle className="w-5 h-5" />,
      accentColor: '#34d399',
    },
    {
      id: 'tasks',
      label: 'Running Tasks',
      value: stats.runningTasks,
      subValue: `${stats.totalTasks} total`,
      change: '+3',
      trend: 'up',
      icon: <Timer className="w-5 h-5" />,
      accentColor: '#fbbf24',
    },
    {
      id: 'system',
      label: 'System Health',
      value: 98,
      subValue: 'Operational',
      change: '+0',
      trend: 'up',
      icon: <AlertTriangle className="w-5 h-5" />,
      accentColor: '#a78bfa',
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
      {cards.map((card) => (
        <div
          key={card.id}
          style={{
            background: 'rgba(30, 41, 59, 0.5)',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${card.id === 'agents' ? 'rgba(34, 211, 238, 0.3)' : card.id === 'projects' ? 'rgba(52, 211, 153, 0.3)' : card.id === 'tasks' ? 'rgba(251, 191, 36, 0.3)' : 'rgba(167, 139, 250, 0.3)'}`,
            borderRadius: '12px',
            padding: '20px',
            position: 'relative',
            overflow: 'hidden',
            cursor: 'pointer',
          }}
        >
          {/* Background decoration */}
          <div 
            style={{
              position: 'absolute',
              right: '-16px',
              top: '-16px',
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: card.accentColor,
              opacity: 0.05,
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div 
              style={{
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '12px',
                border: `1px solid ${card.id === 'agents' ? 'rgba(34, 211, 238, 0.3)' : card.id === 'projects' ? 'rgba(52, 211, 153, 0.3)' : card.id === 'tasks' ? 'rgba(251, 191, 36, 0.3)' : 'rgba(167, 139, 250, 0.3)'}`,
                background: 'rgba(15, 23, 42, 0.5)',
                color: card.accentColor,
              }}
            >
              {card.icon}
            </div>
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontFamily: 'monospace',
                fontWeight: 600,
                background: card.id === 'blocked' ? 'rgba(248, 113, 113, 0.15)' : 'rgba(52, 211, 153, 0.15)',
                color: card.id === 'blocked' ? '#f87171' : '#34d399',
              }}
            >
              {card.trend === 'up' ? <ArrowUp style={{ width: '12px', height: '12px' }} /> : <ArrowDown style={{ width: '12px', height: '12px' }} />}
              {card.change}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div 
              style={{
                fontSize: '36px',
                fontWeight: 700,
                fontFamily: 'monospace',
                color: card.accentColor,
                lineHeight: 1,
              }}
            >
              {card.value.toString().padStart(2, '0')}
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>{card.label}</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>{card.subValue}</div>
          </div>

          {/* Neon bottom accent */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '2px',
              background: card.accentColor,
              opacity: 0.5,
            }}
          />
        </div>
      ))}
    </div>
  );
}
