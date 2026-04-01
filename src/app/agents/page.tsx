'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Bot, Activity, Cpu, Zap, Search, Plus } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  handle: string;
  status: 'ONLINE' | 'BUSY' | 'AWAY' | 'OFFLINE' | 'ERROR';
  role: string;
  capabilities: string[];
  currentTask: string | null;
  cpu: number;
  memory: number;
  tasksCompleted: number;
  successRate: number;
  lastHeartbeat: string;
}

const agents: Agent[] = [
  {
    id: 'a-001',
    name: 'Atlas-7',
    handle: '@atlas-7',
    status: 'BUSY',
    role: 'Data Engineer',
    capabilities: ['ETL', 'Vector DB', 'Python'],
    currentTask: 'Data Pipeline Sync',
    cpu: 78,
    memory: 412,
    tasksCompleted: 234,
    successRate: 94,
    lastHeartbeat: '2s ago',
  },
  {
    id: 'a-002',
    name: 'Nexus-3',
    handle: '@nexus-3',
    status: 'BUSY',
    role: 'Financial Analyst',
    capabilities: ['Finance', 'NLP', 'SQL'],
    currentTask: 'Financial Report Aggregation',
    cpu: 45,
    memory: 298,
    tasksCompleted: 189,
    successRate: 91,
    lastHeartbeat: '5s ago',
  },
  {
    id: 'a-003',
    name: 'Cipher-1',
    handle: '@cipher-1',
    status: 'ONLINE',
    role: 'Security Analyst',
    capabilities: ['Security', 'Compliance', 'Audit'],
    currentTask: null,
    cpu: 5,
    memory: 128,
    tasksCompleted: 156,
    successRate: 98,
    lastHeartbeat: '8s ago',
  },
  {
    id: 'a-004',
    name: 'Prism-9',
    handle: '@prism-9',
    status: 'ONLINE',
    role: 'ML Engineer',
    capabilities: ['ML', 'Python', 'PyTorch'],
    currentTask: null,
    cpu: 8,
    memory: 156,
    tasksCompleted: 312,
    successRate: 96,
    lastHeartbeat: '12s ago',
  },
  {
    id: 'a-005',
    name: 'Vortex-4',
    handle: '@vortex-4',
    status: 'ERROR',
    role: 'CRM Specialist',
    capabilities: ['CRM', 'Salesforce', 'API'],
    currentTask: null,
    cpu: 0,
    memory: 0,
    tasksCompleted: 89,
    successRate: 87,
    lastHeartbeat: '15m ago',
  },
  {
    id: 'a-006',
    name: 'Echo-2',
    handle: '@echo-2',
    status: 'BUSY',
    role: 'Research Analyst',
    capabilities: ['Research', 'Web Scraping', 'NLP'],
    currentTask: 'Competitive Intel Crawl',
    cpu: 62,
    memory: 334,
    tasksCompleted: 178,
    successRate: 92,
    lastHeartbeat: '21s ago',
  },
];

const statusConfig: Record<string, { color: string; bg: string; pulse: boolean }> = {
  ONLINE: { color: '#34d399', bg: 'rgba(16, 185, 129, 0.15)', pulse: true },
  BUSY: { color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.15)', pulse: true },
  AWAY: { color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)', pulse: false },
  OFFLINE: { color: '#94a3b8', bg: 'rgba(71, 85, 105, 0.3)', pulse: false },
  ERROR: { color: '#f87171', bg: 'rgba(239, 68, 68, 0.15)', pulse: false },
};

