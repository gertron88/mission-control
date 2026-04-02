-- Seed data for Mission Control
-- Run this in Supabase SQL Editor

-- Create portfolio
INSERT INTO portfolios (id, name, slug, description, "isActive", "isArchived", "createdAt", "updatedAt")
VALUES ('pf-001', 'Core Operations', 'core-ops', 'Main operational portfolio', true, false, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create projects
INSERT INTO projects (id, "portfolioId", name, slug, description, state, progress, "budgetAllocated", "budgetSpent", "isArchived", "createdAt", "updatedAt")
VALUES 
  ('p-001', 'pf-001', 'DataMesh Core', 'datamesh-core', 'Distributed semantic vector pipeline with real-time indexing across 15 data sources.', 'EXECUTING', 68, 7500, 4200, false, NOW(), NOW()),
  ('p-002', 'pf-001', 'FinOps Suite', 'finops-suite', 'Automated financial operations assistant handling P&L analysis and forecasting.', 'EXECUTING', 41, 12000, 2800, false, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create tasks
INSERT INTO tasks (id, "projectId", number, title, description, type, status, priority, "assigneeId", "estimatedEffort", "isDeleted", "createdAt", "updatedAt")
VALUES 
  ('t-001', 'p-001', 1, 'Vector Index Optimization', 'Optimize FAISS index for semantic search queries', 'FEATURE', 'RUNNING', 'HIGH', 'a-001', 4, false, NOW(), NOW()),
  ('t-002', 'p-002', 2, 'Q1 Financial Report', 'Aggregate and analyze Q1 2026 financial data', 'ANALYSIS', 'RUNNING', 'CRITICAL', 'a-002', 8, false, NOW(), NOW()),
  ('t-003', 'p-001', 3, 'API Rate Limit Handling', 'Implement exponential backoff for OpenAI API', 'FEATURE', 'QUEUED', 'HIGH', NULL, 3, false, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Verify data
SELECT 'Portfolios' as table_name, COUNT(*) as count FROM portfolios
UNION ALL
SELECT 'Projects', COUNT(*) FROM projects
UNION ALL
SELECT 'Tasks', COUNT(*) FROM tasks;
