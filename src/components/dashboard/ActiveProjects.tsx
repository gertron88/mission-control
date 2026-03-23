'use client'

import Link from 'next/link'
import { useProjects } from '@/hooks/useProjects'
import { ArrowRight, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react'

const stateColors: Record<string, string> = {
  PROPOSED: 'bg-gray-100 text-gray-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  PLANNING: 'bg-purple-100 text-purple-700',
  EXECUTING: 'bg-green-100 text-green-700',
  BLOCKED: 'bg-red-100 text-red-700',
  AWAITING_REVIEW: 'bg-yellow-100 text-yellow-700',
  DEPLOYING: 'bg-orange-100 text-orange-700',
  MONITORING: 'bg-teal-100 text-teal-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-red-100 text-red-700',
}

const stateIcons: Record<string, React.ElementType> = {
  BLOCKED: AlertTriangle,
  EXECUTING: Clock,
  COMPLETED: CheckCircle2,
}

export function ActiveProjects() {
  const { projects, loading } = useProjects()

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-200 rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const activeProjects = projects.filter(p => 
    !['COMPLETED', 'ARCHIVED', 'FAILED'].includes(p.state)
  ).slice(0, 5)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Active Projects</h2>
          <Link 
            href="/projects" 
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            View all
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="divide-y divide-slate-200">
        {activeProjects.map((project) => {
          const StateIcon = stateIcons[project.state]
          const blockedCount = project.tasks?.filter(t => t.status === 'BLOCKED').length || 0

          return (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="block p-4 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-slate-900">{project.name}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${stateColors[project.state]}`}>
                      {StateIcon && <StateIcon className="w-3 h-3" />}
                      {project.state.replace('_', ' ')}
                    </span>
                    <span className="text-sm text-slate-500">
                      {project._count?.tasks || 0} tasks
                    </span>
                    
                    {blockedCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-red-600">
                        <AlertTriangle className="w-3 h-3" />
                        {blockedCount} blocked
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  {project.budgetAllocated && (
                    <div className="text-sm text-slate-500">
                      ${project.budgetSpent.toLocaleString()} / ${project.budgetAllocated.toLocaleString()}
                    </div>
                  )}
                  <div className="w-24 h-1.5 bg-slate-200 rounded-full mt-1 ml-auto">
                    <div 
                      className="h-full bg-blue-500 rounded-full"
                      style={{ 
                        width: `${Math.min(100, (project.budgetSpent / (project.budgetAllocated || 1)) * 100)}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            </Link>
          )
        })}

        {activeProjects.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            No active projects
          </div>
        )}
      </div>
    </div>
  )
}
