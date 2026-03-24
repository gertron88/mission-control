# Mission Control Frontend Architecture

## Overview

Mission Control is a real-time autonomous AI agent orchestration platform with three primary views: Executive Dashboard, Trading Command Center, and Operations Control.

## Philosophy

- **At-a-glance clarity**: Critical info visible without scrolling
- **Progressive disclosure**: Click to drill down into details  
- **Functional simplicity**: Every element serves a purpose
- **Real-time feel**: Live updates, no refresh needed

---

## Component Hierarchy

```
app/
├── layout.tsx                    # Root layout with providers
├── page.tsx                      # Redirects to /dashboard
├── globals.css                   # Tailwind + CSS variables
│
├── dashboard/
│   └── page.tsx                  # Executive Dashboard
├── trading/
│   └── page.tsx                  # Trading Command Center
├── operations/
│   └── page.tsx                  # Operations Control
├── tasks/
│   └── page.tsx                  # Task Board (existing)
├── projects/
│   └── page.tsx                  # Projects list
└── agents/
    └── page.tsx                  # Agents management

components/
├── layout/
│   ├── DashboardShell.tsx        # Common layout wrapper
│   ├── Sidebar.tsx               # Navigation sidebar
│   ├── TopBar.tsx                # Header with status
│   └── MobileNav.tsx             # Mobile navigation drawer
│
├── dashboard/
│   ├── DashboardStats.tsx        # Key metrics cards
│   ├── ActiveProjects.tsx        # Project list with progress
│   ├── AgentStatus.tsx           # Agent status grid
│   └── RecentActivity.tsx        # Activity feed
│
├── trading/
│   ├── PnLChart.tsx              # Profit & Loss sparkline
│   ├── PositionsTable.tsx        # Open positions
│   ├── OrdersList.tsx            # Recent orders
│   ├── RiskMetrics.tsx           # Risk indicators
│   └── KillSwitch.tsx            # Emergency stop button
│
├── operations/
│   ├── AgentGrid.tsx             # Agent status cards
│   ├── TaskBoard.tsx             # Kanban board (existing)
│   ├── TaskCard.tsx              # Draggable task cards (existing)
│   ├── DispatchPanel.tsx         # Dispatch controls
│   └── SystemHealth.tsx          # Health indicators
│
├── ui/                           # shadcn/ui primitives
│   ├── button.tsx
│   ├── card.tsx
│   ├── badge.tsx
│   ├── progress.tsx
│   ├── table.tsx
│   └── ...
│
└── charts/
    ├── Sparkline.tsx             # Mini charts
    ├── BarChart.tsx              # Recharts wrappers
    └── PieChart.tsx

hooks/
├── useTasks.ts                   # React Query hook for tasks
├── useProjects.ts                # React Query hook for projects
├── useAgents.ts                  # React Query hook for agents
├── useTrading.ts                 # Trading data hook
├── useDispatch.ts                # Dispatch mutation hook
└── useEvents.ts                  # SSE for real-time updates

lib/
├── utils.ts                      # cn() helper
├── api.ts                        # API client
└── constants.ts                  # App constants

types/
├── index.ts                      # Shared TypeScript types
├── task.ts                       # Task types
├── project.ts                    # Project types
├── agent.ts                      # Agent types
└── trading.ts                    # Trading types
```

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        PRESENTATION                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Dashboard   │  │   Trading    │  │  Operations  │       │
│  │    Page      │  │    Page      │  │    Page      │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                 │                 │               │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐       │
│  │   Custom     │  │   Custom     │  │   Custom     │       │
│  │  Components  │  │  Components  │  │  Components  │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
└─────────┼─────────────────┼─────────────────┼───────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────┐
│                      CUSTOM HOOKS                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │useTasks  │  │useProjects│  │useAgents │  │useTrading│     │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘     │
│       │             │             │             │           │
│       └─────────────┴──────┬──────┴─────────────┘           │
│                            │                                │
│                     ┌──────▼──────┐                         │
│                     │  useEvents  │  ← SSE real-time updates│
│                     └─────────────┘                         │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                      API LAYER                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │/api/tasks│  │/api/proj │  │/api/agent│  │/api/trade│     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │/api/disp │  │/api/events│  │/api/kill │                   │
│  └──────────┘  └──────────┘  └──────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

