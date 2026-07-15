-- Workspace kanban: add IN_REVIEW + boardStatus (run in Supabase SQL Editor)

DO $$ BEGIN
  ALTER TYPE "TaskAssigneeStatus" ADD VALUE IF NOT EXISTS 'IN_REVIEW';
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

-- For Postgres versions without ADD VALUE IF NOT EXISTS:
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'TaskAssigneeStatus' AND e.enumlabel = 'IN_REVIEW'
  ) THEN
    ALTER TYPE "TaskAssigneeStatus" ADD VALUE 'IN_REVIEW';
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

ALTER TABLE "tasks"
  ADD COLUMN IF NOT EXISTS "boardStatus" "TaskAssigneeStatus" NOT NULL DEFAULT 'TODO';

CREATE INDEX IF NOT EXISTS "tasks_companyId_boardStatus_idx"
  ON "tasks"("companyId", "boardStatus");
