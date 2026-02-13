-- Auth schema compatibility patch for existing production databases.
-- Adds columns expected by current Prisma models without destructive changes.

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "name" TEXT,
  ADD COLUMN IF NOT EXISTS "avatar" TEXT,
  ADD COLUMN IF NOT EXISTS "lastLogin" TIMESTAMP(3);

ALTER TABLE "OAuthAccount"
  ADD COLUMN IF NOT EXISTS "providerAccountId" TEXT,
  ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "name" TEXT,
  ADD COLUMN IF NOT EXISTS "avatar" TEXT;

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

