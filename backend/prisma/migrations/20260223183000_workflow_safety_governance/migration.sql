-- Workflow safety limits and resource governance

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'WorkflowStatus'
  ) THEN
    ALTER TYPE "WorkflowStatus" ADD VALUE IF NOT EXISTS 'FAILED_SAFETY_LIMIT';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'WorkflowExecution'
  ) THEN
    ALTER TABLE "WorkflowExecution"
      ADD COLUMN IF NOT EXISTS "iterationCount" INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "concurrencySlotHeld" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "safetyLimitCode" TEXT;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "plans" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "max_execution_time_ms" INTEGER NOT NULL,
  "max_step_iterations" INTEGER NOT NULL,
  "max_workflow_steps" INTEGER NOT NULL,
  "max_daily_workflow_runs" INTEGER NOT NULL,
  "max_daily_messages" INTEGER NOT NULL,
  "max_daily_ai_requests" INTEGER NOT NULL,
  "max_concurrent_runs" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'plans_name_key'
  ) THEN
    ALTER TABLE "plans" ADD CONSTRAINT "plans_name_key" UNIQUE ("name");
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "organization_plans" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "plan_id" TEXT NOT NULL,
  "override_config" JSONB,
  "activated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organization_plans_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organization_plans_organization_id_key'
  ) THEN
    ALTER TABLE "organization_plans"
      ADD CONSTRAINT "organization_plans_organization_id_key" UNIQUE ("organization_id");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organization_plans_organization_id_fkey'
  ) THEN
    ALTER TABLE "organization_plans"
      ADD CONSTRAINT "organization_plans_organization_id_fkey"
      FOREIGN KEY ("organization_id") REFERENCES "Organization"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organization_plans_plan_id_fkey'
  ) THEN
    ALTER TABLE "organization_plans"
      ADD CONSTRAINT "organization_plans_plan_id_fkey"
      FOREIGN KEY ("plan_id") REFERENCES "plans"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "organization_plans_plan_id_idx"
  ON "organization_plans"("plan_id");

CREATE TABLE IF NOT EXISTS "organization_usage" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "workflow_runs_count" INTEGER NOT NULL DEFAULT 0,
  "messages_sent_count" INTEGER NOT NULL DEFAULT 0,
  "ai_requests_count" INTEGER NOT NULL DEFAULT 0,
  "concurrent_runs_current" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organization_usage_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organization_usage_organization_id_date_key'
  ) THEN
    ALTER TABLE "organization_usage"
      ADD CONSTRAINT "organization_usage_organization_id_date_key" UNIQUE ("organization_id", "date");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organization_usage_organization_id_fkey'
  ) THEN
    ALTER TABLE "organization_usage"
      ADD CONSTRAINT "organization_usage_organization_id_fkey"
      FOREIGN KEY ("organization_id") REFERENCES "Organization"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "organization_usage_date_idx"
  ON "organization_usage"("date");
CREATE INDEX IF NOT EXISTS "organization_usage_organization_id_updated_at_idx"
  ON "organization_usage"("organization_id", "updated_at");

CREATE TABLE IF NOT EXISTS "workflow_safety_violations" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "workflow_id" TEXT,
  "workflow_execution_id" TEXT,
  "limit_code" TEXT NOT NULL,
  "details" JSONB,
  "action_taken" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "workflow_safety_violations_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workflow_safety_violations_organization_id_fkey'
  ) THEN
    ALTER TABLE "workflow_safety_violations"
      ADD CONSTRAINT "workflow_safety_violations_organization_id_fkey"
      FOREIGN KEY ("organization_id") REFERENCES "Organization"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workflow_safety_violations_workflow_id_fkey'
  ) THEN
    ALTER TABLE "workflow_safety_violations"
      ADD CONSTRAINT "workflow_safety_violations_workflow_id_fkey"
      FOREIGN KEY ("workflow_id") REFERENCES "Workflow"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workflow_safety_violations_workflow_execution_id_fkey'
  ) THEN
    ALTER TABLE "workflow_safety_violations"
      ADD CONSTRAINT "workflow_safety_violations_workflow_execution_id_fkey"
      FOREIGN KEY ("workflow_execution_id") REFERENCES "WorkflowExecution"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "workflow_safety_violations_organization_id_created_at_idx"
  ON "workflow_safety_violations"("organization_id", "created_at");
CREATE INDEX IF NOT EXISTS "workflow_safety_violations_limit_code_created_at_idx"
  ON "workflow_safety_violations"("limit_code", "created_at");
CREATE INDEX IF NOT EXISTS "workflow_safety_violations_workflow_execution_id_idx"
  ON "workflow_safety_violations"("workflow_execution_id");

INSERT INTO "plans" (
  "id",
  "name",
  "max_execution_time_ms",
  "max_step_iterations",
  "max_workflow_steps",
  "max_daily_workflow_runs",
  "max_daily_messages",
  "max_daily_ai_requests",
  "max_concurrent_runs",
  "created_at",
  "updated_at"
)
VALUES
  ('plan_free', 'free', 300000, 1000, 100, 500, 1000, 500, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('plan_pro', 'pro', 600000, 5000, 300, 5000, 20000, 5000, 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('plan_enterprise', 'enterprise', 1800000, 20000, 1000, 100000, 250000, 50000, 1000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO UPDATE
SET
  "max_execution_time_ms" = EXCLUDED."max_execution_time_ms",
  "max_step_iterations" = EXCLUDED."max_step_iterations",
  "max_workflow_steps" = EXCLUDED."max_workflow_steps",
  "max_daily_workflow_runs" = EXCLUDED."max_daily_workflow_runs",
  "max_daily_messages" = EXCLUDED."max_daily_messages",
  "max_daily_ai_requests" = EXCLUDED."max_daily_ai_requests",
  "max_concurrent_runs" = EXCLUDED."max_concurrent_runs",
  "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "organization_plans" (
  "id",
  "organization_id",
  "plan_id",
  "activated_at",
  "created_at",
  "updated_at"
)
SELECT
  'org_plan_' || o."id",
  o."id",
  CASE LOWER(COALESCE(o."subscriptionTier", 'free'))
    WHEN 'enterprise' THEN p_ent."id"
    WHEN 'pro' THEN p_pro."id"
    ELSE p_free."id"
  END,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Organization" o
JOIN "plans" p_free ON p_free."name" = 'free'
JOIN "plans" p_pro ON p_pro."name" = 'pro'
JOIN "plans" p_ent ON p_ent."name" = 'enterprise'
LEFT JOIN "organization_plans" op ON op."organization_id" = o."id"
WHERE op."id" IS NULL;
