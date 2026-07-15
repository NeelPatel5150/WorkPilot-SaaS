-- Add company letterhead address for payslips / docs
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "address" TEXT;
