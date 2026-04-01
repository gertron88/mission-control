'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { CheckSquare, Clock, AlertCircle, Search, Plus, Filter } from 'lucide-react';

 type TaskStatus = 'QUEUED' | 'READY' | 'RUNNING' | 'AWAITING_VALIDATION' | 'COMPLETE' | 'BLOCKED';
 type TaskPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

interface Task {
  id: string;
  number: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string | null;
  project: string;
  dueDate: string;
  estimatedHours: number;
}

const tasks: Task[] = [
  {
    id: 't-001',
    number: 1247,
    title: 'Vector Index Optimization',
    description: 'Optimize FAISS index for semantic search queries',
    status: 'RUNNING',
    priority: 'HIGH',
    assignee: 'Atlas-7',
    project: 'DataMesh',
    dueDate: 'Today',
    estimatedHours: 4,
  },
  {
    id: 't-002',
    number: 1248,
    title: 'Q1 Financial Report',
    description: 'Aggregate and analyze Q1 2026 financial data',
    status: 'RUNNING',
    priority: 'CRITICAL',
    assignee: 'Nexus-3',
    project: 'FinOps',
    dueDate: 'Today',
    estimatedHours: 8,
  },
  {
    id: 't-003',
    number: 1249,
    title: 'API Rate Limit Handling',
    description: 'Implement exponential backoff for OpenAI API',
    status: 'BLOCKED',
    priority: 'HIGH',
    assignee: 'Cipher-1',
    project: 'NLP Pipeline',
    dueDate: 'Tomorrow',
    estimatedHours: 3,
  },
  {
    id: 't-004',
    number: 1250,
    title: 'Churn Model Retraining',
    description: 'Retrain churn prediction model with new data',
    status: 'COMPLETE',
    priority: 'MEDIUM',
    assignee: 'Prism-9',
    project: 'Analytics',
    dueDate: 'Yesterday',
    estimatedHours: 6,
  },
  {
    id: 't-005',
    number: 1251,
    title: 'Salesforce Integration',
    description: 'Fix broken OAuth credentials for Salesforce',
    status: 'BLOCKED',
    priority: 'CRITICAL',
    assignee: 'Vortex-4',
    project: 'CRM Auto',
    dueDate: 'Overdue',
    estimatedHours: 2,
  },
  {
    id: 't-006',
    number: 1252,
    title: 'Intel Web Crawl',
    description: 'Scrape competitor pricing and product data',
    status: 'RUNNING',
    priority: 'MEDIUM',
    assignee: 'Echo-2',
    project: 'Intel Ops',
    dueDate: 'Next Week',
    estimatedHours: 12,
  },
  {
    id: 't-007',
    number: 1253,
    title: 'Component Library Gen',
    description: 'Generate React component library from Figma',
    status: 'COMPLETE',
    priority: 'LOW',
    assignee: 'Forge-6',
    project: 'DevAccel',
    dueDate: 'Yesterday',
    estimatedHours: 5,
  },
  {
    id: 't-008',
    number: 1254,
    title: 'Inventory Reconciliation',
    description: 'Match inventory records across 3 systems',
    status: 'QUEUED',
    priority: 'HIGH',
    assignee: null,
    project: 'SupplyChain',
    dueDate: 'Tomorrow',
    estimatedHours: 6,
  },
];

const columns: { status: TaskStatus; label: string; color: string }[] = [
  { status: 'QUEUED', label: 'Queued', color: '#94a3b8' },
  { status: 'RUNNING', label: 'Running', color: '#22d3ee' },
  { status: 'BLOCKED', label: 'Blocked', color: '#f87171' },
  { status: 'COMPLETE', label: 'Complete', color: '#34d399' },
];

const priorityColors: Record<TaskPriority, string> = {
  CRITICAL: '#f87171',
  HIGH: '#fbbf24',
  MEDIUM: '#22d3ee',
  LOW: '#94a3b8',
};

