'use client';

import { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Bot, 
  FolderKanban, 
  CheckSquare,
  GitBranch,
  AlertTriangle
} from 'lucide-react';

interface Activity {
  id: string;
  type: string;
  actorName: string;
  actorType: 'AGENT' | 'HUMAN' | 'SYSTEM';
  resourceType: string;
  resourceName: string;
  message: string;
  timestamp: string;
}

const activityIcons: Record<string, React.ReactNode> = {
  TASK_CREATED: <CheckSquare className="w-4 h-4" />,
  TASK_COMPLETED: <CheckCircle className="w-4 h-4" />,
  TASK_STARTED: <Clock className="w-4 h-4" />,
  TASK_BLOCKED: <AlertCircle className="w-4 h-4" />,
  PROJECT_CREATED: <FolderKanban className="w-4 h-4" />,
  CODE_PUSHED: <GitBranch className="w-4 h-4" />,
  AGENT_CONNECTED: <Bot className="w-4 h-4" />,
  ERROR_OCCURRED: <AlertTriangle className="w-4 h-4" />,
};

const activityColors: Record<string, string> = {
  TASK_CREATED: '#22d3ee',
  TASK_COMPLETED: '#34d399',
  TASK_STARTED: '#fbbf24',
  TASK_BLOCKED: '#f87171',
  PROJECT_CREATED: '#a78bfa',
  CODE_PUSHED: '#22d3ee',
  AGENT_CONNECTED: '#34d399',
  ERROR_OCCURRED: '#f87171',
};

function formatTimeAgo(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    async function fetchActivities() {
      try {
        const response = await fetch('/api/activity');
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setActivities(data);
      } catch (err) {
        // Fallback to empty if API not ready
        setActivities([]);
      } finally {
        setLoading(false);
      }
    }
    fetchActivities();
    
    // Poll every 30 seconds
    const interval = setInterval(fetchActivities, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredActivities = filter === 'ALL' 
    ? activities 
    : activities.filter(a => a.type === filter);

  if (loading) {
    return (
      <div style={{ 
        background: 'rgba(30, 41, 59, 0.5)', 
        borderRadius: '12px',
        padding: '20px',
        minHeight: '300px'
      }}>
        <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
          Activity Feed
        </h3>
        <div style={{ color: '#64748b', fontSize: '14px' }}>Loading activities...</div>
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
      minHeight: '300px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Activity Feed
        </h3>
        <select 
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(71, 85, 105, 0.4)',
            borderRadius: '6px',
            padding: '4px 8px',
            fontSize: '11px',
            color: '#94a3b8',
            cursor: 'pointer'
          }}
        >
          <option value="ALL">All</option>
          <option value="TASK_COMPLETED">Completed</option>
          <option value="TASK_STARTED">Started</option>
          <option value="CODE_PUSHED">Code</option>
        </select>
      </div>

      {activities.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
          <Clock className="w-8 h-8" style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          <p style={{ fontSize: '13px' }}>No recent activity</p>
          <p style={{ fontSize: '11px', marginTop: '4px' }}>Activities will appear as agents work</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredActivities.slice(0, 20).map((activity) => {
            const icon = activityIcons[activity.type] || <Clock className="w-4 h-4" />;
            const color = activityColors[activity.type] || '#94a3b8';
            
            return (
              <div 
                key={activity.id}
                style={{
                  display: 'flex',
                  gap: '12px',
                  padding: '12px',
                  borderRadius: '8px',
                  background: 'rgba(15, 23, 42, 0.4)',
                  border: '1px solid rgba(71, 85, 105, 0.3)',
                }}
              >
                <div style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '8px', 
                  background: `${color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: color,
                  flexShrink: 0
                }}>
                  {icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '13px', color: '#e2e8f0', marginBottom: '4px' }}>
                    {activity.message}
                  </p>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: '#64748b' }}>
                    <span>{activity.actorName}</span>
                    <span>•</span>
                    <span>{formatTimeAgo(activity.timestamp)}</span>
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
