'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { AlertTriangle, Power, Activity, Clock, AlertCircle, CheckCircle, History } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  handle: string;
  status: string;
  currentTask: string | null;
  lastHeartbeat: string;
}

interface KillHistory {
  id: string;
  agentName: string;
  killedAt: string;
  reason: string;
  killedBy: string;
}

export default function KillSwitchPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [history, setHistory] = useState<KillHistory[]>([]);
  const [showConfirm, setShowConfirm] = useState<string | null>(null);
  const [showGlobalConfirm, setShowGlobalConfirm] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [agentsRes, historyRes] = await Promise.all([
          fetch('/api/agents'),
          fetch('/api/kill-switch/history')
        ]);
        
        if (agentsRes.ok) setAgents(await agentsRes.json());
        if (historyRes.ok) setHistory(await historyRes.json());
      } catch (err) {
        setAgents([]);
        setHistory([]);
      }
    }
    fetchData();
  }, []);

  async function killAgent(agentId: string) {
    try {
      const response = await fetch(`/api/agents/${agentId}/kill`, {
        method: 'POST'
      });
      if (response.ok) {
        setShowConfirm(null);
        // Refresh agents
        const agentsRes = await fetch('/api/agents');
        if (agentsRes.ok) setAgents(await agentsRes.json());
      }
    } catch (err) {
      console.error('Failed to kill agent:', err);
    }
  }

  async function killAll() {
    try {
      const response = await fetch('/api/agents/kill-all', {
        method: 'POST'
      });
      if (response.ok) {
        setShowGlobalConfirm(false);
        const agentsRes = await fetch('/api/agents');
        if (agentsRes.ok) setAgents(await agentsRes.json());
      }
    } catch (err) {
      console.error('Failed to kill all agents:', err);
    }
  }

  const onlineAgents = agents.filter(a => a.status === 'ONLINE' || a.status === 'BUSY');

  return (
    <DashboardLayout
      title="Kill Switch"
      subtitle={`${onlineAgents.length} agents online • Emergency stop controls`}
    >
      {/* Warning Banner */}
      <div style={{
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <AlertTriangle className="w-6 h-6" style={{ color: '#f87171' }} />
        <div>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#f87171' }}>Emergency Controls</p>
          <p style={{ fontSize: '12px', color: '#94a3b8' }}>These actions immediately terminate agent processes. Use with caution.</p>
        </div>
      </div>

      {/* Global Kill Switch */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.5)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#f87171', marginBottom: '4px' }}>
              KILL ALL AGENTS
            </h3>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>
              Terminates all connected agents immediately
            </p>
          </div>
          <button
            onClick={() => setShowGlobalConfirm(true)}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              color: '#f87171',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Power className="w-4 h-4" />
            KILL ALL
          </button>
        </div>
      </div>

      {/* Agent Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {agents.map((agent) => {
          const isOnline = agent.status === 'ONLINE' || agent.status === 'BUSY';
          return (
            <div key={agent.id} style={{
              background: 'rgba(30, 41, 59, 0.5)',
              border: '1px solid rgba(71, 85, 105, 0.4)',
              borderRadius: '12px',
              padding: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: isOnline ? '#34d399' : '#94a3b8'
                  }} />
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>{agent.name}</p>
                    <p style={{ fontSize: '11px', color: '#64748b' }}>{agent.handle}</p>
                  </div>
                </div>
                <span style={{
                  fontSize: '10px',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: isOnline ? 'rgba(16, 185, 129, 0.15)' : 'rgba(71, 85, 105, 0.3)',
                  color: isOnline ? '#34d399' : '#94a3b8'
                }}>{agent.status}</span>
              </div>
              
              {agent.currentTask && (
                <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px' }}>
                  Task: {agent.currentTask}
                </p>
              )}
              
              <button
                onClick={() => setShowConfirm(agent.id)}
                disabled={!isOnline}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  background: isOnline ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                  border: `1px solid ${isOnline ? 'rgba(239, 68, 68, 0.3)' : 'rgba(71, 85, 105, 0.3)'}`,
                  color: isOnline ? '#f87171' : '#64748b',
                  fontSize: '12px',
                  cursor: isOnline ? 'pointer' : 'not-allowed',
                  opacity: isOnline ? 1 : 0.5
                }}
              >
                Kill Agent
              </button>
            </div>
          );
        })}
      </div>

      {/* Kill History */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.5)',
        border: '1px solid rgba(71, 85, 105, 0.4)',
        borderRadius: '12px',
        padding: '20px'
      }}>
        <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
          <History className="w-4 h-4" style={{ display: 'inline', marginRight: '8px' }} />
          Kill History
        </h3>
        {history.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>No kill events recorded</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {history.map((event) => (
              <div key={event.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                background: 'rgba(15, 23, 42, 0.4)',
                borderRadius: '8px'
              }}>
                <AlertCircle className="w-4 h-4" style={{ color: '#f87171' }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13px', color: '#e2e8f0' }}>{event.agentName} terminated</p>
                  <p style={{ fontSize: '11px', color: '#64748b' }}>{event.reason}</p>
                </div>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  {new Date(event.killedAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modals */}
      {showConfirm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div style={{
            background: '#1e293b',
            border: '1px solid rgba(239, 68, 68, 0.5)',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px'
          }}>
            <AlertTriangle className="w-12 h-12" style={{ color: '#f87171', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#f87171', textAlign: 'center', marginBottom: '8px' }}>
              Confirm Kill
            </h3>
            <p style={{ fontSize: '14px', color: '#94a3b8', textAlign: 'center', marginBottom: '24px' }}>
              Are you sure you want to terminate {agents.find(a => a.id === showConfirm)?.name}?
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowConfirm(null)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '6px',
                  background: 'transparent',
                  border: '1px solid rgba(71, 85, 105, 0.5)',
                  color: '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => killAgent(showConfirm)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '6px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.5)',
                  color: '#f87171',
                  cursor: 'pointer'
                }}
              >
                Kill Agent
              </button>
            </div>
          </div>
        </div>
      )}

      {showGlobalConfirm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div style={{
            background: '#1e293b',
            border: '1px solid rgba(239, 68, 68, 0.5)',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px'
          }}>
            <AlertTriangle className="w-12 h-12" style={{ color: '#f87171', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#f87171', textAlign: 'center', marginBottom: '8px' }}>
              KILL ALL AGENTS
            </h3>
            <p style={{ fontSize: '14px', color: '#94a3b8', textAlign: 'center', marginBottom: '24px' }}>
              This will terminate ALL {agents.length} connected agents immediately. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowGlobalConfirm(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '6px',
                  background: 'transparent',
                  border: '1px solid rgba(71, 85, 105, 0.5)',
                  color: '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={killAll}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '6px',
                  background: 'rgba(239, 68, 68, 0.3)',
                  border: '1px solid rgba(239, 68, 68, 0.5)',
                  color: '#f87171',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                KILL ALL
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
