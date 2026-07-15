-- Project sharing + offer letters
CREATE TABLE IF NOT EXISTS "project_shares" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "project_shares_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "project_shares_projectId_employeeId_key"
  ON "project_shares"("projectId", "employeeId");
CREATE INDEX IF NOT EXISTS "project_shares_employeeId_idx" ON "project_shares"("employeeId");

DO $$ BEGIN
  ALTER TABLE "project_shares" ADD CONSTRAINT "project_shares_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "project_shares" ADD CONSTRAINT "project_shares_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "offer_letters" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "employeeId" TEXT,
  "letterType" TEXT NOT NULL DEFAULT 'OFFER',
  "candidateName" TEXT NOT NULL,
  "designation" TEXT NOT NULL,
  "department" TEXT,
  "joiningDate" DATE,
  "salaryAmount" DOUBLE PRECISION,
  "salaryCurrency" TEXT NOT NULL DEFAULT 'INR',
  "employmentType" TEXT,
  "reportingTo" TEXT,
  "location" TEXT,
  "bodyExtras" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "offer_letters_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "offer_letters_companyId_createdAt_idx"
  ON "offer_letters"("companyId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "offer_letters" ADD CONSTRAINT "offer_letters_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "offer_letters" ADD CONSTRAINT "offer_letters_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
