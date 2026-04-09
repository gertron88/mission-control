-- Add disabledReason column to Agent table for tracking why an agent was disabled
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "disabledReason" TEXT;

-- Create index for efficient queries on disabled agents
CREATE INDEX IF NOT EXISTS "agents_status_disabled_reason_idx" ON "agents"("status", "disabledReason") 
WHERE "status" = 'DISABLED';
