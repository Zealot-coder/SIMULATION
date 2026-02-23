# Database Backup and Restore Runbook

This runbook covers scheduled logical backups to Cloudflare R2 and monthly restore drills against staging.

## Scope

1. Primary recovery: Supabase PITR.
2. Secondary recovery: logical backups in Cloudflare R2.
3. Restore drills: staging only, never production.

## Policy Source

Policy is config-driven from:

`ops/ops_backup_policy.json`

Current defaults:

1. `rpo_minutes: 60`
2. `rto_minutes: 240`
3. `retention_days: 30`
4. `logical_export_frequency_minutes: 360`
5. `monthly_restore_day: first_sunday`

## Backup Workflow

GitHub workflow: `.github/workflows/db-backup.yml`

1. Triggered every 6 hours and via manual dispatch.
2. Executes `scripts/db/backup.sh`.
3. Uploads backup manifest artifact.
4. Stores payload + manifest in Cloudflare R2.
5. Writes best-effort `AuditLog` entry (`entityType=DatabaseBackup`).

## Manual Backup Command

```bash
OPS_BACKUP_POLICY_FILE=ops/ops_backup_policy.json \
PROD_DIRECT_URL='postgresql://...' \
R2_ACCOUNT_ID='...' \
R2_BUCKET='...' \
R2_ACCESS_KEY_ID='...' \
R2_SECRET_ACCESS_KEY='...' \
BACKUP_ENCRYPTION_PASSPHRASE='optional' \
scripts/db/backup.sh
```

## Restore Workflow

GitHub workflow: `.github/workflows/db-restore-test.yml`

1. Triggered weekly on Sunday but guarded to first Sunday only for scheduled runs.
2. Manual runs allowed any day.
3. Executes `scripts/db/restore_test.sh`.
4. Restores from latest (or requested) backup into staging.
5. Executes `scripts/db/verification.sql`.
6. Uploads restore proof artifact and logs.

## Manual Restore Test Command

```bash
OPS_BACKUP_POLICY_FILE=ops/ops_backup_policy.json \
STAGING_DIRECT_URL='postgresql://...' \
PROD_DIRECT_URL='postgresql://...' \
R2_ACCOUNT_ID='...' \
R2_BUCKET='...' \
R2_ACCESS_KEY_ID='...' \
R2_SECRET_ACCESS_KEY='...' \
BACKUP_ID='LATEST' \
BACKUP_ENCRYPTION_PASSPHRASE='optional' \
scripts/db/restore_test.sh
```

## Verification Pass Criteria

1. Prisma migrations exist (`_prisma_migrations` not empty).
2. Key tables are non-empty: `Organization`, `Event`, `Workflow`, `User`.
3. RLS is enabled on `Organization`, `Event`, `Workflow`, `WorkflowExecution`, `WorkflowStep`.
4. `pg_policies` has entries for the same table set.
5. Org-scoped join sanity query executes.

## Produced Evidence Artifacts

1. `artifacts/backup-manifest-<timestamp>.json`
2. `artifacts/restore-result-<timestamp>.json`
3. `artifacts/restore-proof-<timestamp>.json`
4. `artifacts/restore-test-<timestamp>.log`

## Operational Monitoring and Alerts

1. Backup freshness SLO: alert if no successful backup within 8 hours.
2. Restore drill SLO: alert if no successful drill in current month.
3. PITR readiness: monthly checklist evidence required in `docs/db/evidence/`.
4. Optional Slack alerts supported through `SLACK_WEBHOOK_URL` secret.

## Performance and Safety Controls

1. Backups run asynchronously in CI and use `pg_dump` (no table write locks).
2. Restore tests target staging DB only.
3. Global object restore is disabled by default (`ALLOW_GLOBALS_RESTORE=0`).
4. Connection strings are redacted in output artifacts.
