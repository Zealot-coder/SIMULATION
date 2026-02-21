-- Workflow reliability + DLQ migration

-- Ensure legacy environments that missed enum creation can still migrate.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'WorkflowStatus'
  ) THEN
    CREATE TYPE "WorkflowStatus" AS ENUM (
      'PENDING',
      'RUNNING',
      'SUCCESS',
      'FAILED',
      'PARTIAL',
      'DLQ_PENDING',
      'PAUSED',
      'WAITING_APPROVAL'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'WorkflowStepStatus'
  ) THEN
    CREATE TYPE "WorkflowStepStatus" AS ENUM (
      'PENDING',
      'RUNNING',
      'SUCCESS',
      'RETRYING',
      'DLQ',
      'FAILED',
      'SKIPPED'
    );
  END IF;
END $$;

-- Rename success enum values to SUCCESS for workflow states.
-- Guard with pg_enum checks so reruns/partial migrations remain safe.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'WorkflowStatus'
      AND e.enumlabel = 'COMPLETED'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'WorkflowStatus'
      AND e.enumlabel = 'SUCCESS'
  ) THEN
    ALTER TYPE "WorkflowStatus" RENAME VALUE 'COMPLETED' TO 'SUCCESS';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'WorkflowStepStatus'
      AND e.enumlabel = 'COMPLETED'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'WorkflowStepStatus'
      AND e.enumlabel = 'SUCCESS'
  ) THEN
    ALTER TYPE "WorkflowStepStatus" RENAME VALUE 'COMPLETED' TO 'SUCCESS';
  END IF;
END $$;

-- Add new run statuses.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'WorkflowStatus'
  ) THEN
    ALTER TYPE "WorkflowStatus" ADD VALUE IF NOT EXISTS 'PARTIAL';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'WorkflowStatus'
  ) THEN
    ALTER TYPE "WorkflowStatus" ADD VALUE IF NOT EXISTS 'DLQ_PENDING';
  END IF;
END $$;

-- Add new step statuses.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'WorkflowStepStatus'
  ) THEN
    ALTER TYPE "WorkflowStepStatus" ADD VALUE IF NOT EXISTS 'RETRYING';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'WorkflowStepStatus'
  ) THEN
    ALTER TYPE "WorkflowStepStatus" ADD VALUE IF NOT EXISTS 'DLQ';
  END IF;
END $$;

-- Create DLQ status enum.
DO $$
BEGIN
  CREATE TYPE "WorkflowStepDlqStatus" AS ENUM ('OPEN', 'REPLAYING', 'RESOLVED', 'IGNORED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Ensure core workflow tables exist in legacy environments where early migrations were skipped.
CREATE TABLE IF NOT EXISTS "WorkflowExecution" (
  "id" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "eventId" TEXT,
  "status" "WorkflowStatus" NOT NULL DEFAULT 'PENDING',
  "currentStep" INTEGER NOT NULL DEFAULT 0,
  "input" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "output" JSONB,
  "error" TEXT,
  "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkflowExecution_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WorkflowStep" (
  "id" TEXT NOT NULL,
  "executionId" TEXT NOT NULL,
  "stepIndex" INTEGER NOT NULL,
  "stepType" TEXT NOT NULL,
  "status" "WorkflowStepStatus" NOT NULL DEFAULT 'PENDING',
  "config" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "input" JSONB,
  "output" JSONB,
  "error" TEXT,
  "aiRequestId" TEXT,
  "aiConfidence" DOUBLE PRECISION,
  "communicationId" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkflowStep_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WorkflowStep_executionId_stepIndex_key"
  ON "WorkflowStep"("executionId", "stepIndex");
CREATE INDEX IF NOT EXISTS "WorkflowStep_executionId_idx"
  ON "WorkflowStep"("executionId");
CREATE INDEX IF NOT EXISTS "WorkflowStep_status_idx"
  ON "WorkflowStep"("status");

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
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Communication'
  ) THEN
    ALTER TABLE "Communication"
      ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Communication'
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "Communication_idempotencyKey_key" ON "Communication"("idempotencyKey");
  END IF;
END $$;

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
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Organization'
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
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'WorkflowExecution'
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
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'WorkflowStep'
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
