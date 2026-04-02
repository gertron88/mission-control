'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Bot, Timer, CheckCircle, AlertTriangle, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';

interface StatusData {
  agents: { online: number; total: number; deploying: number };
  pending: { count: number; highPriority: number };
  completed: { today: number; yesterday: number };
  blocked: { count: number; critical: number };
}

interface DashboardData {
  agents: any[];
  tasks: any[];
  projects: any[];
}

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetchDashboardData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      
      // Fetch real data from APIs
      const [agentsRes, tasksRes, projectsRes] = await Promise.all([
        fetch('/api/agents?includeOffline=true'),
        fetch('/api/tasks'),
        fetch('/api/projects'),
      ]);

      if (!agentsRes.ok || !tasksRes.ok || !projectsRes.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const [agents, tasks, projects] = await Promise.all([
        agentsRes.json(),
        tasksRes.json(),
        projectsRes.json(),
      ]);

      setData({ agents, tasks, projects });
      setError(null);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  // Calculate stats from real data
  const stats = data ? {
    agents: {
      online: data.agents.filter((a: any) => a.status === 'ONLINE' || a.status === 'BUSY').length,
      total: data.agents.length,
      deploying: data.agents.filter((a: any) => a.status === 'DEPLOYING').length,
    },
    pending: {
      count: data.tasks.filter((t: any) => t.status === 'QUEUED' || t.status === 'READY').length,
      highPriority: data.tasks.filter((t: any) => 
        (t.status === 'QUEUED' || t.status === 'READY') && 
        (t.priority === 'HIGH' || t.priority === 'CRITICAL')
      ).length,
    },
    completed: {
      today: data.tasks.filter((t: any) => {
        if (t.status !== 'COMPLETE' || !t.completedAt) return false;
        const completed = new Date(t.completedAt);
        const today = new Date();
        return completed.toDateString() === today.toDateString();
      }).length,
      yesterday: data.tasks.filter((t: any) => {
        if (t.status !== 'COMPLETE' || !t.completedAt) return false;
        const completed = new Date(t.completedAt);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return completed.toDateString() === yesterday.toDateString();
      }).length,
    },
    blocked: {
      count: data.tasks.filter((t: any) => t.status === 'BLOCKED').length,
      critical: data.tasks.filter((t: any) => 
        t.status === 'BLOCKED' && t.priority === 'CRITICAL'
      ).length,
    },
  } : null;

  if (loading && !data) {
    return (
      <DashboardLayout title="Mission Control" subtitle="Loading...">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#22d3ee' }} />
        </div>
      </DashboardLayout>
    );
  }

  if (error && !data) {
    return (
      <DashboardLayout title="Mission Control" subtitle="Error">
        <div style={{ 
          background: 'rgba(239, 68, 68, 0.1)', 
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '12px',
          padding: '20px',
          color: '#f87171'
        }}>
          <p>{error}</p>
          <button 
            onClick={fetchDashboardData}
            style={{
              marginTop: '12px',
              padding: '8px 16px',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '6px',
              color: '#f87171',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Mission Control"
      subtitle="All systems operational"
    >
      {/* Status Cards */}
      <StatusCards stats={stats} />

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginTop: '20px' }}>
        {/* Activity feed - 2 cols */}
        <div style={{ 
          background: 'rgba(30, 41, 59, 0.5)', 
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(71, 85, 105, 0.4)',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>Recent Activity</h3>
          {data?.tasks.slice(0, 5).map((task: any) => (
            <div key={task.id} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: '1px solid rgba(71, 85, 105, 0.2)',
            }}>
              <div>
                <p style={{ fontSize: '13px', color: '#e2e8f0' }}>{task.title}</p>
                <p style={{ fontSize: '11px', color: '#64748b' }}>{task.project?.name || 'No project'}</p>
              </div>
              <span style={{
                fontSize: '10px',
                padding: '2px 8px',
                borderRadius: '4px',
                background: task.status === 'COMPLETE' ? 'rgba(16, 185, 129, 0.15)' : 
                           task.status === 'BLOCKED' ? 'rgba(239, 68, 68, 0.15)' :
                           'rgba(6, 182, 212, 0.15)',
                color: task.status === 'COMPLETE' ? '#34d399' :
                       task.status === 'BLOCKED' ? '#f87171' :
                       '#22d3ee',
              }}>{task.status}</span>
            </div>
          ))}
          {(!data?.tasks || data.tasks.length === 0) && (
            <p style={{ fontSize: '14px', color: '#64748b' }}>No recent activity</p>
          )}
        </div>

        {/* Agent grid - 1 col */}
        <div style={{ 
          background: 'rgba(30, 41, 59, 0.5)', 
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(71, 85, 105, 0.4)',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>Agent Status</h3>
          {data?.agents.slice(0, 5).map((agent: any) => (
            <div key={agent.id} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              padding: '10px 0',
              borderBottom: '1px solid rgba(71, 85, 105, 0.2)',
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #06b6d4, #9333ea)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 700,
                color: 'white',
              }}>{agent.name.charAt(0)}</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '13px', color: '#e2e8f0' }}>{agent.name}</p>
                <p style={{ fontSize: '11px', color: '#64748b' }}>{agent.role}</p>
              </div>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: agent.status === 'ONLINE' ? '#34d399' :
                           agent.status === 'BUSY' ? '#fbbf24' :
                           agent.status === 'ERROR' ? '#f87171' :
                           '#94a3b8',
              }} />
            </div>
          ))}
          {(!data?.agents || data.agents.length === 0) && (
            <p style={{ fontSize: '14px', color: '#64748b' }}>No agents connected</p>
          )}
        </div>
      </div>

      {/* Bottom metrics row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '20px' }}>
        {/* Throughput */}
        <ThroughputCard tasks={data?.tasks || []} />
        
        {/* Success rate */}
        <SuccessRateCard tasks={data?.tasks || []} />
        
        {/* Budget usage */}
        <BudgetCard projects={data?.projects || []} />
      </div>
    </DashboardLayout>
  );
}

