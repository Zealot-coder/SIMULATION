-- Business Metrics Dashboard aggregation tables

CREATE TABLE IF NOT EXISTS "org_hourly_metrics" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "hour_bucket" TIMESTAMP(3) NOT NULL,
  "orders_created" INTEGER NOT NULL DEFAULT 0,
  "payments_total" INTEGER NOT NULL DEFAULT 0,
  "payments_successful" INTEGER NOT NULL DEFAULT 0,
  "workflows_total" INTEGER NOT NULL DEFAULT 0,
  "workflows_failed" INTEGER NOT NULL DEFAULT 0,
  "total_execution_time_ms" BIGINT NOT NULL DEFAULT 0,
  "messages_sent" INTEGER NOT NULL DEFAULT 0,
  "messages_delivered" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "org_hourly_metrics_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'org_hourly_metrics_organization_id_fkey'
  ) THEN
    ALTER TABLE "org_hourly_metrics"
      ADD CONSTRAINT "org_hourly_metrics_organization_id_fkey"
      FOREIGN KEY ("organization_id")
      REFERENCES "Organization"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'org_hourly_metrics_organization_id_hour_bucket_key'
  ) THEN
    ALTER TABLE "org_hourly_metrics"
      ADD CONSTRAINT "org_hourly_metrics_organization_id_hour_bucket_key"
      UNIQUE ("organization_id", "hour_bucket");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "org_hourly_metrics_hour_bucket_idx"
  ON "org_hourly_metrics"("hour_bucket");
CREATE INDEX IF NOT EXISTS "org_hourly_metrics_organization_id_hour_bucket_idx"
  ON "org_hourly_metrics"("organization_id", "hour_bucket");

CREATE TABLE IF NOT EXISTS "org_daily_metrics" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "day_bucket" DATE NOT NULL,
  "orders_created" INTEGER NOT NULL DEFAULT 0,
  "payments_total" INTEGER NOT NULL DEFAULT 0,
  "payments_successful" INTEGER NOT NULL DEFAULT 0,
  "workflows_total" INTEGER NOT NULL DEFAULT 0,
  "workflows_failed" INTEGER NOT NULL DEFAULT 0,
  "total_execution_time_ms" BIGINT NOT NULL DEFAULT 0,
  "messages_sent" INTEGER NOT NULL DEFAULT 0,
  "messages_delivered" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "org_daily_metrics_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'org_daily_metrics_organization_id_fkey'
  ) THEN
    ALTER TABLE "org_daily_metrics"
      ADD CONSTRAINT "org_daily_metrics_organization_id_fkey"
      FOREIGN KEY ("organization_id")
      REFERENCES "Organization"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'org_daily_metrics_organization_id_day_bucket_key'
  ) THEN
    ALTER TABLE "org_daily_metrics"
      ADD CONSTRAINT "org_daily_metrics_organization_id_day_bucket_key"
      UNIQUE ("organization_id", "day_bucket");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "org_daily_metrics_day_bucket_idx"
  ON "org_daily_metrics"("day_bucket");
CREATE INDEX IF NOT EXISTS "org_daily_metrics_organization_id_day_bucket_idx"
  ON "org_daily_metrics"("organization_id", "day_bucket");
