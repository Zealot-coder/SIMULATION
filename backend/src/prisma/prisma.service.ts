import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    await this.ensureAuthSchemaCompatibility();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private async ensureAuthSchemaCompatibility() {
    const statements = [
      `
      ALTER TABLE "User"
        ADD COLUMN IF NOT EXISTS "name" TEXT,
        ADD COLUMN IF NOT EXISTS "avatar" TEXT,
        ADD COLUMN IF NOT EXISTS "lastLogin" TIMESTAMP(3),
        ADD COLUMN IF NOT EXISTS "activeOrganizationId" TEXT;
      `,
      `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'User_activeOrganizationId_fkey'
        ) AND EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = 'Organization'
        ) THEN
          ALTER TABLE "User"
            ADD CONSTRAINT "User_activeOrganizationId_fkey"
            FOREIGN KEY ("activeOrganizationId")
            REFERENCES "Organization"("id")
            ON DELETE SET NULL
            ON UPDATE CASCADE;
        END IF;
      END $$;
      `,
      `
      CREATE INDEX IF NOT EXISTS "User_activeOrganizationId_idx" ON "User"("activeOrganizationId");
      `,
      `
      ALTER TABLE "OAuthAccount"
        ADD COLUMN IF NOT EXISTS "providerAccountId" TEXT,
        ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3),
        ADD COLUMN IF NOT EXISTS "name" TEXT,
        ADD COLUMN IF NOT EXISTS "avatar" TEXT;
      `,
      `
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
      `,
      `
      UPDATE "OAuthAccount"
      SET "providerAccountId" = id
      WHERE "providerAccountId" IS NULL;
      `,
      `
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
      `,
      `
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
      `,
      `
      ALTER TABLE "OAuthAccount"
        ALTER COLUMN "providerAccountId" SET NOT NULL;
      `,
      `
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
      `,
    ];

    for (let index = 0; index < statements.length; index += 1) {
      try {
        await this.$executeRawUnsafe(statements[index]);
      } catch (error: any) {
        this.logger.warn(
          `Auth schema compatibility statement ${index + 1} skipped: ${error?.message || error}`,
        );
      }
    }
  }
}


