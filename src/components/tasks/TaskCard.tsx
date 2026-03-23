import { AlertTriangle, Clock, CheckCircle2, User } from 'lucide-react'

interface Task {
  id: string
  number: number
  title: string
  status: string
  priority: string
  assignee?: {
    handle: string
    name: string
  } | null
  blockerType?: string | null
  blockerReason?: string | null
  dueDate?: string
}

const priorityColors: Record<string, string> = {
  LOW: 'bg-slate-200',
  MEDIUM: 'bg-blue-200',
  HIGH: 'bg-orange-200',
  CRITICAL: 'bg-red-200',
}

interface TaskCardProps {
  task: Task
  draggable?: boolean
  onDragStart?: () => void
}

export function TaskCard({ task, draggable, onDragStart }: TaskCardProps) {
  return (
    <div
      className="bg-white rounded-lg p-4 shadow-sm border border-slate-200 cursor-move hover:shadow-md transition-shadow"
      draggable={draggable}
      onDragStart={onDragStart}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs text-slate-500">TASK-#{task.number}</span>
        <span className={`text-xs px-1.5 py-0.5 rounded ${priorityColors[task.priority]}`}>
          {task.priority}
        </span>
      </div>

      <h4 className="font-medium text-slate-900 mb-2 line-clamp-2">{task.title}</h4>

      {task.blockerType && (
        <div className="flex items-center gap-1.5 text-xs text-red-600 mb-2">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span className="truncate">{task.blockerType.replace('_', ' ')}</span>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5" />
          <span>{task.assignee?.handle || 'Unassigned'}</span>
        </div>

        {task.dueDate && (
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{new Date(task.dueDate).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </div>
  )
}
