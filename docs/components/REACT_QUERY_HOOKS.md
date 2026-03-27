# React Query Hooks Specification

**Location:** \`src/hooks/use*.ts\`  
**Purpose:** Data fetching and caching for React components  
**Dependencies:** @tanstack/react-query, api client, query-keys

---

## Overview

All data fetching MUST use React Query hooks. This provides:
- Automatic caching
- Background refetching
- Optimistic updates
- Error handling
- Loading states

---

## File Structure

\`\`\`
src/hooks/
├── useTasks.ts      # Task queries and mutations
├── useAgents.ts     # Agent queries
├── useProjects.ts   # Project queries
├── useDispatch.ts   # Dispatch mutations
└── useEvents.ts     # Event subscription
\`\`\`

---

## Hook Pattern

### Query Hook (Fetch Data)

\`\`\`typescript
// src/hooks/useTasks.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, endpoints } from '@/lib/api';
import { queryKeys } from '@/lib/query-client';
import type { Task, TaskFilters, TaskListResponse } from '@/lib/api';

// Single item query
export function useTask(taskId: string | null) {
  return useQuery({
    queryKey: queryKeys.tasks.detail(taskId),
    queryFn: async (): Promise<Task | null> => {
      if (!taskId) return null;
      const { data, error } = await api.get(endpoints.tasks.get(taskId));
      if (error) throw error;
      return data;
    },
    enabled: !!taskId,  // Only fetch if taskId exists
    staleTime: 30 * 1000, // 30 seconds
  });
}

// List query with filters
export function useTasks(filters?: TaskFilters) {
  return useQuery({
    queryKey: queryKeys.tasks.list(filters),
    queryFn: async (): Promise<TaskListResponse> => {
      const { data, error } = await api.get(endpoints.tasks.list(filters));
      if (error) throw error;
      return data;
    },
    staleTime: 10 * 1000, // 10 seconds
  });
}
\`\`\`

### Mutation Hook (Modify Data)

\`\`\`typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, endpoints } from '@/lib/api';
import { queryKeys } from '@/lib/query-client';

export function useCreateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateTaskInput): Promise<Task> => {
      const { data, error } = await api.post(endpoints.tasks.create(), input);
      if (error) throw error;
      return data;
    },
    
    // Invalidate lists on success
    onSuccess: (newTask) => {
      // Invalidate all task lists
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.tasks.lists() 
      });
      
      // Set the new task in cache
      queryClient.setQueryData(
        queryKeys.tasks.detail(newTask.id),
        newTask
      );
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      taskId, 
      updates 
    }: { 
      taskId: string; 
      updates: UpdateTaskInput 
    }): Promise<Task> => {
      const { data, error } = await api.patch(
        endpoints.tasks.update(taskId), 
        updates
      );
      if (error) throw error;
      return data;
    },
    
    // Optimistic update
    onMutate: async ({ taskId, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.tasks.detail(taskId),
      });
      
      // Snapshot previous value
      const previousTask = queryClient.getQueryData<Task>(
        queryKeys.tasks.detail(taskId)
      );
      
      // Optimistically update
      if (previousTask) {
        queryClient.setQueryData(
          queryKeys.tasks.detail(taskId),
          { ...previousTask, ...updates }
        );
      }
      
      return { previousTask };
    },
    
    // Rollback on error
    onError: (err, { taskId }, context) => {
      if (context?.previousTask) {
        queryClient.setQueryData(
          queryKeys.tasks.detail(taskId),
          context.previousTask
        );
      }
    },
    
    // Always refetch after error or success
    onSettled: (data, error, { taskId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.detail(taskId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.lists(),
      });
    },
  });
}
\`\`\`

---

## Query Keys

**File:** \`src/lib/query-client.ts\`

\`\`\`typescript
export const queryKeys = {
  tasks: {
    all: ['tasks'] as const,
    lists: () => [...queryKeys.tasks.all, 'list'] as const,
    list: (filters: TaskFilters | undefined) => 
      [...queryKeys.tasks.lists(), filters] as const,
    details: () => [...queryKeys.tasks.all, 'detail'] as const,
    detail: (id: string | null) => 
      [...queryKeys.tasks.details(), id] as const,
  },
  
  agents: {
    all: ['agents'] as const,
    lists: () => [...queryKeys.agents.all, 'list'] as const,
    list: (filters?: AgentFilters) => 
      [...queryKeys.agents.lists(), filters] as const,
    details: () => [...queryKeys.agents.all, 'detail'] as const,
    detail: (id: string | null) => 
      [...queryKeys.agents.details(), id] as const,
  },
  
  projects: {
    all: ['projects'] as const,
    lists: () => [...queryKeys.projects.all, 'list'] as const,
    list: (filters?: ProjectFilters) => 
      [...queryKeys.projects.lists(), filters] as const,
    details: () => [...queryKeys.projects.all, 'detail'] as const,
    detail: (id: string | null) => 
      [...queryKeys.projects.details(), id] as const,
    dependencies: (id: string | null) => 
      [...queryKeys.projects.detail(id), 'dependencies'] as const,
  },
};
\`\`\`

---

## Common Patterns

### Using Hooks in Components

\`\`\`typescript
import { useTasks, useUpdateTask } from '@/hooks/useTasks';

function TaskList() {
  // Query
  const { 
    data, 
    isLoading, 
    isError, 
    error,
    refetch 
  } = useTasks({ status: 'RUNNING' });
  
  // Mutation
  const updateTask = useUpdateTask();
  
  if (isLoading) return <Loading />;
  if (isError) return <Error message={error.message} />;
  
  return (
    <div>
      {data?.tasks.map(task => (
        <TaskCard 
          key={task.id} 
          task={task}
          onStatusChange={(status) => 
            updateTask.mutate({ 
              taskId: task.id, 
              updates: { status } 
            })
          }
        />
      ))}
      
      {updateTask.isPending && <span>Saving...</span>}
      {updateTask.isError && <span>Error: {updateTask.error.message}</span>}
    </div>
  );
}
\`\`\`

### Prefetching Data

\`\`\`typescript
function TaskList() {
  const queryClient = useQueryClient();
  const { data } = useTasks();
  
  // Prefetch task details on hover
  const handleMouseEnter = (taskId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.tasks.detail(taskId),
      queryFn: async () => {
        const { data } = await api.get(endpoints.tasks.get(taskId));
        return data;
      },
      staleTime: 60 * 1000,
    });
  };
  
  return (
    <div>
      {data?.tasks.map(task => (
        <div 
          key={task.id}
          onMouseEnter={() => handleMouseEnter(task.id)}
        >
          {task.title}
        </div>
      ))}
    </div>
  );
}
\`\`\`

### Infinite Scroll (if needed)

\`\`\`typescript
import { useInfiniteQuery } from '@tanstack/react-query';

export function useTasksInfinite(filters?: TaskFilters) {
  return useInfiniteQuery({
    queryKey: queryKeys.tasks.list(filters),
    queryFn: async ({ pageParam = 1 }) => {
      const { data, error } = await api.get(
        endpoints.tasks.list({ ...filters, page: pageParam })
      );
      if (error) throw error;
      return data;
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore) return undefined;
      return lastPage.page + 1;
    },
    initialPageParam: 1,
  });
}
\`\`\`

---

## Type Safety

### Return Types

\`\`\`typescript
// Always explicitly type the return
export function useTask(taskId: string | null) {
  return useQuery<Task | null, Error>({  // <Data, Error>
    queryKey: queryKeys.tasks.detail(taskId),
    queryFn: async (): Promise<Task | null> => {
      // ...
    },
  });
}

// Mutation types
export function useUpdateTask() {
  return useMutation<
    Task,           // Return type on success
    Error,          // Error type
    { taskId: string; updates: UpdateTaskInput },  // Variables type
    { previousTask: Task | undefined }  // Context type
  >({
    // ...
  });
}
\`\`\`

---

## Error Handling

Errors are thrown by queryFn and caught by React Query:

\`\`\`typescript
function Component() {
  const { data, error, isError } = useTasks();
  
  if (isError) {
    // error is Error type with message from API
    return <div>Failed to load: {error.message}</div>;
  }
}
\`\`\`

---

## Rules

1. **ALWAYS use queryKeys from query-client.ts**
2. **ALWAYS type the return value explicitly**
3. **ALWAYS throw errors in queryFn**
4. **ALWAYS use enabled option for conditional fetching**
5. **Invalidate lists after mutations**
6. **Use optimistic updates for better UX**
7. **Set appropriate staleTime**

---

## Common Errors to Avoid

### ❌ DON'T

\`\`\`typescript
// Don't use generic keys
queryKey: ['tasks'],  // ❌
queryKey: queryKeys.tasks.list(filters),  // ✅

// Don't forget to throw errors
queryFn: async () => {
  const { data, error } = await api.get(...);
  return data;  // ❌ Returns undefined on error
},
queryFn: async () => {
  const { data, error } = await api.get(...);
  if (error) throw error;  // ✅
  return data;
},

// Don't forget enabled for conditional
useTask(taskId),  // ❌ Will fetch with null
useTask(taskId, { enabled: !!taskId }),  // ✅
\`\`\`

