import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Clock, AlertCircle, Paperclip, MessageSquare, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done';

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  status: TaskStatus;
  assignee?: {
    name: string;
    avatar?: string;
    initials: string;
  };
  dueDate?: Date;
  tags?: string[];
  attachments?: number;
  comments?: number;
}

export interface TaskCardProps {
  task: Task;
  index: number;
  onClick?: (task: Task) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  className?: string;
  isLoading?: boolean;
}

const priorityColors: Record<Priority, string> = {
  low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  high: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  urgent: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
};

const priorityLabels: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export function TaskCard({
  task,
  index,
  onClick,
  onEdit,
  onDelete,
  className,
  isLoading = false,
}: TaskCardProps) {
  if (isLoading) {
    return (
      <div
        className={cn(
          'rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950',
          'animate-pulse',
          className
        )}
      >
        <div className="mb-3 h-4 w-1/3 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="mb-2 h-5 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="flex items-center justify-between pt-3">
          <div className="h-6 w-16 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    );
  }

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            'group relative rounded-lg border border-slate-200 bg-white p-4',
            'transition-all duration-200',
            'hover:shadow-md hover:border-slate-300',
            'dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700',
            snapshot.isDragging && 'shadow-lg ring-2 ring-slate-200 dark:ring-slate-700',
            className
          )}
          onClick={() => onClick?.(task)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClick?.(task);
            }
          }}
          aria-label={`Task: ${task.title}`}
        >
          {/* Header */}
          <div className="mb-2 flex items-start justify-between">
            <Badge
              variant="outline"
              className={cn('text-xs font-medium', priorityColors[task.priority])}
            >
              {priorityLabels[task.priority]}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit?.(task)}>Edit</DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete?.(task)}
                  className="text-rose-600"
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Title */}
          <h4 className="mb-1 font-medium text-slate-900 dark:text-slate-100">
            {task.title}
          </h4>

          {/* Description */}
          {task.description && (
            <p className="mb-3 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
              {task.description}
            </p>
          )}

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1">
              {task.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              {task.dueDate && (
                <div
                  className={cn(
                    'flex items-center gap-1 text-xs',
                    new Date(task.dueDate) < new Date()
                      ? 'text-rose-500'
                      : 'text-slate-500 dark:text-slate-400'
                  )}
                >
                  <Clock className="h-3.5 w-3.5" />
                  {new Date(task.dueDate).toLocaleDateString()}
                </div>
              )}
              {task.attachments && task.attachments > 0 && (
                <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <Paperclip className="h-3.5 w-3.5" />
                  {task.attachments}
                </div>
              )}
              {task.comments && task.comments > 0 && (
                <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {task.comments}
                </div>
              )}
            </div>

            {task.assignee ? (
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                title={task.assignee.name}
              >
                {task.assignee.initials}
              </div>
            ) : (
              <AlertCircle className="h-4 w-4 text-slate-400" />
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}

export default TaskCard;
