-- Idempotency layer: API idempotency, webhook dedup, step dedup

DO $$
BEGIN
  CREATE TYPE "IdempotencyStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "StepDedupStatus" AS ENUM ('LOCKED', 'DONE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "IdempotencyKey" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "scope" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "requestFingerprint" TEXT NOT NULL,
  "status" "IdempotencyStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "responseCode" INTEGER,
  "responseBody" JSONB,
  "errorBody" JSONB,
  "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP + interval '24 hours'),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "IdempotencyKey"
  ADD COLUMN IF NOT EXISTS "organizationId" TEXT,
  ADD COLUMN IF NOT EXISTS "actorUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "scope" TEXT,
  ADD COLUMN IF NOT EXISTS "key" TEXT,
  ADD COLUMN IF NOT EXISTS "requestFingerprint" TEXT,
  ADD COLUMN IF NOT EXISTS "status" "IdempotencyStatus" DEFAULT 'IN_PROGRESS',
  ADD COLUMN IF NOT EXISTS "responseCode" INTEGER,
  ADD COLUMN IF NOT EXISTS "responseBody" JSONB,
  ADD COLUMN IF NOT EXISTS "errorBody" JSONB,
  ADD COLUMN IF NOT EXISTS "lockedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3) DEFAULT (CURRENT_TIMESTAMP + interval '24 hours'),
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "IdempotencyKey"
  ALTER COLUMN "organizationId" SET NOT NULL,
  ALTER COLUMN "scope" SET NOT NULL,
  ALTER COLUMN "key" SET NOT NULL,
  ALTER COLUMN "requestFingerprint" SET NOT NULL,
  ALTER COLUMN "status" SET DEFAULT 'IN_PROGRESS',
  ALTER COLUMN "lockedAt" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "expiresAt" SET DEFAULT (CURRENT_TIMESTAMP + interval '24 hours'),
  ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'IdempotencyKey_organizationId_scope_key_key'
  ) THEN
    ALTER TABLE "IdempotencyKey"
      ADD CONSTRAINT "IdempotencyKey_organizationId_scope_key_key"
      UNIQUE ("organizationId", "scope", "key");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'IdempotencyKey_organizationId_fkey'
  ) THEN
    ALTER TABLE "IdempotencyKey"
      ADD CONSTRAINT "IdempotencyKey_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "IdempotencyKey_expiresAt_idx" ON "IdempotencyKey"("expiresAt");
CREATE INDEX IF NOT EXISTS "IdempotencyKey_status_lockedAt_idx" ON "IdempotencyKey"("status", "lockedAt");
CREATE INDEX IF NOT EXISTS "IdempotencyKey_organizationId_actorUserId_idx" ON "IdempotencyKey"("organizationId", "actorUserId");

CREATE TABLE IF NOT EXISTS "WebhookDedup" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "dedupKey" TEXT NOT NULL,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP + interval '24 hours'),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebhookDedup_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "WebhookDedup"
  ADD COLUMN IF NOT EXISTS "organizationId" TEXT,
  ADD COLUMN IF NOT EXISTS "provider" TEXT,
  ADD COLUMN IF NOT EXISTS "dedupKey" TEXT,
  ADD COLUMN IF NOT EXISTS "firstSeenAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3) DEFAULT (CURRENT_TIMESTAMP + interval '24 hours'),
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "WebhookDedup"
  ALTER COLUMN "organizationId" SET NOT NULL,
  ALTER COLUMN "provider" SET NOT NULL,
  ALTER COLUMN "dedupKey" SET NOT NULL,
  ALTER COLUMN "firstSeenAt" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "expiresAt" SET DEFAULT (CURRENT_TIMESTAMP + interval '24 hours'),
  ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'WebhookDedup_organizationId_provider_dedupKey_key'
  ) THEN
    ALTER TABLE "WebhookDedup"
      ADD CONSTRAINT "WebhookDedup_organizationId_provider_dedupKey_key"
      UNIQUE ("organizationId", "provider", "dedupKey");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'WebhookDedup_organizationId_fkey'
  ) THEN
    ALTER TABLE "WebhookDedup"
      ADD CONSTRAINT "WebhookDedup_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "WebhookDedup_expiresAt_idx" ON "WebhookDedup"("expiresAt");

CREATE TABLE IF NOT EXISTS "StepDedup" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "workflowRunId" TEXT NOT NULL,
  "stepKey" TEXT NOT NULL,
  "inputHash" TEXT NOT NULL,
  "status" "StepDedupStatus" NOT NULL DEFAULT 'LOCKED',
  "result" JSONB,
  "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP + interval '24 hours'),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StepDedup_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "StepDedup"
  ADD COLUMN IF NOT EXISTS "organizationId" TEXT,
  ADD COLUMN IF NOT EXISTS "workflowRunId" TEXT,
  ADD COLUMN IF NOT EXISTS "stepKey" TEXT,
  ADD COLUMN IF NOT EXISTS "inputHash" TEXT,
  ADD COLUMN IF NOT EXISTS "status" "StepDedupStatus" DEFAULT 'LOCKED',
  ADD COLUMN IF NOT EXISTS "result" JSONB,
  ADD COLUMN IF NOT EXISTS "lockedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3) DEFAULT (CURRENT_TIMESTAMP + interval '24 hours'),
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "StepDedup"
  ALTER COLUMN "organizationId" SET NOT NULL,
  ALTER COLUMN "workflowRunId" SET NOT NULL,
  ALTER COLUMN "stepKey" SET NOT NULL,
  ALTER COLUMN "inputHash" SET NOT NULL,
  ALTER COLUMN "status" SET DEFAULT 'LOCKED',
  ALTER COLUMN "lockedAt" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "expiresAt" SET DEFAULT (CURRENT_TIMESTAMP + interval '24 hours'),
  ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'StepDedup_organizationId_workflowRunId_stepKey_inputHash_key'
  ) THEN
    ALTER TABLE "StepDedup"
      ADD CONSTRAINT "StepDedup_organizationId_workflowRunId_stepKey_inputHash_key"
      UNIQUE ("organizationId", "workflowRunId", "stepKey", "inputHash");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'StepDedup_organizationId_fkey'
  ) THEN
    ALTER TABLE "StepDedup"
      ADD CONSTRAINT "StepDedup_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'StepDedup_workflowRunId_fkey'
  ) THEN
    ALTER TABLE "StepDedup"
      ADD CONSTRAINT "StepDedup_workflowRunId_fkey"
      FOREIGN KEY ("workflowRunId") REFERENCES "WorkflowExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "StepDedup_expiresAt_idx" ON "StepDedup"("expiresAt");
CREATE INDEX IF NOT EXISTS "StepDedup_status_lockedAt_idx" ON "StepDedup"("status", "lockedAt");
CREATE INDEX IF NOT EXISTS "StepDedup_workflowRunId_idx" ON "StepDedup"("workflowRunId");