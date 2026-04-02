-- Remove all agents except Hudson
-- Run this in Supabase SQL Editor

-- First, update any tasks assigned to agents that will be deleted
-- Set assigneeId to NULL for tasks assigned to non-Hudson agents
UPDATE tasks 
SET "assigneeId" = NULL 
WHERE "assigneeId" IN (
  SELECT id FROM agents 
  WHERE handle != '@hudson' OR name != 'Hudson'
);

-- Delete heartbeats for non-Hudson agents
DELETE FROM heartbeats 
WHERE "agentId" IN (
  SELECT id FROM agents 
  WHERE handle != '@hudson' OR name != 'Hudson'
);

-- Delete agent capabilities/junction records if they exist
-- (adjust table name if different)
DELETE FROM "_AgentCapabilities" 
WHERE "A" IN (
  SELECT id FROM agents 
  WHERE handle != '@hudson' OR name != 'Hudson'
);

-- Delete trading configs for non-Hudson agents
DELETE FROM "TradingConfig" 
WHERE "agentId" IN (
  SELECT id FROM agents 
  WHERE handle != '@hudson' OR name != 'Hudson'
);

-- Finally, delete all agents except Hudson
DELETE FROM agents 
WHERE handle != '@hudson' OR name != 'Hudson';

-- Verify only Hudson remains
SELECT id, handle, name, role, status FROM agents;
