'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { FolderKanban, Search, Plus, Bot, Calendar } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string | null;
  state: string;
  progress: number;
  budgetAllocated: number | null;
  budgetSpent: number | null;
  portfolio: {
    id: string;
    name: string;
  };
  _count: {
    tasks: number;
    milestones: number;
  };
  tasks: Array<{
    id: string;
    number: number;
    title: string;
    status: string;
  }>;
  createdAt: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchProjects() {
      try {
        const response = await fetch('/api/projects');
        if (!response.ok) throw new Error('Failed to fetch projects');
        const data = await response.json();
        setProjects(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, []);

  const filtered = projects.filter((p) => {
    const matchStatus = filter === 'All' || p.state === filter;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const executingCount = projects.filter(p => p.state === 'EXECUTING').length;

  if (loading) {
    return (
      <DashboardLayout title="Projects" subtitle="Loading...">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
          <div style={{ color: '#22d3ee' }}>Loading projects...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Projects" subtitle="Error">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
          <div style={{ color: '#f87171' }}>Error: {error}</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Projects"
      subtitle={`${projects.length} total — ${executingCount} executing`}
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {['All', 'PROPOSED', 'PLANNING', 'EXECUTING', 'COMPLETE', 'ARCHIVED'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12px',
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
            placeholder="Search projects..."
            style={{
              background: 'rgba(30, 41, 59, 0.6)',
              border: '1px solid rgba(71, 85, 105, 0.4)',
              borderRadius: '8px',
              paddingLeft: '36px',
              padding: '8px 16px',
              fontSize: '14px',
              color: '#cbd5e1',
              width: '200px',
            }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
        {filtered.map((project) => {
          const budgetUsed = project.budgetSpent || 0;
          const budgetTotal = project.budgetAllocated || 0;
          const budgetPercent = budgetTotal > 0 ? Math.round((budgetUsed / budgetTotal) * 100) : 0;
          
          return (
            <div key={project.id} style={{
              background: 'rgba(30, 41, 59, 0.5)',
              border: '1px solid rgba(71, 85, 105, 0.4)',
              borderRadius: '12px',
              padding: '20px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'white' }}>{project.name}</h3>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  fontSize: '10px',
                  background: project.state === 'EXECUTING' ? 'rgba(6, 182, 212, 0.15)' : 
                             project.state === 'COMPLETE' ? 'rgba(16, 185, 129, 0.15)' :
                             'rgba(71, 85, 105, 0.3)',
                  color: project.state === 'EXECUTING' ? '#22d3ee' : 
                         project.state === 'COMPLETE' ? '#34d399' :
                         '#94a3b8',
                }}>{project.state}</span>
              </div>
              <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px' }}>
                {project.description || 'No description'}
              </p>
              
              {/* Progress */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                  <span style={{ color: '#94a3b8' }}>Progress</span>
                  <span style={{ color: '#22d3ee' }}>{project.progress}%</span>
                </div>
                <div style={{ height: '6px', background: '#1e293b', borderRadius: '9999px' }}>
                  <div style={{ height: '100%', background: '#06b6d4', borderRadius: '9999px', width: `${project.progress}%` }} />
                </div>
              </div>

              {/* Budget */}
              {budgetTotal > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                    <span style={{ color: '#94a3b8' }}>Budget</span>
                    <span style={{ color: budgetPercent > 80 ? '#f87171' : '#22d3ee' }}>
                      ${budgetUsed.toLocaleString()} / ${budgetTotal.toLocaleString()}
                    </span>
                  </div>
                  <div style={{ height: '4px', background: '#1e293b', borderRadius: '9999px' }}>
                    <div style={{ 
                      height: '100%', 
                      background: budgetPercent > 80 ? '#ef4444' : '#10b981', 
                      borderRadius: '9999px', 
                      width: `${Math.min(budgetPercent, 100)}%` 
                    }} />
                  </div>
                </div>
              )}

              {/* Meta */}
              <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#64748b' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FolderKanban className="w-3 h-3" /> {project.portfolio.name}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Bot className="w-3 h-3" /> {project._count.tasks} tasks
                </span>
              </div>

              {/* Blocked tasks warning */}
              {project.tasks.some(t => t.status === 'BLOCKED') && (
                <div style={{
                  marginTop: '12px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  fontSize: '11px',
                  color: '#f87171',
                }}>
                  ⚠️ {project.tasks.filter(t => t.status === 'BLOCKED').length} blocked tasks
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px',
          color: '#64748b',
        }}>
          <FolderKanban className="w-12 h-12" style={{ marginBottom: '16px', opacity: 0.5 }} />
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>No projects found</p>
          <p style={{ fontSize: '13px' }}>Create a new project to get started</p>
        </div>
      )}
    </DashboardLayout>
  );
}
