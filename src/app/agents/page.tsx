'use client'

export const dynamic = 'force-dynamic'

import { Sidebar } from '@/components/layout/Sidebar'
import { useAgents } from '@/hooks/useAgents'
import { Bot, Star, Activity, CheckCircle2 } from 'lucide-react'

const statusColors: Record<string, string> = {
  ONLINE: 'bg-green-500',
  BUSY: 'bg-yellow-500',
  AWAY: 'bg-orange-500',
  OFFLINE: 'bg-slate-400',
  ERROR: 'bg-red-500',
}

export default function AgentsPage() {
  const { data: agents, isLoading: loading } = useAgents()

  return (
    <div className="flex">
      <Sidebar />
      <div className="ml-64 flex-1 p-8 bg-slate-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Agents</h1>
            <p className="text-slate-500">Monitor and manage your AI agent workforce</p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
                  <div className="h-16 bg-slate-200 rounded mb-4"></div>
                  <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {agents?.map((agent) => (
                <div key={agent.id} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center">
                        <Bot className="w-7 h-7 text-slate-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-slate-900">{agent.handle}</h2>
                        <p className="text-slate-500">{agent.name}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${statusColors[agent.status]}`} />
                      <span className="text-sm text-slate-600">{agent.status}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-slate-900">{agent._count?.assignedTasks || 0}</div>
                      <div className="text-xs text-slate-500">Active Tasks</div>
                    </div>
                    
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-slate-900">{Math.round((agent.trustLevel || 0) * 100)}%</div>
                      <div className="text-xs text-slate-500">Trust Level</div>
                    </div>
                    
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-slate-900">{agent.currentLoad}/{agent.maxLoad}</div>
                      <div className="text-xs text-slate-500">Load</div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-slate-700 mb-2">Capabilities</h3>
                    <div className="flex flex-wrap gap-2">
                      {agent.capabilities.slice(0, 6).map((cap) => (
                        <span 
                          key={cap} 
                          className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
                        >
                          {cap.replace('_', ' ')}
                        </span>
                      ))}
                      {agent.capabilities.length > 6 && (
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full">
                          +{agent.capabilities.length - 6} more
                        </span>
                      )}
                    </div>
                  </div>

                  {agent.performanceStats && (
                    <div className="border-t border-slate-200 pt-4">
                      <h3 className="text-sm font-medium text-slate-700 mb-2">Performance</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-slate-500">Success Rate</div>
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span className="font-medium">{Math.round((agent.performanceStats as Record<string, number>).success_rate * 100)}%</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-slate-500">Tasks Completed</div>
                          <div className="font-medium">{(agent.performanceStats as Record<string, number>).tasks_completed}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
