-- Admin project credential vault
CREATE TABLE IF NOT EXISTS "projects" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "project_credentials" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "project_credentials_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "projects_companyId_name_idx" ON "projects"("companyId", "name");
CREATE INDEX IF NOT EXISTS "project_credentials_projectId_sortOrder_idx" ON "project_credentials"("projectId", "sortOrder");

DO $$ BEGIN
  ALTER TABLE "projects" ADD CONSTRAINT "projects_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "project_credentials" ADD CONSTRAINT "project_credentials_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
