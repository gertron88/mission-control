'use client';

import { useState, useEffect } from 'react';
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
  assignee: {
    id: string;
    name: string;
    handle: string;
  } | null;
  project: {
    id: string;
    name: string;
    slug: string;
  };
  dueDate: string | null;
  estimatedEffort: number | null;
  actualEffort: number | null;
  createdAt: string;
}

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

function formatDueDate(dueDate: string | null): string {
  if (!dueDate) return 'No due date';
  const date = new Date(dueDate);
  const now = new Date();
  const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'Overdue';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays < 7) return `In ${diffDays} days`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getDueDateColor(dueDate: string | null, status: TaskStatus): string {
  if (status === 'COMPLETE') return '#34d399';
  if (!dueDate) return '#94a3b8';
  
  const date = new Date(dueDate);
  const now = new Date();
  const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return '#f87171';
  if (diffDays === 0) return '#fbbf24';
  return '#94a3b8';
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    async function fetchTasks() {
      try {
        const response = await fetch('/api/tasks');
        if (!response.ok) throw new Error('Failed to fetch tasks');
        const data = await response.json();
        setTasks(data.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchTasks();
  }, []);

  const filteredTasks = tasks.filter((t) => {
    const matchStatus = filter === 'All' || t.status === filter;
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
                       t.description.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const runningCount = tasks.filter(t => t.status === 'RUNNING').length;

  if (loading) {
    return (
      <DashboardLayout title="Tasks" subtitle="Loading...">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
          <div style={{ color: '#22d3ee' }}>Loading tasks...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Tasks" subtitle="Error">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
          <div style={{ color: '#f87171' }}>Error: {error}</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Tasks"
      subtitle={`${tasks.length} total — ${runningCount} running`}
      actions={
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
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
          }}
        >
          <Plus className="w-4 h-4" />
          New Task
        </button>
      }
    >
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Queued', value: tasks.filter(t => t.status === 'QUEUED').length, color: '#94a3b8' },
          { label: 'Running', value: runningCount, color: '#22d3ee' },
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
                  <div
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    style={{
                      background: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid rgba(71, 85, 105, 0.4)',
                      borderRadius: '10px',
                      padding: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
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
                          }}>{task.assignee.name.charAt(0)}</div>
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
                        <span style={{ fontSize: '11px', color: '#64748b' }}>{task.project.name}</span>
                      </div>
                      <span style={{
                        fontSize: '10px',
                        color: getDueDateColor(task.dueDate, task.status),
                      }}>
                        {formatDueDate(task.dueDate)}
                      </span>
                    </div>

                    {/* Effort indicator */}
                    {task.estimatedEffort && (
                      <div style={{ 
                        marginTop: '8px', 
                        paddingTop: '8px', 
                        borderTop: '1px solid rgba(71, 85, 105, 0.3)',
                        fontSize: '10px',
                        color: '#64748b',
                      }}>
                        Est: {task.estimatedEffort}h
                        {task.actualEffort && ` • Actual: ${task.actualEffort}h`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {/* Task Detail Modal */}
      {selectedTask && (
        <div
          onClick={() => setSelectedTask(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '24px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#1e293b',
              border: '1px solid rgba(71, 85, 105, 0.5)',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '520px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>#{selectedTask.number}</span>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '4px',
                background: `${priorityColors[selectedTask.priority]}20`,
                color: priorityColors[selectedTask.priority],
              }}>{selectedTask.priority}</span>
              <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#334155', color: '#e2e8f0' }}>{selectedTask.status}</span>
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>{selectedTask.title}</h2>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px', lineHeight: 1.5 }}>{selectedTask.description}</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Project</p>
                <p style={{ fontSize: '13px', color: '#e2e8f0' }}>{selectedTask.project.name}</p>
              </div>
              <div>
                <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Assignee</p>
                <p style={{ fontSize: '13px', color: '#e2e8f0' }}>{selectedTask.assignee?.name || 'Unassigned'}</p>
              </div>
              <div>
                <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Due</p>
                <p style={{ fontSize: '13px', color: '#e2e8f0' }}>{formatDueDate(selectedTask.dueDate)}</p>
              </div>
              <div>
                <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Effort</p>
                <p style={{ fontSize: '13px', color: '#e2e8f0' }}>Est: {selectedTask.estimatedEffort ?? '—'}h {selectedTask.actualEffort ? `• Actual: ${selectedTask.actualEffort}h` : ''}</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedTask(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(71, 85, 105, 0.5)',
                  background: 'transparent',
                  color: '#94a3b8',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Info Modal */}
      {showCreateModal && (
        <div
          onClick={() => setShowCreateModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '24px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#1e293b',
              border: '1px solid rgba(71, 85, 105, 0.5)',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '520px',
              width: '100%',
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>Create a Task</h2>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px', lineHeight: 1.5 }}>
              Tasks are created by agents through the API. Any connected agent can create a task for itself or another agent.
            </p>
            <div style={{
              background: '#0f172a',
              borderRadius: '8px',
              padding: '12px',
              fontFamily: 'monospace',
              fontSize: '11px',
              color: '#22d3ee',
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              marginBottom: '20px',
            }}>
{`POST /api/tasks/create
Headers: x-api-key: YOUR_AGENT_API_KEY
Body:
{
  "title": "My new task",
  "description": "What needs to be done",
  "projectId": "...",
  "priority": "HIGH"
}`}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(71, 85, 105, 0.5)',
                  background: 'transparent',
                  color: '#94a3b8',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >Close</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
