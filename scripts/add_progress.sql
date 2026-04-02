-- Add progress field to projects table
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "progress" INTEGER DEFAULT 0;

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'projects' AND column_name = 'progress';
