-- WorkPilot: create Tasks tables (run in Supabase SQL Editor if prisma db push hangs)
-- Safe to re-run (IF NOT EXISTS)

DO $$ BEGIN
  CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TaskWorkType" AS ENUM ('WORK', 'FOLLOW_UP', 'DOCUMENT', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TaskAssigneeStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "tasks" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "dueDate" DATE,
  "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
  "workType" "TaskWorkType" NOT NULL DEFAULT 'WORK',
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "task_assignees" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "status" "TaskAssigneeStatus" NOT NULL DEFAULT 'TODO',
  "note" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "task_assignees_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "tasks_companyId_createdAt_idx" ON "tasks"("companyId", "createdAt");
CREATE INDEX IF NOT EXISTS "task_assignees_employeeId_status_idx" ON "task_assignees"("employeeId", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "task_assignees_taskId_employeeId_key"
  ON "task_assignees"("taskId", "employeeId");

DO $$ BEGIN
  ALTER TABLE "tasks"
    ADD CONSTRAINT "tasks_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "tasks"
    ADD CONSTRAINT "tasks_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "user"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "task_assignees"
    ADD CONSTRAINT "task_assignees_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "tasks"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "task_assignees"
    ADD CONSTRAINT "task_assignees_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "employees"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
