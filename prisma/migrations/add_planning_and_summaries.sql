-- Migration: Add Planning Docs and Summary Reports
-- Run: npx prisma migrate dev --name add_planning_and_summaries

-- Add to Project table:
-- planningDoc - Required before tasks can start
-- planningApproved - Boolean to track approval
-- summaryReport - Completed project summary

-- Add to Task table:
-- summaryReport - Completed task summary
-- scopeDoc - Task scope document

-- These will all be JSON fields storing structured content
