'use client'

export const dynamic = 'force-dynamic'

import { Sidebar } from '@/components/layout/Sidebar'
import { useProjects } from '@/hooks/useProjects'
import Link from 'next/link'
import { ArrowRight, Plus } from 'lucide-react'

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

export default function ProjectsPage() {
  const { data: projects = [], isLoading: loading } = useProjects()

  return (
    <div className="flex">
      <Sidebar />
      <div className="ml-64 flex-1 p-8 bg-slate-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Portfolio</h1>
              <p className="text-slate-500">Manage all active projects</p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-5 h-5" />
              New Project
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-1/2 mb-4"></div>
                  <div className="h-3 bg-slate-200 rounded w-full mb-2"></div>
                  <div className="h-3 bg-slate-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${stateColors[project.state]}`}>
                      {project.state.replace('_', ' ')}
                    </span>
                    <ArrowRight className="w-5 h-5 text-slate-400" />
                  </div>

                  <h2 className="text-xl font-semibold text-slate-900 mb-2">{project.name}</h2>
                  
                  {project.description && (
                    <p className="text-slate-500 text-sm mb-4 line-clamp-2">{project.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <div>{project._count?.tasks || 0} tasks</div>
                    <div>{project._count?.milestones || 0} milestones</div>
                  </div>

                  {project.budgetAllocated && (
                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-500">Budget</span>
                        <span className="font-medium">
                          ${project.budgetSpent.toLocaleString()} / ${project.budgetAllocated.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full">
                        <div 
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${Math.min(100, (project.budgetSpent / project.budgetAllocated) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
