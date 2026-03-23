'use client'

import { useProjects } from '@/hooks/useProjects'
import { useAgents } from '@/hooks/useAgents'
import { useTasks } from '@/hooks/useTasks'
import { 
  FolderKanban, 
  CheckCircle2, 
  AlertCircle, 
  Bot,
  TrendingUp,
  Clock
} from 'lucide-react'

export function DashboardStats() {
  const { projects } = useProjects()
  const { agents } = useAgents()
  const { tasks } = useTasks()

  const activeProjects = projects.filter(p => ['EXECUTING', 'PLANNING'].includes(p.state)).length
  const blockedTasks = tasks.filter(t => t.status === 'BLOCKED').length
  const onlineAgents = agents.filter(a => a.status === 'ONLINE').length
  const totalAgents = agents.length

  const stats = [
    { 
      name: 'Active Projects', 
      value: activeProjects, 
      icon: FolderKanban, 
      color: 'bg-blue-500',
      total: projects.length 
    },
    { 
      name: 'Blocked Tasks', 
      value: blockedTasks, 
      icon: AlertCircle, 
      color: 'bg-red-500',
      alert: blockedTasks > 0 
    },
    { 
      name: 'Online Agents', 
      value: `${onlineAgents}/${totalAgents}`, 
      icon: Bot, 
      color: 'bg-green-500' 
    },
    { 
      name: 'Tasks Complete', 
      value: tasks.filter(t => t.status === 'COMPLETE').length, 
      icon: CheckCircle2, 
      color: 'bg-purple-500',
      total: tasks.length 
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div 
          key={stat.name} 
          className={`bg-white rounded-xl p-6 shadow-sm border ${stat.alert ? 'border-red-200 bg-red-50' : 'border-slate-200'}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.name}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {stat.value}
                {stat.total !== undefined && (
                  <span className="text-sm font-normal text-slate-400 ml-1">/ {stat.total}</span>
                )}
              </p>
            </div>
            <div className={`${stat.color} p-3 rounded-lg`}>
              <stat.icon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
