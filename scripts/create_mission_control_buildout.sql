-- Mission Control Buildout Project
-- Run this in Supabase SQL Editor

-- Create the project
INSERT INTO projects (
  id, "portfolioId", name, slug, description, charter, state, progress,
  "budgetAllocated", "budgetSpent", "isArchived", "createdAt", "updatedAt"
) VALUES (
  'project-mission-control-buildout',
  'portfolio-001',
  'Mission Control Buildout',
  'mission-control-buildout',
  'Complete the Mission Control dashboard by replacing static placeholders with live data, adding CRUD operations, and building the Agent SDK',
  'The Mission Control dashboard currently has live data for agents, projects, and tasks, but many sections remain static or non-functional. This project will complete the dashboard by implementing real-time activity feeds, functional CRUD operations, and the Agent SDK for production use.',
  'EXECUTING',
  10,
  10000,
  0,
  false,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  charter = EXCLUDED.charter,
  state = EXCLUDED.state,
  progress = EXCLUDED.progress,
  "budgetAllocated" = EXCLUDED."budgetAllocated";

-- Create tasks for Phase 1: Core Functionality
INSERT INTO tasks (
  id, "projectId", number, title, description, type, status, priority,
  "estimatedEffort", "isDeleted", "createdAt", "updatedAt"
) VALUES 
(
  'task-activity-feed-api',
  'project-mission-control-buildout',
  1,
  'Build Activity Feed API',
  'Create API endpoint /api/activity that returns audit logs, agent heartbeats, task state changes, and system events. Should support pagination and filtering by type.',
  'FEATURE',
  'QUEUED',
  'HIGH',
  8,
  false,
  NOW(),
  NOW()
),
(
  'task-activity-feed-ui',
  'project-mission-control-buildout',
  2,
  'Build Activity Feed UI Component',
  'Replace "Activity feed coming soon..." placeholder on homepage with live ActivityFeed component. Show real-time events with timestamps, icons, and filtering.',
  'FEATURE',
  'QUEUED',
  'HIGH',
  6,
  false,
  NOW(),
  NOW()
),
(
  'task-agent-status-grid',
  'project-mission-control-buildout',
  3,
  'Build Agent Status Mini-Grid',
  'Replace "Agent status coming soon..." placeholder on homepage with mini agent grid showing Hudson''s status, last heartbeat, and current task.',
  'FEATURE',
  'QUEUED',
  'MEDIUM',
  4,
  false,
  NOW(),
  NOW()
),
(
  'task-real-throughput-metrics',
  'project-mission-control-buildout',
  4,
  'Implement Real Task Throughput Metrics',
  'Replace static bar chart with real throughput data. Aggregate task completions by hour from audit logs. Show actual 24h trend.',
  'FEATURE',
  'QUEUED',
  'HIGH',
  8,
  false,
  NOW(),
  NOW()
),
(
  'task-success-rate-metrics',
  'project-mission-control-buildout',
  5,
  'Implement Real Success Rate Metrics',
  'Replace static 87.5% with calculated success rate from actual task completions/failures over 7-day period.',
  'FEATURE',
  'QUEUED',
  'MEDIUM',
  6,
  false,
  NOW(),
  NOW()
),
(
  'task-budget-tracking',
  'project-mission-control-buildout',
  6,
  'Implement Budget Tracking API and UI',
  'Replace static budget percentages with real budget consumption tracking. Create BudgetUsage model and API.',
  'FEATURE',
  'QUEUED',
  'MEDIUM',
  8,
  false,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  priority = EXCLUDED.priority;

-- Create tasks for Phase 2: CRUD Operations
INSERT INTO tasks (
  id, "projectId", number, title, description, type, status, priority,
  "estimatedEffort", "isDeleted", "createdAt", "updatedAt"
) VALUES 
(
  'task-create-project-modal',
  'project-mission-control-buildout',
  7,
  'Build Create Project Modal',
  'Make "New Project" button functional. Create modal form with project name, description, charter, budget allocation, and portfolio selection.',
  'FEATURE',
  'QUEUED',
  'HIGH',
  8,
  false,
  NOW(),
  NOW()
),
(
  'task-create-task-modal',
  'project-mission-control-buildout',
  8,
  'Build Create Task Modal',
  'Make "New Task" button functional. Create modal form with task title, description, project selection, priority, type, due date, and estimated effort.',
  'FEATURE',
  'QUEUED',
  'HIGH',
  8,
  false,
  NOW(),
  NOW()
),
(
  'task-task-detail-view',
  'project-mission-control-buildout',
  9,
  'Build Task Detail View',
  'Create task detail page/route. Show full task information, status history, assignee details, blockers, and allow status updates.',
  'FEATURE',
  'QUEUED',
  'MEDIUM',
  10,
  false,
  NOW(),
  NOW()
),
(
  'task-project-detail-view',
  'project-mission-control-buildout',
  10,
  'Build Project Detail View',
  'Create project detail page/route. Show project charter, objectives, timeline, associated tasks, and budget breakdown.',
  'FEATURE',
  'QUEUED',
  'MEDIUM',
  10,
  false,
  NOW(),
  NOW()
),
(
  'task-task-filtering',
  'project-mission-control-buildout',
  11,
  'Implement Task Filtering',
  'Make "Filter" button on tasks page functional. Add filters for priority, assignee, due date range, and project.',
  'FEATURE',
  'QUEUED',
  'LOW',
  6,
  false,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  priority = EXCLUDED.priority;

-- Create tasks for Phase 3: Agent SDK
INSERT INTO tasks (
  id, "projectId", number, title, description, type, status, priority,
  "estimatedEffort", "isDeleted", "createdAt", "updatedAt"
) VALUES 
(
  'task-agent-sdk-core',
  'project-mission-control-buildout',
  12,
  'Build Agent SDK Core',
  'Create the core Agent SDK package with WebSocket connection, authentication, heartbeat sending, and task receiving.',
  'FEATURE',
  'QUEUED',
  'HIGH',
  16,
  false,
  NOW(),
  NOW()
),
(
  'task-agent-sdk-task-handling',
  'project-mission-control-buildout',
  13,
  'Implement Agent SDK Task Handling',
  'Add task acceptance, progress reporting, completion/failure reporting, and kill switch handling to the SDK.',
  'FEATURE',
  'QUEUED',
  'HIGH',
  12,
  false,
  NOW(),
  NOW()
),
(
  'task-agent-sdk-docs',
  'project-mission-control-buildout',
  14,
  'Write Agent SDK Documentation',
  'Create comprehensive README, API reference, and quick start guide. Include example agent implementations.',
  'DOCUMENTATION',
  'QUEUED',
  'MEDIUM',
  8,
  false,
  NOW(),
  NOW()
),
(
  'task-agent-sdk-publish',
  'project-mission-control-buildout',
  15,
  'Publish Agent SDK Package',
  'Set up NPM package, CI/CD pipeline for publishing, and version tagging. Make package publicly installable.',
  'FEATURE',
  'QUEUED',
  'MEDIUM',
  6,
  false,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  priority = EXCLUDED.priority;

-- Verify creation
SELECT 'Project Created' as status, name, state, progress FROM projects WHERE id = 'project-mission-control-buildout'
UNION ALL
SELECT 'Tasks Created', 'Count: ' || COUNT(*)::text, NULL, NULL FROM tasks WHERE "projectId" = 'project-mission-control-buildout';
