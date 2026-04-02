'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Bot, Activity, Cpu, Zap, Search, Plus, Download, Copy, Check } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  handle: string;
  status: 'ONLINE' | 'BUSY' | 'AWAY' | 'OFFLINE' | 'ERROR';
  role: string;
  capabilities: string[];
  model: string;
  _count: {
    assignedTasks: number;
  };
  heartbeats: Array<{
    timestamp: string;
    cpuPercent?: number;
    memoryMb?: number;
  }>;
}

const statusConfig: Record<string, { color: string; bg: string; pulse: boolean }> = {
  ONLINE: { color: '#34d399', bg: 'rgba(16, 185, 129, 0.15)', pulse: true },
  BUSY: { color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.15)', pulse: true },
  AWAY: { color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)', pulse: false },
  OFFLINE: { color: '#94a3b8', bg: 'rgba(71, 85, 105, 0.3)', pulse: false },
  ERROR: { color: '#f87171', bg: 'rgba(239, 68, 68, 0.15)', pulse: false },
};

// SDK Download Component
function SDKDownloadPanel() {
  const [copied, setCopied] = useState(false);
  
  const installCommand = 'npm install @mission-control/agent-client';
  
  const exampleCode = `const { MissionControlAgent } = require('@mission-control/agent-client');

const agent = new MissionControlAgent({
  missionControlUrl: 'https://mission-control-sage-mu.vercel.app',
  apiKey: 'your-api-key-here',
});

await agent.connect();

agent.onTask(async (task) => {
  console.log('Received task:', task);
  
  // Do work...
  const result = await doWork(task);
  
  // Report completion
  await agent.completeTask(task.id, result);
});

agent.onKill(() => {
  console.log('Kill switch activated!');
  process.exit(0);
});`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(exampleCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadSDK = () => {
    const link = document.createElement('a');
    link.href = '/agent-sdk/mission-control-agent.js';
    link.download = 'mission-control-agent.js';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{
      background: 'rgba(6, 182, 212, 0.1)',
      border: '1px solid rgba(6, 182, 212, 0.3)',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '24px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          background: 'rgba(6, 182, 212, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Download className="w-5 h-5" style={{ color: '#22d3ee' }} />
        </div>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#e2e8f0' }}>Agent SDK</h3>
          <p style={{ fontSize: '12px', color: '#94a3b8' }}>Connect your agents via WebSocket</p>
        </div>
      </div>

      <p style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '16px', lineHeight: 1.5 }}>
        Download the Mission Control Agent SDK to connect your autonomous agents. 
        Features real-time task delivery, progress reporting, and kill switch support.
      </p>

      {/* Install command */}
      <div style={{ marginBottom: '16px' }}>
        <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px' }}>Install via npm</p>
        <div style={{
          background: '#0f172a',
          borderRadius: '8px',
          padding: '12px',
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#22d3ee',
        }}>
          {installCommand}
        </div>
      </div>

      {/* Example code */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <p style={{ fontSize: '11px', color: '#64748b' }}>Quick Start</p>
          <button
            onClick={copyToClipboard}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              color: copied ? '#34d399' : '#64748b',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <div style={{
          background: '#0f172a',
          borderRadius: '8px',
          padding: '12px',
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#94a3b8',
          maxHeight: '150px',
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
        }}>
          {exampleCode}
        </div>
      </div>

      {/* Download button */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={downloadSDK}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: '8px',
            background: 'rgba(6, 182, 212, 0.15)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            color: '#67e8f9',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Download className="w-4 h-4" />
          Download SDK
        </button>
        <a
          href="/agent-sdk/README.md"
          download
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            background: 'rgba(71, 85, 105, 0.3)',
            border: '1px solid rgba(71, 85, 105, 0.5)',
            color: '#94a3b8',
            fontSize: '13px',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          Docs
        </a>
      </div>
    </div>
  );
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchAgents() {
      try {
        const response = await fetch('/api/agents');
        if (!response.ok) throw new Error('Failed to fetch agents');
        const data = await response.json();
        setAgents(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchAgents();
  }, []);

  const filtered = agents.filter((a) => {
    const matchStatus = filter === 'All' || a.status === filter;
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) || 
                       a.handle.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const onlineCount = agents.filter(a => a.status === 'ONLINE' || a.status === 'BUSY').length;

  if (loading) {
    return (
      <DashboardLayout title="Agents" subtitle="Loading...">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
          <div style={{ color: '#22d3ee' }}>Loading agents...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Agents" subtitle="Error">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
          <div style={{ color: '#f87171' }}>Error: {error}</div>
        </div>
      </DashboardLayout>
    );
  }

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
      {/* SDK Download Panel */}
      <SDKDownloadPanel />

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Online', value: agents.filter(a => a.status === 'ONLINE').length, color: '#34d399' },
          { label: 'Busy', value: agents.filter(a => a.status === 'BUSY').length, color: '#fbbf24' },
          { label: 'Offline', value: agents.filter(a => a.status === 'OFFLINE' || a.status === 'ERROR').length, color: '#94a3b8' },
          { label: 'Avg Success', value: agents.length > 0 ? `${Math.round(agents.reduce((sum, a) => sum + (a._count?.assignedTasks || 0), 0) / agents.length)}%` : '0%', color: '#22d3ee' },
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
          const latestHeartbeat = agent.heartbeats?.[0];
          const cpu = latestHeartbeat?.cpuPercent || 0;
          const memory = latestHeartbeat?.memoryMb || 0;
          const lastSeen = latestHeartbeat?.timestamp 
            ? `${Math.floor((Date.now() - new Date(latestHeartbeat.timestamp).getTime()) / 1000)}s ago`
            : 'Unknown';
          
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
                <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>{agent.role || 'Agent'}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {agent.capabilities?.map((cap) => (
                    <span key={cap} style={{
                      fontSize: '10px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: 'rgba(71, 85, 105, 0.4)',
                      color: '#cbd5e1',
                    }}>{cap}</span>
                  )) || <span style={{ fontSize: '10px', color: '#64748b' }}>No capabilities</span>}
                </div>
              </div>

              {/* Current Task */}
              <div style={{
                padding: '10px',
                borderRadius: '8px',
                background: agent._count?.assignedTasks > 0 ? 'rgba(6, 182, 212, 0.1)' : 'rgba(71, 85, 105, 0.2)',
                border: `1px solid ${agent._count?.assignedTasks > 0 ? 'rgba(6, 182, 212, 0.2)' : 'rgba(71, 85, 105, 0.3)'}`,
              }}>
                <p style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>Active Tasks</p>
                <p style={{ fontSize: '12px', color: agent._count?.assignedTasks > 0 ? '#22d3ee' : '#64748b' }}>
                  {agent._count?.assignedTasks || 0} assigned
                </p>
              </div>

              {/* Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <p style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>CPU Usage</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Cpu className="w-3 h-3" style={{ color: '#22d3ee' }} />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>{cpu}%</span>
                  </div>
                  <div style={{ height: '4px', background: '#1e293b', borderRadius: '2px', marginTop: '4px' }}>
                    <div style={{
                      height: '100%',
                      borderRadius: '2px',
                      background: cpu > 80 ? '#ef4444' : cpu > 50 ? '#f59e0b' : '#10b981',
                      width: `${cpu}%`,
                    }} />
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>Memory</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Zap className="w-3 h-3" style={{ color: '#fbbf24' }} />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>{memory}MB</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid rgba(71, 85, 105, 0.4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748b' }}>
                  <Activity className="w-3 h-3" />
                  {lastSeen}
                </div>
                <span style={{ fontSize: '10px', color: '#64748b' }}>
                  {agent.model}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