const statusIcons: Record<TaskStatus, React.ReactNode> = {
  QUEUED: <Clock className="w-3 h-3" />,
  READY: <CheckSquare className="w-3 h-3" />,
  RUNNING: <Clock className="w-3 h-3" />,
  AWAITING_VALIDATION: <CheckSquare className="w-3 h-3" />,
  COMPLETE: <CheckSquare className="w-3 h-3" />,
  BLOCKED: <AlertCircle className="w-3 h-3" />,
};

export default function TasksPage() {
  const [filter, setFilter] = useState<string>('All');
  const [search, setSearch] = useState('');

  const filteredTasks = tasks.filter((t) => {
    const matchStatus = filter === 'All' || t.status === filter;
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
                       t.description.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <DashboardLayout
      title="Tasks"
      subtitle={`${tasks.length} total — ${tasks.filter(t => t.status === 'RUNNING').length} running`}
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
          New Task
        </button>
      }
    >
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Queued', value: tasks.filter(t => t.status === 'QUEUED').length, color: '#94a3b8' },
          { label: 'Running', value: tasks.filter(t => t.status === 'RUNNING').length, color: '#22d3ee' },
          { label: 'Blocked', value: tasks.filter(t => t.status === 'BLOCKED').length, color: '#f87171' },
          { label: 'Complete', value: tasks.filter(t => t.status === 'COMPLETE').length, color: '#34d399' },
          { label: 'Critical', value: tasks.filter(t => t.priority === 'CRITICAL').length, color: '#f87171' },
        ].map((stat) => (
          <div key={stat.label} style={{
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid rgba(71, 85, 105, 0.4)',
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: stat.color, fontFamily: 'monospace' }}>{stat.value}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search className="w-4 h-4" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            style={{
              background: 'rgba(30, 41, 59, 0.6)',
              border: '1px solid rgba(71, 85, 105, 0.4)',
              borderRadius: '8px',
              paddingLeft: '36px',
              paddingRight: '16px',
              paddingTop: '10px',
              paddingBottom: '10px',
              fontSize: '14px',
              color: '#cbd5e1',
              width: '100%',
            }}
          />
        </div>
        <button style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          borderRadius: '8px',
          background: 'rgba(30, 41, 59, 0.6)',
          border: '1px solid rgba(71, 85, 105, 0.4)',
          color: '#cbd5e1',
          fontSize: '14px',
          cursor: 'pointer',
        }}>
          <Filter className="w-4 h-4" />
          Filter
        </button>
      </div>

      {/* Kanban Board */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {columns.map((col) => {
          const colTasks = filteredTasks.filter(t => t.status === col.status);
          return (
            <div key={col.status} style={{
              background: 'rgba(15, 23, 42, 0.4)',
              borderRadius: '12px',
              padding: '16px',
            }}>
              {/* Column Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
                paddingBottom: '12px',
                borderBottom: `2px solid ${col.color}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: col.color }}>{statusIcons[col.status]}</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>{col.label}</span>
                </div>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  background: 'rgba(71, 85, 105, 0.4)',
                  color: '#cbd5e1',
                }}>{colTasks.length}</span>
              </div>

              {/* Tasks */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {colTasks.map((task) => (
                  <div key={task.id} style={{
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(71, 85, 105, 0.4)',
                    borderRadius: '10px',
                    padding: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>#{task.number}</span>
                      <span style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: `${priorityColors[task.priority]}20`,
                        color: priorityColors[task.priority],
                      }}>{task.priority}</span>
                    </div>

                    <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>{task.title}</h4>
                    <p style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '12px', lineHeight: 1.4 }}>{task.description}</p>

                    {/* Meta */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {task.assignee ? (
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #06b6d4, #9333ea)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '9px',
                            fontWeight: 700,
                            color: 'white',
                          }}>{task.assignee.charAt(0)}</div>
                        ) : (
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: 'rgba(71, 85, 105, 0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <span style={{ fontSize: '10px', color: '#64748b' }}>?</span>
                          </div>
                        )}
                        <span style={{ fontSize: '11px', color: '#64748b' }}>{task.project}</span>
                      </div>
                      <span style={{
                        fontSize: '10px',
                        color: task.dueDate === 'Overdue' ? '#f87171' : task.dueDate === 'Today' ? '#fbbf24' : '#94a3b8',
                      }}>{task.dueDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
