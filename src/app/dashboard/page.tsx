import { getDashboardStats } from './actions'
import StatusCards from '@/components/dashboard/StatusCards'
import { formatDistanceToNow } from 'date-fns'

export default async function DashboardPage() {
  const { projects, tasks, agents, stats } = await getDashboardStats()

  return (
    <div style={{ padding: '24px' }}>
      {/* Status Cards */}
      <StatusCards stats={stats} />

      {/* Main Content Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: '24px',
        marginTop: '24px'
      }}>
        {/* Active Tasks */}
        <div style={{
          background: 'rgba(30, 41, 59, 0.7)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(148, 163, 184, 0.1)',
          borderRadius: '12px',
          padding: '20px',
        }}>
          <h2 style={{ 
            fontSize: '18px', 
            fontWeight: 600, 
            color: '#f8fafc',
            marginBottom: '16px'
          }}>
            Active Tasks
          </h2>
          {tasks.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>No tasks found</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {tasks.map((task) => (
                <div key={task.id} style={{
                  padding: '12px',
                  background: 'rgba(15, 23, 42, 0.5)',
                  borderRadius: '8px',
                  borderLeft: `4px solid ${getPriorityColor(task.priority)}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#f8fafc', fontWeight: 500 }}>{task.title}</span>
                    <span style={{ 
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      background: getStatusBg(task.status),
                      color: getStatusColor(task.status),
                    }}>
                      {task.status}
                    </span>
                  </div>
                  <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
                    {task.project?.name || 'No project'} • {task.assignee?.handle || 'Unassigned'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Projects */}
        <div style={{
          background: 'rgba(30, 41, 59, 0.7)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(148, 163, 184, 0.1)',
          borderRadius: '12px',
          padding: '20px',
        }}>
          <h2 style={{ 
            fontSize: '18px', 
            fontWeight: 600, 
            color: '#f8fafc',
            marginBottom: '16px'
          }}>
            Active Projects
          </h2>
          {projects.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>No projects found</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {projects.map((project) => (
                <div key={project.id} style={{
                  padding: '12px',
                  background: 'rgba(15, 23, 42, 0.5)',
                  borderRadius: '8px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#f8fafc', fontWeight: 500 }}>{project.name}</span>
                    <span style={{ color: '#94a3b8', fontSize: '14px' }}>
                      {project.progress}%
                    </span>
                  </div>
                  <div style={{ 
                    height: '6px', 
                    background: 'rgba(148, 163, 184, 0.2)', 
                    borderRadius: '3px',
                    marginTop: '8px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${project.progress}%`,
                      background: '#10b981',
                      borderRadius: '3px',
                    }} />
                  </div>
                  <p style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>
                    ${project.budgetSpent?.toString() || 0} / ${project.budgetAllocated?.toString() || 0}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Agent Status */}
        <div style={{
          background: 'rgba(30, 41, 59, 0.7)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(148, 163, 184, 0.1)',
          borderRadius: '12px',
          padding: '20px',
        }}>
          <h2 style={{ 
            fontSize: '18px', 
            fontWeight: 600, 
            color: '#f8fafc',
            marginBottom: '16px'
          }}>
            Agent Status
          </h2>
          {agents.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>No agents found</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {agents.map((agent) => (
                <div key={agent.id} style={{
                  padding: '12px',
                  background: 'rgba(15, 23, 42, 0.5)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}>
                  <div style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: getAgentStatusColor(agent.status),
                  }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ color: '#f8fafc', fontWeight: 500 }}>{agent.name}</span>
                    <span style={{ color: '#94a3b8', fontSize: '12px', marginLeft: '8px' }}>
                      {agent.handle}
                    </span>
                  </div>
                  <span style={{ 
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    background: getAgentStatusBg(agent.status),
                    color: getAgentStatusColor(agent.status),
                  }}>
                    {agent.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Helper functions
function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    CRITICAL: '#ef4444',
    HIGH: '#f97316',
    MEDIUM: '#eab308',
    LOW: '#22c55e',
  }
  return colors[priority] || '#94a3b8'
}

function getStatusBg(status: string): string {
  const bgs: Record<string, string> = {
    RUNNING: 'rgba(59, 130, 246, 0.2)',
    QUEUED: 'rgba(148, 163, 184, 0.2)',
    COMPLETE: 'rgba(34, 197, 94, 0.2)',
    BLOCKED: 'rgba(239, 68, 68, 0.2)',
  }
  return bgs[status] || 'rgba(148, 163, 184, 0.2)'
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    RUNNING: '#60a5fa',
    QUEUED: '#94a3b8',
    COMPLETE: '#4ade80',
    BLOCKED: '#f87171',
  }
  return colors[status] || '#94a3b8'
}

function getAgentStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ONLINE: '#22c55e',
    BUSY: '#3b82f6',
    AWAY: '#eab308',
    OFFLINE: '#64748b',
    ERROR: '#ef4444',
  }
  return colors[status] || '#64748b'
}

function getAgentStatusBg(status: string): string {
  const bgs: Record<string, string> = {
    ONLINE: 'rgba(34, 197, 94, 0.2)',
    BUSY: 'rgba(59, 130, 246, 0.2)',
    AWAY: 'rgba(234, 179, 8, 0.2)',
    OFFLINE: 'rgba(100, 116, 139, 0.2)',
    ERROR: 'rgba(239, 68, 68, 0.2)',
  }
  return bgs[status] || 'rgba(100, 116, 139, 0.2)'
}
