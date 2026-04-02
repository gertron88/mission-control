'use client';

import { useState, useEffect } from 'react';
import { Bot, Activity, Cpu, Zap } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  handle: string;
  status: string;
  role: string;
  heartbeats: Array<{
    timestamp: string;
    cpuUsage?: number;
    memoryUsage?: number;
  }>;
  _count: {
    assignedTasks: number;
  };
}

const statusColors: Record<string, { bg: string; color: string }> = {
  ONLINE: { bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399' },
  BUSY: { bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' },
  AWAY: { bg: 'rgba(249, 115, 22, 0.15)', color: '#f97316' },
  OFFLINE: { bg: 'rgba(71, 85, 105, 0.3)', color: '#94a3b8' },
  ERROR: { bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171' },
};

export default function AgentStatusGrid() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAgents() {
      try {
        const response = await fetch('/api/agents');
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setAgents(data);
      } catch (err) {
        setAgents([]);
      } finally {
        setLoading(false);
      }
    }
    fetchAgents();
    
    // Poll every 10 seconds for live updates
    const interval = setInterval(fetchAgents, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div style={{ 
        background: 'rgba(30, 41, 59, 0.5)', 
        borderRadius: '12px',
        padding: '20px'
      }}>
        <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
          Agent Status
        </h3>
        <div style={{ color: '#64748b', fontSize: '14px' }}>Loading agents...</div>
      </div>
    );
  }

  return (
    <div style={{ 
      background: 'rgba(30, 41, 59, 0.5)', 
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(71, 85, 105, 0.4)',
      borderRadius: '12px',
      padding: '20px',
      maxHeight: '400px',
      overflow: 'auto'
    }}>
      <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
        Agent Status
      </h3>

      {agents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px 0', color: '#64748b' }}>
          <Bot className="w-8 h-8" style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          <p style={{ fontSize: '13px' }}>No agents connected</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {agents.map((agent) => {
            const status = statusColors[agent.status] || statusColors.OFFLINE;
            const latestHeartbeat = agent.heartbeats?.[0];
            const cpu = latestHeartbeat?.cpuUsage || 0;
            const memory = latestHeartbeat?.memoryUsage || 0;
            
            return (
              <div 
                key={agent.id}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  background: 'rgba(15, 23, 42, 0.4)',
                  border: '1px solid rgba(71, 85, 105, 0.3)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{ 
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '8px', 
                    background: 'linear-gradient(135deg, #06b6d4, #9333ea)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Bot className="w-4 h-4" style={{ color: 'white' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>{agent.name}</span>
                      <span style={{ 
                        fontSize: '9px', 
                        padding: '2px 6px', 
                        borderRadius: '4px',
                        background: status.bg,
                        color: status.color
                      }}>{agent.status}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>{agent.role}</span>
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8' }}>
                    <Activity className="w-3 h-3" />
                    {agent._count?.assignedTasks || 0} tasks
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8' }}>
                    <Cpu className="w-3 h-3" />
                    {cpu}%
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8' }}>
                    <Zap className="w-3 h-3" />
                    {memory}MB
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
