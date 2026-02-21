-- Workflow reliability + DLQ migration

-- Rename success enum values to SUCCESS for workflow states.
DO $$
BEGIN
  ALTER TYPE "WorkflowStatus" RENAME VALUE 'COMPLETED' TO 'SUCCESS';
EXCEPTION
  WHEN invalid_parameter_value THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "WorkflowStepStatus" RENAME VALUE 'COMPLETED' TO 'SUCCESS';
EXCEPTION
  WHEN invalid_parameter_value THEN NULL;
END $$;

-- Add new run statuses.
DO $$
BEGIN
  ALTER TYPE "WorkflowStatus" ADD VALUE IF NOT EXISTS 'PARTIAL';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "WorkflowStatus" ADD VALUE IF NOT EXISTS 'DLQ_PENDING';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add new step statuses.
DO $$
BEGIN
  ALTER TYPE "WorkflowStepStatus" ADD VALUE IF NOT EXISTS 'RETRYING';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "WorkflowStepStatus" ADD VALUE IF NOT EXISTS 'DLQ';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create DLQ status enum.
DO $$
BEGIN
  CREATE TYPE "WorkflowStepDlqStatus" AS ENUM ('OPEN', 'REPLAYING', 'RESOLVED', 'IGNORED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Retry/DLQ tracking fields on workflow steps.
ALTER TABLE "WorkflowStep"
  ADD COLUMN IF NOT EXISTS "errorStack" TEXT,
  ADD COLUMN IF NOT EXISTS "attemptCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "maxRetries" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "nextRetryAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "firstFailedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastFailedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "correlationId" TEXT,
  ADD COLUMN IF NOT EXISTS "retryPolicyOverride" JSONB;

CREATE INDEX IF NOT EXISTS "WorkflowStep_nextRetryAt_idx" ON "WorkflowStep"("nextRetryAt");

-- Idempotency support for outbound communications.
ALTER TABLE "Communication"
  ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Communication_idempotencyKey_key" ON "Communication"("idempotencyKey");

-- DLQ table.
CREATE TABLE IF NOT EXISTS "WorkflowStepDlqItem" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "workflowExecutionId" TEXT NOT NULL,
  "workflowStepId" TEXT NOT NULL,
  "stepType" TEXT NOT NULL,
  "failureReason" TEXT NOT NULL,
  "errorStack" TEXT,
  "errorCategory" TEXT NOT NULL,
  "attemptCount" INTEGER NOT NULL,
  "firstFailedAt" TIMESTAMP(3) NOT NULL,
  "lastFailedAt" TIMESTAMP(3) NOT NULL,
  "inputPayload" JSONB,
  "stepConfigSnapshot" JSONB,
  "correlationId" TEXT,
  "status" "WorkflowStepDlqStatus" NOT NULL DEFAULT 'OPEN',
  "resolvedReason" TEXT,
  "resolvedBy" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "replayCount" INTEGER NOT NULL DEFAULT 0,
  "lastReplayAt" TIMESTAMP(3),
  "lastReplayBy" TEXT,
  "replayOverride" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WorkflowStepDlqItem_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'WorkflowStepDlqItem_workflowStepId_key'
  ) THEN
    ALTER TABLE "WorkflowStepDlqItem"
      ADD CONSTRAINT "WorkflowStepDlqItem_workflowStepId_key" UNIQUE ("workflowStepId");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'WorkflowStepDlqItem_organizationId_fkey'
  ) THEN
    ALTER TABLE "WorkflowStepDlqItem"
      ADD CONSTRAINT "WorkflowStepDlqItem_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'WorkflowStepDlqItem_workflowExecutionId_fkey'
  ) THEN
    ALTER TABLE "WorkflowStepDlqItem"
      ADD CONSTRAINT "WorkflowStepDlqItem_workflowExecutionId_fkey"
      FOREIGN KEY ("workflowExecutionId") REFERENCES "WorkflowExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'WorkflowStepDlqItem_workflowStepId_fkey'
  ) THEN
    ALTER TABLE "WorkflowStepDlqItem"
      ADD CONSTRAINT "WorkflowStepDlqItem_workflowStepId_fkey"
      FOREIGN KEY ("workflowStepId") REFERENCES "WorkflowStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "WorkflowStepDlqItem_organizationId_status_createdAt_idx"
  ON "WorkflowStepDlqItem"("organizationId", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "WorkflowStepDlqItem_organizationId_stepType_createdAt_idx"
  ON "WorkflowStepDlqItem"("organizationId", "stepType", "createdAt");

CREATE INDEX IF NOT EXISTS "WorkflowStepDlqItem_organizationId_errorCategory_createdAt_idx"
  ON "WorkflowStepDlqItem"("organizationId", "errorCategory", "createdAt");

CREATE INDEX IF NOT EXISTS "WorkflowStepDlqItem_workflowExecutionId_idx"
  ON "WorkflowStepDlqItem"("workflowExecutionId");
