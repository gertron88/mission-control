'use client'

import { useAgents } from '@/hooks/useAgents'
import { Bot, Circle, AlertCircle } from 'lucide-react'

const statusColors: Record<string, string> = {
  ONLINE: 'bg-green-500',
  BUSY: 'bg-yellow-500',
  AWAY: 'bg-orange-500',
  OFFLINE: 'bg-slate-400',
  ERROR: 'bg-red-500',
}

const statusLabels: Record<string, string> = {
  ONLINE: 'Online',
  BUSY: 'Busy',
  AWAY: 'Away',
  OFFLINE: 'Offline',
  ERROR: 'Error',
}

export function AgentStatus() {
  const { agents, loading } = useAgents()

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-200 rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-slate-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="p-6 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">Agent Status</h2>
      </div>

      <div className="divide-y divide-slate-200">
        {agents.map((agent) => (
          <div key={agent.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                  <Bot className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <div className="font-medium text-slate-900">{agent.handle}</div>
                  <div className="text-sm text-slate-500">{agent.role.replace('_', ' ')}</div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm text-slate-500">
                    {agent._count?.assignedTasks || 0} tasks
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className={`w-2 h-2 rounded-full ${statusColors[agent.status]}`} />
                    <span className="text-xs text-slate-600">{statusLabels[agent.status]}</span>
                  </div>
                </div>

                <div className="w-16">
                  <div className="h-1.5 bg-slate-200 rounded-full">
                    <div 
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${(agent.currentLoad / agent.maxLoad) * 100}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-500 text-center mt-1">
                    {agent.currentLoad}/{agent.maxLoad}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
