-- Add progress field to Project model
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "progress" INTEGER DEFAULT 0;

-- Add comment
COMMENT ON COLUMN "projects"."progress" IS 'Project completion percentage (0-100)';