export default function AgentsPage() {
  const [filter, setFilter] = useState<string>('All');
  const [search, setSearch] = useState('');

  const filtered = agents.filter((a) => {
    const matchStatus = filter === 'All' || a.status === filter;
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) || 
                       a.handle.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const onlineCount = agents.filter(a => a.status === 'ONLINE' || a.status === 'BUSY').length;

  return (
    <DashboardLayout
      title="Agents"
      subtitle={`${agents.length} total — ${onlineCount} online`}
      actions={
        <button style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          borderRadius: '8px',
          background: 'rgba(6, 182, 212, 0.15)',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          color: '#67e8f9',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
        }}>
          <Plus className="w-4 h-4" />
          Deploy Agent
        </button>
      }
    >
      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Online', value: agents.filter(a => a.status === 'ONLINE').length, color: '#34d399' },
          { label: 'Busy', value: agents.filter(a => a.status === 'BUSY').length, color: '#fbbf24' },
          { label: 'Offline', value: agents.filter(a => a.status === 'OFFLINE' || a.status === 'ERROR').length, color: '#94a3b8' },
          { label: 'Avg Success', value: `${Math.round(agents.reduce((sum, a) => sum + a.successRate, 0) / agents.length)}%`, color: '#22d3ee' },
        ].map((stat) => (
          <div key={stat.label} style={{
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid rgba(71, 85, 105, 0.4)',
            borderRadius: '12px',
            padding: '16px',
          }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>{stat.label}</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: stat.color, fontFamily: 'monospace' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '4px', 
          background: 'rgba(15, 23, 42, 0.6)', 
          borderRadius: '12px', 
          padding: '4px',
          border: '1px solid rgba(51, 65, 85, 0.4)'
        }}>
          {['All', 'ONLINE', 'BUSY', 'OFFLINE', 'ERROR'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 500,
                background: filter === f ? '#334155' : 'transparent',
                color: filter === f ? 'white' : '#64748b',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {f}
            </button>
          ))}
        </div>
        <div style={{ position: 'relative' }}>
          <Search className="w-4 h-4" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agents..."
            style={{
              background: 'rgba(30, 41, 59, 0.6)',
              border: '1px solid rgba(71, 85, 105, 0.4)',
              borderRadius: '8px',
              paddingLeft: '36px',
              paddingRight: '16px',
              paddingTop: '8px',
              paddingBottom: '8px',
              fontSize: '14px',
              color: '#cbd5e1',
              width: '208px',
            }}
          />
        </div>
      </div>

      {/* Agents Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {filtered.map((agent) => {
          const scfg = statusConfig[agent.status];
          return (
            <div key={agent.id} style={{
              background: 'rgba(30, 41, 59, 0.5)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(71, 85, 105, 0.4)',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #06b6d4, #9333ea)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Bot className="w-6 h-6" style={{ color: 'white' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>{agent.name}</h3>
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      background: scfg.bg,
                      color: scfg.color,
                      fontWeight: 600,
                    }}>{agent.status}</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748b' }}>{agent.handle}</p>
                </div>
              </div>

              {/* Role & Capabilities */}
              <div>
                <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>{agent.role}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {agent.capabilities.map((cap) => (
                    <span key={cap} style={{
                      fontSize: '10px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: 'rgba(71, 85, 105, 0.4)',
                      color: '#cbd5e1',
                    }}>{cap}</span>
                  ))}
                </div>
              </div>

              {/* Current Task */}
              <div style={{
                padding: '10px',
                borderRadius: '8px',
                background: agent.currentTask ? 'rgba(6, 182, 212, 0.1)' : 'rgba(71, 85, 105, 0.2)',
                border: `1px solid ${agent.currentTask ? 'rgba(6, 182, 212, 0.2)' : 'rgba(71, 85, 105, 0.3)'}`,
              }}>
                <p style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>Current Task</p>
                <p style={{ fontSize: '12px', color: agent.currentTask ? '#22d3ee' : '#64748b' }}>
                  {agent.currentTask || 'Idle'}
                </p>
              </div>

              {/* Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <p style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>CPU Usage</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Cpu className="w-3 h-3" style={{ color: '#22d3ee' }} />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>{agent.cpu}%</span>
                  </div>
                  <div style={{ height: '4px', background: '#1e293b', borderRadius: '2px', marginTop: '4px' }}>
                    <div style={{
                      height: '100%',
                      borderRadius: '2px',
                      background: agent.cpu > 80 ? '#ef4444' : agent.cpu > 50 ? '#f59e0b' : '#10b981',
                      width: `${agent.cpu}%`,
                    }} />
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>Success Rate</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Zap className="w-3 h-3" style={{ color: '#fbbf24' }} />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>{agent.successRate}%</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid rgba(71, 85, 105, 0.4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748b' }}>
                  <Activity className="w-3 h-3" />
                  {agent.lastHeartbeat}
                </div>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  {agent.tasksCompleted} tasks
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
