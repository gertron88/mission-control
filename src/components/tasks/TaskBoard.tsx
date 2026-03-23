'use client'

import { useState } from 'react'
import { useTasks } from '@/hooks/useTasks'
import { TaskCard } from './TaskCard'

const columns = [
  { id: 'QUEUED', label: 'Queued', color: 'bg-slate-100' },
  { id: 'READY', label: 'Ready', color: 'bg-blue-50' },
  { id: 'IN_PROGRESS', label: 'In Progress', color: 'bg-yellow-50' },
  { id: 'BLOCKED', label: 'Blocked', color: 'bg-red-50' },
  { id: 'COMPLETE', label: 'Complete', color: 'bg-green-50' },
]

export function TaskBoard() {
  const { tasks, loading, updateTask } = useTasks()
  const [draggedTask, setDraggedTask] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="grid grid-cols-5 gap-4">
        {columns.map((col) => (
          <div key={col.id} className="bg-slate-100 rounded-lg p-4">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-slate-200 rounded w-20"></div>
              <div className="h-24 bg-slate-200 rounded"></div>
              <div className="h-24 bg-slate-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const handleDragStart = (taskId: string) => {
    setDraggedTask(taskId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, status: string) => {
    e.preventDefault()
    if (draggedTask) {
      await updateTask(draggedTask, { status })
      setDraggedTask(null)
    }
  }

  return (
    <div className="grid grid-cols-5 gap-4 overflow-x-auto">
      {columns.map((column) => {
        const columnTasks = tasks.filter((task) => task.status === column.id)

        return (
          <div
            key={column.id}
            className={`${column.color} rounded-lg p-4 min-h-[500px]`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-700">{column.label}</h3>
              <span className="bg-white px-2 py-0.5 rounded-full text-sm text-slate-600">
                {columnTasks.length}
              </span>
            </div>

            <div className="space-y-3">
              {columnTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  draggable
                  onDragStart={() => handleDragStart(task.id)}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
