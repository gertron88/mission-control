'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { FolderKanban, Search, Plus, Bot, Calendar } from 'lucide-react';

 type ProjectStatus = 'Executing' | 'Proposed' | 'Complete' | 'Blocked' | 'Paused';

interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  progress: number;
  budgetUsed: number;
  budgetTotal: number;
  agents: number;
  tasks: { total: number; done: number };
  tags: string[];
  team: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  deadline: string;
}

const projects: Project[] = [
  {
    id: 'p-001',
    name: 'DataMesh Core',
    description: 'Distributed semantic vector pipeline with real-time indexing across 15 data sources.',
    status: 'Executing',
    progress: 68,
    budgetUsed: 4200,
    budgetTotal: 7500,
    agents: 3,
    tasks: { total: 24, done: 16 },
    tags: ['ML', 'Vector DB', 'ETL'],
    team: ['AT', 'NX', 'PR'],
    priority: 'critical',
    deadline: 'Apr 15, 2026',
  },
  {
    id: 'p-002',
    name: 'FinOps Suite',
    description: 'Automated financial operations assistant handling P&L analysis and forecasting.',
    status: 'Executing',
    progress: 41,
    budgetUsed: 2800,
    budgetTotal: 12000,
    agents: 2,
    tasks: { total: 38, done: 15 },
    tags: ['Finance', 'NLP', 'Compliance'],
    team: ['NX', 'CI'],
    priority: 'high',
    deadline: 'May 1, 2026',
  },
  {
    id: 'p-003',
    name: 'NLP Pipeline',
    description: 'End-to-end natural language processing pipeline with entity extraction.',
    status: 'Blocked',
    progress: 55,
    budgetUsed: 3100,
    budgetTotal: 5000,
    agents: 1,
    tasks: { total: 18, done: 10 },
    tags: ['NLP', 'Transformers'],
    team: ['CI', 'FG'],
    priority: 'high',
    deadline: 'Apr 20, 2026',
  },
  {
    id: 'p-004',
    name: 'Analytics Engine',
    description: 'Predictive analytics and ML model orchestration platform.',
    status: 'Executing',
    progress: 82,
    budgetUsed: 6800,
    budgetTotal: 8000,
    agents: 2,
    tasks: { total: 31, done: 25 },
    tags: ['ML Ops', 'Analytics'],
    team: ['PR', 'VX'],
    priority: 'medium',
    deadline: 'Apr 10, 2026',
  },
  {
    id: 'p-005',
    name: 'CRM Automation',
    description: 'AI-driven CRM workflows for lead scoring and customer journey mapping.',
    status: 'Blocked',
    progress: 29,
    budgetUsed: 1200,
    budgetTotal: 9000,
    agents: 1,
    tasks: { total: 42, done: 12 },
    tags: ['CRM', 'Automation'],
    team: ['VX', 'EC'],
    priority: 'critical',
    deadline: 'Apr 25, 2026',
  },
  {
    id: 'p-006',
    name: 'Intel Ops',
    description: 'Competitive intelligence gathering with real-time web monitoring.',
    status: 'Executing',
    progress: 33,
    budgetUsed: 980,
    budgetTotal: 4500,
    agents: 1,
    tasks: { total: 15, done: 5 },
    tags: ['Research', 'Web Scraping'],
    team: ['EC'],
    priority: 'medium',
    deadline: 'May 10, 2026',
  },
];

const statusConfig: Record<ProjectStatus, { color: string; bg: string; dot: string }> = {
  Executing: { color: '#22d3ee', bg: 'rgba(6, 182, 212, 0.15)', dot: '#22d3ee' },
  Proposed: { color: '#94a3b8', bg: 'rgba(71, 85, 105, 0.3)', dot: '#94a3b8' },
  Complete: { color: '#34d399', bg: 'rgba(16, 185, 129, 0.15)', dot: '#34d399' },
  Blocked: { color: '#f87171', bg: 'rgba(239, 68, 68, 0.15)', dot: '#f87171' },
  Paused: { color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.15)', dot: '#fbbf24' },
};

