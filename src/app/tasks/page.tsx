'use client'

export const dynamic = 'force-dynamic'

import { Sidebar } from '@/components/layout/Sidebar'
import { TaskBoard } from '@/components/tasks/TaskBoard'

export default function TasksPage() {
  return (
    <div className="flex">
      <Sidebar />
      <div className="ml-64 flex-1 p-8 bg-slate-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Task Board</h1>
              <p className="text-slate-500">Manage and track all agent tasks</p>
            </div>
          </div>

          <TaskBoard />
        </div>
      </div>
    </div>
  )
}