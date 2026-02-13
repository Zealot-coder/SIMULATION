-- OAuthAccount compatibility patch for legacy production schemas.
-- Aligns old providerId-based constraints with current providerAccountId model.

-- Backfill providerAccountId from legacy providerId where available.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'OAuthAccount'
      AND column_name = 'providerId'
  ) THEN
    EXECUTE '
      UPDATE "OAuthAccount"
      SET "providerAccountId" = COALESCE("providerAccountId", "providerId")
      WHERE "providerAccountId" IS NULL
    ';
  END IF;
END $$;

-- Ensure providerAccountId is populated for all rows before NOT NULL.
UPDATE "OAuthAccount"
SET "providerAccountId" = id
WHERE "providerAccountId" IS NULL;

-- Remove legacy unique constraint on (provider, providerId), if present.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'OAuthAccount'
      AND c.conname = 'OAuthAccount_provider_providerId_key'
  ) THEN
    EXECUTE 'ALTER TABLE "OAuthAccount" DROP CONSTRAINT "OAuthAccount_provider_providerId_key"';
  END IF;
END $$;

-- Legacy providerId may still exist on older schemas. Make it nullable so Prisma inserts do not fail.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'OAuthAccount'
      AND column_name = 'providerId'
      AND is_nullable = 'NO'
  ) THEN
    EXECUTE 'ALTER TABLE "OAuthAccount" ALTER COLUMN "providerId" DROP NOT NULL';
  END IF;
END $$;

-- Match Prisma model expectation.
ALTER TABLE "OAuthAccount"
  ALTER COLUMN "providerAccountId" SET NOT NULL;

-- Add model-aligned unique constraint if missing.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'OAuthAccount'
      AND c.conname = 'OAuthAccount_provider_providerAccountId_key'
  ) THEN
    EXECUTE 'ALTER TABLE "OAuthAccount" ADD CONSTRAINT "OAuthAccount_provider_providerAccountId_key" UNIQUE ("provider", "providerAccountId")';
  END IF;
END $$;