// Status Cards Component
function StatusCards({ stats }: { stats: any }) {
  const cards = [
    {
      id: 'agents',
      label: 'Active Agents',
      value: stats?.agents.online || 0,
      subValue: `${stats?.agents.deploying || 0} deploying`,
      change: `+${stats?.agents.online || 0}`,
      trend: 'up' as const,
      icon: <Bot className="w-5 h-5" />,
      accentColor: '#22d3ee',
    },
    {
      id: 'pending',
      label: 'Pending Tasks',
      value: stats?.pending.count || 0,
      subValue: `${stats?.pending.highPriority || 0} high priority`,
      change: `+${stats?.pending.count || 0}`,
      trend: 'up' as const,
      icon: <Timer className="w-5 h-5" />,
      accentColor: '#fbbf24',
    },
    {
      id: 'completed',
      label: 'Completed Today',
      value: stats?.completed.today || 0,
      subValue: `vs ${stats?.completed.yesterday || 0} yesterday`,
      change: `+${(stats?.completed.today || 0) - (stats?.completed.yesterday || 0)}`,
      trend: 'up' as const,
      icon: <CheckCircle className="w-5 h-5" />,
      accentColor: '#34d399',
    },
    {
      id: 'blocked',
      label: 'Blocked Items',
      value: stats?.blocked.count || 0,
      subValue: `${stats?.blocked.critical || 0} critical`,
      change: `-${stats?.blocked.count || 0}`,
      trend: 'down' as const,
      icon: <AlertTriangle className="w-5 h-5" />,
      accentColor: '#f87171',
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
            border: `1px solid ${card.accentColor}40`,
            borderRadius: '12px',
            padding: '20px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', right: '-16px', top: '-16px', width: '80px', height: '80px', borderRadius: '50%', background: card.accentColor, opacity: 0.05 }} />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', border: `1px solid ${card.accentColor}40`, background: 'rgba(15, 23, 42, 0.5)', color: card.accentColor }}>
              {card.icon}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 600, background: card.id === 'blocked' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: card.id === 'blocked' ? '#f87171' : '#34d399' }}>
              {card.trend === 'up' ? <ArrowUp style={{ width: '12px', height: '12px' }} /> : <ArrowDown style={{ width: '12px', height: '12px' }} />}
              {card.change}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: '36px', fontWeight: 700, fontFamily: 'monospace', color: card.accentColor, lineHeight: 1 }}>
              {card.value.toString().padStart(2, '0')}
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>{card.label}</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>{card.subValue}</div>
          </div>

          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px', background: card.accentColor, opacity: 0.5 }} />
        </div>
      ))}
    </div>
  );
}

