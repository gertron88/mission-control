-- Assign "Build Agent SDK Core" task to Hudson
-- Run this in Supabase SQL Editor

UPDATE tasks 
SET 
  "assigneeId" = 'agent-001',
  status = 'RUNNING',
  "updatedAt" = NOW()
WHERE id = 'task-agent-sdk-core';

-- Verify assignment
SELECT 
  t.id,
  t.title,
  t.status,
  a.name as assignee,
  a.handle
FROM tasks t
LEFT JOIN agents a ON t."assigneeId" = a.id
WHERE t.id = 'task-agent-sdk-core';
