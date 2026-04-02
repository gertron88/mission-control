'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { FolderKanban, Search, Plus, Bot, Calendar, Loader2 } from 'lucide-react';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    try {
      setLoading(true);
      const response = await fetch('/api/projects');
      
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }

      const data = await response.json();
      setProjects(data);
      setError(null);
    } catch (err) {
      console.error('Projects fetch error:', err);
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }

  const filtered = projects.filter((p: any) => {
    const matchStatus = filter === 'All' || p.state === filter;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                       p.description?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const executingCount = projects.filter((p: any) => p.state === 'EXECUTING').length;
  const subtitleText = projects.length + ' total — ' + executingCount + ' executing';

  if (loading) {
    return (
      <DashboardLayout title="Projects" subtitle="Loading...">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#22d3ee' }} />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Projects" subtitle="Error">
        <div style={{ 
          background: 'rgba(239, 68, 68, 0.1)', 
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '12px',
          padding: '20px',
          color: '#f87171'
        }}>
          <p>{error}</p>
          <button 
            onClick={fetchProjects}
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
      title="Projects"
      subtitle={subtitleText}
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
          New Project
        </button>
      }
    >
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
          {['All', 'EXECUTING', 'PROPOSED', 'COMPLETE', 'BLOCKED'].map((f) => (
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
              {f === 'All' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
              <span style={{ marginLeft: '6px', fontSize: '10px', fontFamily: 'monospace', opacity: 0.6 }}>
                {f === 'All' ? projects.length : projects.filter((p: any) => p.state === f).length}
              </span>
            </button>
          ))}
        </div>
        <div style={{ position: 'relative' }}>
          <Search className="w-4 h-4" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
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

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <FolderKanban className="w-12 h-12" style={{ color: '#475569', margin: '0 auto 16px' }} />
          <p style={{ color: '#64748b' }}>No projects found</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
          {filtered.map((project: any) => {
            const statusMap: Record<string, { color: string; bg: string; dot: string; label: string }> = {
              EXECUTING: { color: '#22d3ee', bg: 'rgba(6, 182, 212, 0.15)', dot: '#22d3ee', label: 'Executing' },
              PROPOSED: { color: '#94a3b8', bg: 'rgba(71, 85, 105, 0.3)', dot: '#94a3b8', label: 'Proposed' },
              COMPLETE: { color: '#34d399', bg: 'rgba(16, 185, 129, 0.15)', dot: '#34d399', label: 'Complete' },
              BLOCKED: { color: '#f87171', bg: 'rgba(239, 68, 68, 0.15)', dot: '#f87171', label: 'Blocked' },
              PAUSED: { color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.15)', dot: '#fbbf24', label: 'Paused' },
            };
            const scfg = statusMap[project.state] || statusMap['PROPOSED'];
            const budgetPct = project.budgetAllocated > 0 ? Math.round((project.budgetSpent / project.budgetAllocated) * 100) : 0;
            const tasksDone = project.tasks?.filter((t: any) => t.status === 'COMPLETE').length || 0;
            const tasksTotal = project.tasks?.length || 0;

            return (
              <div key={project.id} style={{
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
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#475569' }}>{project.id.slice(0, 8)}</span>
                    </div>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'white', lineHeight: 1.3 }}>{project.name}</h3>
                  </div>
                  <span style={{
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '10px',
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    border: '1px solid ' + scfg.color + '40',
                    background: scfg.bg,
                    color: scfg.color,
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: scfg.dot }}></span>
                    {scfg.label}
                  </span>
                </div>

                <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>{project.description || 'No description'}</p>

                {/* Tags */}
                {project.tags && project.tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {project.tags.slice(0, 3).map((tag: string, i: number) => (
                      <span key={tag} style={{
                        fontSize: '10px',
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontWeight: 500,
                        background: i % 3 === 0 ? 'rgba(71, 85, 105, 0.5)' : i % 3 === 1 ? 'rgba(6, 182, 212, 0.1)' : 'rgba(168, 85, 247, 0.1)',
                        color: i % 3 === 0 ? '#cbd5e1' : i % 3 === 1 ? '#22d3ee' : '#c084fc',
                      }}>{tag}</span>
                    ))}
                  </div>
                )}

                {/* Progress */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px' }}>
                    <span style={{ color: '#94a3b8' }}>Progress</span>
                    <span style={{
                      fontFamily: 'monospace',
                      fontWeight: 600,
                      color: project.progress >= 80 ? '#34d399' : project.progress >= 50 ? '#22d3ee' : '#fbbf24',
                    }}>{project.progress || 0}%</span>
                  </div>
                  <div style={{ height: '6px', background: '#1e293b', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      borderRadius: '9999px',
                      background: project.progress >= 80 ? '#10b981' : project.progress >= 50 ? '#06b6d4' : '#f59e0b',
                      width: (project.progress || 0) + '%',
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ fontSize: '10px', color: '#475569', fontFamily: 'monospace' }}>{tasksDone}/{tasksTotal} tasks</span>
                  </div>
                </div>

                {/* Budget */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px' }}>
                    <span style={{ color: '#94a3b8' }}>Budget</span>
                    <span style={{
                      fontFamily: 'monospace',
                      fontWeight: 600,
                      color: budgetPct >= 90 ? '#f87171' : budgetPct >= 70 ? '#fbbf24' : '#cbd5e1',
                    }}>${(project.budgetSpent || 0).toLocaleString()} / ${(project.budgetAllocated || 0).toLocaleString()}</span>
                  </div>
                  <div style={{ height: '4px', background: '#1e293b', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      borderRadius: '9999px',
                      background: budgetPct >= 90 ? '#ef4444' : budgetPct >= 70 ? '#f59e0b' : '#a855f7',
                      width: Math.min(budgetPct, 100) + '%',
                    }} />
                  </div>
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid rgba(71, 85, 105, 0.4)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: '#64748b' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Bot className="w-3 h-3" />{project.agents?.length || 0}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar className="w-3 h-3" />
                      {project.plannedEnd ? new Date(project.plannedEnd).toLocaleDateString() : 'No deadline'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
