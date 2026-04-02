-- Hudson Coordinator Setup
-- Updates Hudson to have task creation capabilities and coordinator role

-- Update Hudson's role and capabilities
UPDATE agents 
SET 
  role = 'COORDINATOR',
  capabilities = ARRAY['Planning', 'Coding', 'Review', 'TaskCreation', 'ProjectManagement', 'AgentCoordination'],
  "updatedAt" = NOW()
WHERE handle = '@hudson' OR id = 'agent-001';

-- Verify Hudson's updated role
SELECT 
  id, 
  handle, 
  name, 
  role, 
  capabilities,
  status
FROM agents 
WHERE handle = '@hudson' OR id = 'agent-001';
