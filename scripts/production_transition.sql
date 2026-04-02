-- Transition Mission Control to Production Mode
-- This creates the meta-project for managing Mission Control development via Mission Control

-- Create the production workflow project
INSERT INTO projects (
  id, "portfolioId", name, slug, description, charter, state, progress,
  "budgetAllocated", "budgetSpent", "isArchived", "createdAt", "updatedAt"
) VALUES (
  'project-mission-control-production',
  'portfolio-001',
  'Mission Control Production Transition',
  'mission-control-production',
  'Transition Mission Control from development mode to production. All future updates will be managed as tasks within Mission Control itself and executed by Hudson via the Agent SDK.',
  'Mission Control is currently in development with manual deployments. This project establishes the production workflow where Hudson connects via the Agent SDK, receives tasks through the dashboard, and executes them autonomously. This creates a self-managing development loop.',
  'EXECUTING',
  25,
  50000,
  0,
  false,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  charter = EXCLUDED.charter;

-- Task 1: Connect Hudson via Agent SDK
INSERT INTO tasks (
  id, "projectId", number, title, description, type, status, priority,
  "estimatedEffort", "assigneeId", "isDeleted", "createdAt", "updatedAt"
) VALUES (
  'task-connect-hudson-sdk',
  'project-mission-control-production',
  1,
  'Connect Hudson to Mission Control via Agent SDK',
  'Hudson must connect to Mission Control using the Agent SDK via curl. Use the provided SDK endpoint to bootstrap and establish WebSocket connection. Report heartbeat and await task assignments.',
  'FEATURE',
  'RUNNING',
  'CRITICAL',
  4,
  'agent-001',  -- Hudson
  false,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  status = 'RUNNING',
  "assigneeId" = 'agent-001';

-- Task 2: Establish production workflow documentation
INSERT INTO tasks (
  id, "projectId", number, title, description, type, status, priority,
  "estimatedEffort", "assigneeId", "isDeleted", "createdAt", "updatedAt"
) VALUES (
  'task-production-workflow-docs',
  'project-mission-control-production',
  2,
  'Document Production Workflow for Hudson',
  'Create documentation outlining how Hudson receives tasks from Mission Control, executes them via SDK, and reports progress. Include error handling, kill switch procedures, and task completion protocols.',
  'DOCUMENTATION',
  'QUEUED',
  'HIGH',
  6,
  'agent-001',
  false,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title;

-- Task 3: Create task execution templates
INSERT INTO tasks (
  id, "projectId", number, title, description, type, status, priority,
  "estimatedEffort", "assigneeId", "isDeleted", "createdAt", "updatedAt"
) VALUES (
  'task-execution-templates',
  'project-mission-control-production',
  3,
  'Create Task Execution Templates',
  'Build standardized templates for common task types: API endpoint creation, UI component updates, database migrations, and documentation. Hudson uses these templates to execute tasks consistently.',
  'FEATURE',
  'QUEUED',
  'MEDIUM',
  8,
  'agent-001',
  false,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title;

-- Verify
SELECT 'Production Project Created' as status, 
       (SELECT COUNT(*) FROM tasks WHERE "projectId" = 'project-mission-control-production') as task_count;
