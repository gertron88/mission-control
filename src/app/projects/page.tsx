'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { FolderKanban, Search, Plus, Bot, Calendar } from 'lucide-react';

const projects = [
  {
    id: 'p-001',
    name: 'DataMesh Core',
    description: 'Distributed semantic vector pipeline with real-time indexing.',
    status: 'Executing',
    progress: 68,
    budgetUsed: 4200,
    budgetTotal: 7500,
    agents: 3,
    tasks: { total: 24, done: 16 },
    tags: ['ML', 'Vector DB', 'ETL'],
    deadline: 'Apr 15, 2026',
  },
  {
    id: 'p-002',
    name: 'FinOps Suite',
    description: 'Automated financial operations assistant.',
    status: 'Executing',
    progress: 41,
    budgetUsed: 2800,
    budgetTotal: 12000,
    agents: 2,
    tasks: { total: 38, done: 15 },
    tags: ['Finance', 'NLP'],
    deadline: 'May 1, 2026',
  },
];

export default function ProjectsPage() {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  const filtered = projects.filter((p) => {
    const matchStatus = filter === 'All' || p.status === filter;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <DashboardLayout
      title="Projects"
      subtitle="2 total — 2 executing"
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
          {['All', 'Executing', 'Complete', 'Blocked'].map((f) => (
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
        {filtered.map((project) => (
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
                background: project.status === 'Executing' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: project.status === 'Executing' ? '#22d3ee' : '#34d399',
              }}>{project.status}</span>
            </div>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px' }}>{project.description}</p>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                <span style={{ color: '#94a3b8' }}>Progress</span>
                <span style={{ color: '#22d3ee' }}>{project.progress}%</span>
              </div>
              <div style={{ height: '6px', background: '#1e293b', borderRadius: '9999px' }}>
                <div style={{ height: '100%', background: '#06b6d4', borderRadius: '9999px', width: project.progress + '%' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#64748b' }}>
              <span><Bot className="w-3 h-3" /> {project.agents}</span>
              <span><Calendar className="w-3 h-3" /> {project.deadline}</span>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