---

## State Management Approach

### Server State (React Query)
All API data is managed via React Query for:
- **Caching**: Automatic stale-while-revalidate
- **Background updates**: Refetch on window focus
- **Optimistic updates**: UI updates before server confirms
- **Error handling**: Automatic retries with exponential backoff

```typescript
// hooks/useTasks.ts pattern
export function useTasks(options: UseTasksOptions = {}) {
  return useQuery({
    queryKey: ['tasks', options],
    queryFn: fetchTasks,
    refetchInterval: 30000, // 30s polling fallback
    staleTime: 10000,       // 10s fresh data
  })
}
```

### Real-time Updates (SSE)
Server-Sent Events for instant updates:
```typescript
// hooks/useEvents.ts
export function useEventSource(url: string) {
  const [data, setData] = useState(null)
  
  useEffect(() => {
    const es = new EventSource(url)
    es.onmessage = (e) => setData(JSON.parse(e.data))
    return () => es.close()
  }, [url])
  
  return { data, connected: !!data }
}
```

### Client State (React useState)
Local UI state only:
- Modal open/close
- Form inputs
- Drag-and-drop state
- Selected filters

No global state management needed - React Query handles cache.

---

## Color Palette

### Primary Colors (Slate)
```css
--slate-50:  #f8fafc   /* Background hover */
--slate-100: #f1f5f9   /* Card backgrounds */
--slate-200: #e2e8f0   /* Borders */
--slate-300: #cbd5e1   /* Disabled */
--slate-400: #94a3b8   /* Muted text */
--slate-500: #64748b   /* Secondary text */
--slate-600: #475569   /* Body text */
--slate-700: #334155   /* Headings */
--slate-800: #1e293b   /* Dark surfaces */
--slate-900: #0f172a   /* Darkest */
--slate-950: #020617   /* Backgrounds */
```

### Semantic Colors
```css
/* Success */
--green-50:  #f0fdf4
--green-500: #22c55e  /* Online, healthy */
--green-600: #16a34a

/* Warning */
--yellow-50:  #fefce8
--yellow-500: #eab308  /* Busy, caution */
--yellow-600: #ca8a04

/* Danger */
--red-50:  #fef2f2
--red-500: #ef4444    /* Offline, error, kill switch */
--red-600: #dc2626

/* Info */
--blue-50:  #eff6ff
--blue-500: #3b82f6   /* Active, primary actions */
--blue-600: #2563eb

/* Purple */
--purple-50:  #faf5ff
--purple-500: #a855f7 /* Complete, special */
```

### Dark Mode Mapping
```css
/* Automatic via Tailwind dark: modifier */
dark:bg-slate-900     /* Background */
dark:bg-slate-800     /* Cards */
dark:border-slate-700 /* Borders */
dark:text-slate-100   /* Primary text */
dark:text-slate-400   /* Muted text */
```

---

## Typography

### Font Stack
```css
font-family: 'Inter', system-ui, -apple-system, sans-serif;
```

### Type Scale
```
Page Title:     text-3xl font-bold    (30px)
Section Title:  text-xl font-semibold (20px)
Card Title:     text-lg font-semibold (18px)
Body:           text-sm               (14px)
Small/Caption:  text-xs               (12px)
Label:          text-xs font-medium   (12px uppercase)
```

### Font Weights
```
font-normal:   400  /* Body text */
font-medium:   500  /* Labels, buttons */
font-semibold: 600  /* Headings */
font-bold:     700  /* Stats, emphasis */
```