const priorityConfig = {
  critical: { label: 'P0', color: '#f87171', bg: 'rgba(239, 68, 68, 0.15)' },
  high: { label: 'P1', color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.15)' },
  medium: { label: 'P2', color: '#22d3ee', bg: 'rgba(6, 182, 212, 0.15)' },
  low: { label: 'P3', color: '#94a3b8', bg: 'rgba(71, 85, 105, 0.4)' },
};

const tagColors = ['bg-slate-700/50 text-slate-300', 'bg-cyan-500/10 text-cyan-400', 'bg-purple-500/10 text-purple-400'];

export default function ProjectsPage() {
  const [filter, setFilter] = useState<ProjectStatus | 'All'>('All');
  const [search, setSearch] = useState('');

  const filtered = projects.filter((p) => {
    const matchStatus = filter === 'All' || p.status === filter;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                       p.description.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <DashboardLayout
      title="Projects"
      subtitle={`${projects.length} total — ${projects.filter(p => p.status === 'Executing').length} executing`}
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
          {['All', 'Executing', 'Proposed', 'Complete', 'Blocked'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as ProjectStatus | 'All')}
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
              <span style={{ marginLeft: '6px', fontSize: '10px', fontFamily: 'monospace', opacity: 0.6 }}>
                {f === 'All' ? projects.length : projects.filter(p => p.status === f).length}
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
        {filtered.map((project) => {
          const scfg = statusConfig[project.status];
          const pcfg = priorityConfig[project.priority];
          const budgetPct = Math.round((project.budgetUsed / project.budgetTotal) * 100);
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
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{
                      fontSize: '10px',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: pcfg.bg,
                      color: pcfg.color,
                    }}>{pcfg.label}</span>
                    <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#475569' }}>{project.id}</span>
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
                  border: `1px solid ${scfg.color}40`,
                  background: scfg.bg,
                  color: scfg.color,
                }}>
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: scfg.dot,
                    animation: project.status === 'Executing' ? 'pulse 2s infinite' : undefined,
                  }}></span>
                  {project.status}
                </span>
              </div>

              <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>{project.description}</p>

              {/* Tags */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {project.tags.map((tag, i) => (
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

              {/* Progress */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>Progress</span>
                  <span style={{
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    color: project.progress >= 80 ? '#34d399' : project.progress >= 50 ? '#22d3ee' : '#fbbf24',
                  }}>{project.progress}%</span>
                </div>
                <div style={{ height: '6px', background: '#1e293b', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    borderRadius: '9999px',
                    background: project.progress >= 80 ? '#10b981' : project.progress >= 50 ? '#06b6d4' : '#f59e0b',
                    width: `${project.progress}%`,
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ fontSize: '10px', color: '#475569', fontFamily: 'monospace' }}>{project.tasks.done}/{project.tasks.total} tasks</span>
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
                  }}>${project.budgetUsed.toLocaleString()} / ${project.budgetTotal.toLocaleString()}</span>
                </div>
                <div style={{ height: '4px', background: '#1e293b', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    borderRadius: '9999px',
                    background: budgetPct >= 90 ? '#ef4444' : budgetPct >= 70 ? '#f59e0b' : '#a855f7',
                    width: `${Math.min(budgetPct, 100)}%`,
                  }} />
                </div>
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid rgba(71, 85, 105, 0.4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: '#64748b' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Bot className="w-3 h-3" />{project.agents}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar className="w-3 h-3" />{project.deadline}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {project.team.map((t, i) => (
                    <div key={i} style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #475569, #334155)',
                      border: '1px solid #475569',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginLeft: i > 0 ? '-4px' : 0,
                      fontSize: '8px',
                      fontWeight: 700,
                      color: '#cbd5e1',
                    }}>{t}</div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
