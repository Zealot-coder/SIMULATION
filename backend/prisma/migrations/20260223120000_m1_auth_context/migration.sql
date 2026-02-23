-- Milestone 1: active organization context on users

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "activeOrganizationId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'User_activeOrganizationId_fkey'
  ) THEN
    ALTER TABLE "User"
      ADD CONSTRAINT "User_activeOrganizationId_fkey"
      FOREIGN KEY ("activeOrganizationId")
      REFERENCES "Organization"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "User_activeOrganizationId_idx" ON "User"("activeOrganizationId");

-- Backfill to first active membership where possible.
UPDATE "User" u
SET "activeOrganizationId" = membership."organizationId"
FROM (
  SELECT DISTINCT ON ("userId")
    "userId",
    "organizationId"
  FROM "OrganizationMember"
  WHERE "isActive" = true
  ORDER BY "userId", "createdAt" ASC
) membership
WHERE u.id = membership."userId"
  AND u."activeOrganizationId" IS NULL;