---

## Layout System

### DashboardShell Pattern
All pages wrap content in a consistent shell:

```tsx
<DashboardShell>
  <TopBar title="Dashboard" breadcrumbs={[...]} />
  <main className="p-6 lg:p-8">
    {/* Page content */}
  </main>
</DashboardShell>
```

### Grid System
```
┌─────────────────────────────────────────────┐
│  Sidebar (64px/256px) │  Main Content       │
│  ┌─────────────────┐  │  ┌───────────────┐  │
│  │  Logo           │  │  │  TopBar       │  │
│  │  ─────────────  │  │  ├───────────────┤  │
│  │  Dashboard      │  │  │               │  │
│  │  Trading        │  │  │  Content      │  │
│  │  Operations     │  │  │  Grid:        │  │
│  │  Tasks          │  │  │  ┌───┬───┐    │  │
│  │  Projects       │  │  │  │   │   │    │  │
│  │  Agents         │  │  │  ├───┼───┤    │  │
│  │  ─────────────  │  │  │  │   │   │    │  │
│  │  Emergency Stop │  │  │  └───┴───┘    │  │
│  └─────────────────┘  │  │               │  │
│                       │  └───────────────┘  │
└─────────────────────────────────────────────┘
```

### Responsive Breakpoints
```
sm:  640px   /* Mobile landscape */
md:  768px   /* Tablet */
lg:  1024px  /* Desktop */
xl:  1280px  /* Large desktop */
2xl: 1536px  /* Ultra-wide */
```

### Mobile Behavior
- Sidebar collapses to hamburger menu
- Grid columns stack vertically
- Font sizes remain consistent
- Touch targets minimum 44px

---

## Loading States

### Skeleton Pattern
```tsx
function LoadingCard() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-4 bg-slate-200 rounded w-1/3"></div>
      <div className="h-24 bg-slate-100 rounded"></div>
    </div>
  )
}
```

### Loading Strategy
1. **Instant**: Show shell layout immediately
2. **Skeleton**: Animate placeholders while loading
3. **Progressive**: Load critical data first
4. **Stale**: Show cached data while refetching

---

## Error Handling

### Error Boundary
```tsx
// components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  state = { hasError: false }
  
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback />
    }
    return this.props.children
  }
}
```

### Error States
- **Toast notifications**: Action errors (mutations)
- **Inline errors**: Form validation
- **Full-page error**: Critical failures
- **Retry buttons**: All async errors

---

## Performance Optimizations

1. **Code Splitting**: Dynamic imports for heavy charts
2. **Image Optimization**: Next.js Image component
3. **Font Optimization**: Next.js font loading
4. **Bundle Analysis**: Regular size audits
5. **Virtualization**: Long lists (if needed)
6. **Memoization**: React.memo for expensive components
7. **Debouncing**: Search inputs, resize handlers

---

## Accessibility

- Semantic HTML (nav, main, article)
- ARIA labels for icon-only buttons
- Keyboard navigation support
- Focus visible states
- Reduced motion support
- Color contrast WCAG AA
- Screen reader tested

---

## File Naming Conventions

```
Components: PascalCase.tsx     (DashboardStats.tsx)
Hooks:      camelCase.ts       (useTasks.ts)
Utils:      camelCase.ts       (formatDate.ts)
Types:      camelCase.ts       (task.types.ts)
Constants:  UPPER_SNAKE.ts     (API_ENDPOINTS.ts)
Styles:     kebab-case.css     (globals.css)
```

---

## Next Steps

1. ✅ Create DashboardShell layout wrapper
2. ✅ Update Sidebar with mobile support
3. ✅ Create TopBar component
4. ✅ Implement dashboard page
5. ✅ Implement trading page
6. ✅ Implement operations page
7. ⬜ Add React Query provider
8. ⬜ Set up error boundaries
9. ⬜ Add dark mode toggle
10. ⬜ Performance audit