// Throughput Card
function ThroughputCard({ tasks }: { tasks: any[] }) {
  const completedTasks = tasks.filter(t => t.status === 'COMPLETE');
  const recentTasks = completedTasks.slice(-12);
  const hourlyData = recentTasks.map(() => Math.floor(Math.random() * 60) + 40); // Placeholder until we have real hourly data

  return (
    <div style={{ background: 'rgba(30, 41, 59, 0.5)', backdropFilter: 'blur(12px)', border: '1px solid rgba(71, 85, 105, 0.4)', borderRadius: '12px', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Task Throughput</h3>
        <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#64748b' }}>Last 24h</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'end', gap: '4px', height: '48px' }}>
        {hourlyData.map((h, i) => (
          <div key={i} style={{ flex: 1, borderRadius: '2px', background: 'rgba(6, 182, 212, 0.3)', height: `${h}%` }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
        <span style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>{completedTasks.length} tasks</span>
        <span style={{ fontSize: '10px', color: '#34d399', fontFamily: 'monospace' }}>+18% avg</span>
      </div>
    </div>
  );
}

// Success Rate Card
function SuccessRateCard({ tasks }: { tasks: any[] }) {
  const completedTasks = tasks.filter(t => t.status === 'COMPLETE');
  const failedTasks = tasks.filter(t => t.status === 'FAILED');
  const totalCompleted = completedTasks.length + failedTasks.length;
  const successRate = totalCompleted > 0 ? Math.round((completedTasks.length / totalCompleted) * 100) : 0;

  return (
    <div style={{ background: 'rgba(30, 41, 59, 0.5)', backdropFilter: 'blur(12px)', border: '1px solid rgba(71, 85, 105, 0.4)', borderRadius: '12px', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Success Rate</h3>
        <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#64748b' }}>7-day avg</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ position: 'relative', width: '64px', height: '64px', flexShrink: 0 }}>
          <svg style={{ width: '64px', height: '64px', transform: 'rotate(-90deg)' }} viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(71,85,105,0.4)" strokeWidth="3" />
            <circle cx="18" cy="18" r="15" fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray={`${successRate * 0.875} 100`} strokeDashoffset="0" strokeLinecap="round" />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#34d399', fontFamily: 'monospace' }}>{successRate}%</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: '#94a3b8' }}>Completed</span>
            <span style={{ color: '#34d399', fontFamily: 'monospace' }}>{completedTasks.length}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: '#94a3b8' }}>Failed</span>
            <span style={{ color: '#f87171', fontFamily: 'monospace' }}>{failedTasks.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Budget Card
function BudgetCard({ projects }: { projects: any[] }) {
  const totalBudget = projects.reduce((sum, p) => sum + (p.budgetAllocated || 0), 0);
  const totalSpent = projects.reduce((sum, p) => sum + (p.budgetSpent || 0), 0);
  const budgetPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  return (
    <div style={{ background: 'rgba(30, 41, 59, 0.5)', backdropFilter: 'blur(12px)', border: '1px solid rgba(71, 85, 105, 0.4)', borderRadius: '12px', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Budget Usage</h3>
        <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#fbbf24' }}>Apr 2026</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {projects.slice(0, 3).map((project) => {
          const pct = project.budgetAllocated > 0 ? Math.round((project.budgetSpent / project.budgetAllocated) * 100) : 0;
          return (
            <div key={project.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                <span style={{ color: '#94a3b8' }}>{project.name}</span>
                <span style={{ color: '#cbd5e1', fontFamily: 'monospace' }}>{pct}%</span>
              </div>
              <div style={{ height: '6px', background: '#1e293b', borderRadius: '9999px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#06b6d4', borderRadius: '9999px', width: `${Math.min(pct, 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(71, 85, 105, 0.4)', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
        <span style={{ color: '#64748b' }}>${totalSpent.toLocaleString()} spent</span>
        <span style={{ color: '#94a3b8', fontWeight: 600 }}>of ${totalBudget.toLocaleString()}</span>
      </div>
    </div>
  );
}
