-- Project: Eliminate Hardcoded Data from Mission Control
-- Complete audit and migration of all static data to database

-- Create the project
INSERT INTO projects (
  id, "portfolioId", name, slug, description, charter, state, progress,
  "budgetAllocated", "budgetSpent", "isArchived", "createdAt", "updatedAt"
) VALUES (
  'project-eliminate-hardcoded-data',
  'portfolio-001',
  'Eliminate Hardcoded Data - Mission Control Production',
  'eliminate-hardcoded-data',
  'Complete audit and migration of all hardcoded/static data in Mission Control to database-driven feeds. Includes Activity Feed, Agent Status Grid, Throughput Metrics, Success Rate, Budget Usage, and placeholder pages.',
  'Mission Control currently has significant hardcoded data throughout the UI: static numbers (234, 87.5%), fake charts, placeholder "coming soon" messages, and mock budget figures. This project systematically replaces all static data with live database feeds, creating necessary APIs, database tables, and UI components for a fully functional production dashboard.',
  'PLANNING',
  5,
  25000,
  0,
  false,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  charter = EXCLUDED.charter,
  state = EXCLUDED.state;

-- Phase 1: Homepage Critical Sections
INSERT INTO tasks (
  id, "projectId", number, title, description, type, status, priority,
  "estimatedEffort", "assigneeId", "isDeleted", "createdAt", "updatedAt"
) VALUES 
(
  'task-activity-feed-api-db',
  'project-eliminate-hardcoded-data',
  1,
  'PHASE 1: Build Activity Feed with Database Backend',
  'Replace "Activity feed coming soon..." placeholder. Create ActivityLog database table with event types (task_created, task_completed, agent_connected, project_created, etc.). Build /api/activity endpoint with filtering and pagination. Create ActivityFeed UI component showing live events with timestamps, icons, and filtering by type.',
  'FEATURE',
  'QUEUED',
  'CRITICAL',
  12,
  'agent-001',
  false,
  NOW(),
  NOW()
),
(
  'task-agent-status-grid-db',
  'project-eliminate-hardcoded-data',
  2,
  'PHASE 1: Build Agent Status Grid with Live Data',
  'Replace "Agent status coming soon..." placeholder. Create AgentStatusGrid component showing Hudson (and other agents) with live heartbeat data, current task assignment, CPU/memory usage from latest heartbeat, and online/offline status.',
  'FEATURE',
  'QUEUED',
  'CRITICAL',
  8,
  'agent-001',
  false,
  NOW(),
  NOW()
),
(
  'task-throughput-metrics-db',
  'project-eliminate-hardcoded-data',
  3,
  'PHASE 1: Real Task Throughput Metrics',
  'Replace static bar chart with fake values [40, 65, 48, 72...]. Create task throughput aggregation from audit logs. Build /api/metrics/throughput endpoint returning hourly task completion counts for last 24h. Update UI to render real bar chart from API data.',
  'FEATURE',
  'QUEUED',
  'HIGH',
  10,
  'agent-001',
  false,
  NOW(),
  NOW()
),
(
  'task-success-rate-metrics-db',
  'project-eliminate-hardcoded-data',
  4,
  'PHASE 1: Real Success Rate Metrics',
  'Replace static 87.5% with fake numbers (234 completed, 18 failed, 15 retried). Calculate actual success rate from task completions/failures over 7-day period. Build /api/metrics/success-rate endpoint. Update UI to show real percentage and counts.',
  'FEATURE',
  'QUEUED',
  'HIGH',
  8,
  'agent-001',
  false,
  NOW(),
  NOW()
),
(
  'task-budget-usage-db',
  'project-eliminate-hardcoded-data',
  5,
  'PHASE 1: Real Budget Usage Tracking',
  'Replace static percentages (68% API Credits, 45% Compute, 22% Storage) and fake $21,480 spent. Create BudgetUsage table tracking API calls, compute hours, storage by project. Build /api/metrics/budget endpoint aggregating real usage. Update UI with live progress bars.',
  'FEATURE',
  'QUEUED',
  'HIGH',
  12,
  'agent-001',
  false,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description;

-- Phase 2: Placeholder Pages
INSERT INTO tasks (
  id, "projectId", number, title, description, type, status, priority,
  "estimatedEffort", "assigneeId", "isDeleted", "createdAt", "updatedAt"
) VALUES 
(
  'task-operations-page-buildout',
  'project-eliminate-hardcoded-data',
  6,
  'PHASE 2: Build Operations Page (Replace Placeholder)',
  'Replace "Operations page coming soon" placeholder. Build full Operations dashboard showing: active deployments, system health metrics, resource utilization, recent deployments, error rates. Connect to real infrastructure data.',
  'FEATURE',
  'QUEUED',
  'MEDIUM',
  16,
  'agent-001',
  false,
  NOW(),
  NOW()
),
(
  'task-trading-page-buildout',
  'project-eliminate-hardcoded-data',
  7,
  'PHASE 2: Build Trading Page (Replace Placeholder)',
  'Replace "Trading page coming soon" placeholder. Build Trading dashboard showing: active trading agents, portfolio performance, recent trades, P&L summary, risk metrics. Connect to TradingConfig and trade data.',
  'FEATURE',
  'QUEUED',
  'MEDIUM',
  16,
  'agent-001',
  false,
  NOW(),
  NOW()
),
(
  'task-kill-switch-page-buildout',
  'project-eliminate-hardcoded-data',
  8,
  'PHASE 2: Build Kill Switch Page (Replace Placeholder)',
  'Replace "Kill Switch page coming soon" placeholder. Build emergency kill switch interface showing: connected agents, kill button per agent, global kill all, confirmation dialogs, kill history log. Fully functional emergency stop system.',
  'FEATURE',
  'QUEUED',
  'HIGH',
  12,
  'agent-001',
  false,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description;

-- Phase 3: Static Data Cleanup
INSERT INTO tasks (
  id, "projectId", number, title, description, type, status, priority,
  "estimatedEffort", "assigneeId", "isDeleted", "createdAt", "updatedAt"
) VALUES 
(
  'task-system-status-live',
  'project-eliminate-hardcoded-data',
  9,
  'PHASE 3: Live System Status in Sidebar',
  'Replace hardcoded system status (API Gateway: online, Model Inference: online, Vector DB: degraded) with live health checks. Build /api/health/services endpoint that pings each service. Update sidebar to show real status with pulsing indicators.',
  'FEATURE',
  'QUEUED',
  'MEDIUM',
  8,
  'agent-001',
  false,
  NOW(),
  NOW()
),
(
  'task-remove-all-mock-data',
  'project-eliminate-hardcoded-data',
  10,
  'PHASE 3: Audit and Remove All Remaining Mock Data',
  'Final audit sweep: search codebase for any remaining hardcoded numbers, mock arrays, fake timestamps, placeholder text. Document each finding and replace with database calls. Update tests to use real data fixtures.',
  'ANALYSIS',
  'QUEUED',
  'HIGH',
  10,
  'agent-001',
  false,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description;

-- Verify creation
SELECT 
  'Hardcoded Data Elimination Project' as project,
  (SELECT name FROM projects WHERE id = 'project-eliminate-hardcoded-data') as project_name,
  (SELECT state FROM projects WHERE id = 'project-eliminate-hardcoded-data') as state,
  (SELECT COUNT(*) FROM tasks WHERE "projectId" = 'project-eliminate-hardcoded-data') as task_count,
  (SELECT SUM("estimatedEffort") FROM tasks WHERE "projectId" = 'project-eliminate-hardcoded-data') as total_hours;
