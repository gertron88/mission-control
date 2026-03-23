'use client'

import { useEffect, useState } from 'react'
import { Activity, GitCommit, CheckCircle2, AlertTriangle } from 'lucide-react'

interface ActivityItem {
  id: string
  type: string
  description: string
  actorName: string
  createdAt: string
}

const typeIcons: Record<string, React.ElementType> = {
  TASK_COMPLETED: CheckCircle2,
  TASK_BLOCKED: AlertTriangle,
  default: Activity,
}

const typeColors: Record<string, string> = {
  TASK_COMPLETED: 'text-green-500',
  TASK_BLOCKED: 'text-red-500',
  default: 'text-slate-400',
}

export function RecentActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // In a real app, this would fetch from /api/activities
    // For now, showing static example data
    setActivities([
      { id: '1', type: 'TASK_COMPLETED', description: 'Task #42 completed: Build exchange connector', actorName: '@claw-builder', createdAt: new Date().toISOString() },
      { id: '2', type: 'TASK_BLOCKED', description: 'Task #43 blocked: Waiting for credentials', actorName: '@claw-trader', createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
      { id: '3', type: 'default', description: 'Project "Trading Bot v1" moved to EXECUTING', actorName: '@claw-captain', createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString() },
    ])
    setLoading(false)
  }, [])

  const formatTime = (date: string) => {
    const now = new Date()
    const then = new Date(date)
    const diff = Math.floor((now.getTime() - then.getTime()) / 1000 / 60) // minutes
    
    if (diff < 1) return 'Just now'
    if (diff < 60) return `${diff}m ago`
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
    return `${Math.floor(diff / 1440)}d ago`
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="p-6 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
      </div>

      <div className="divide-y divide-slate-200">
        {activities.map((activity) => {
          const Icon = typeIcons[activity.type] || typeIcons.default
          const color = typeColors[activity.type] || typeColors.default

          return (
            <div key={activity.id} className="p-4 flex items-start gap-3">
              <div className={`mt-0.5 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-900">{activity.description}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activity.actorName} • {formatTime(activity.createdAt)}
                </p>
              </div>
            </div>
          )
        })}

        {activities.length === 0 && !loading && (
          <div className="p-8 text-center text-slate-500">
            No recent activity
          </div>
        )}
      </div>
    </div>
  )
}
