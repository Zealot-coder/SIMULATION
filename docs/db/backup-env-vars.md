# Database Backup/Restore Environment Variables

This document defines environment variables required by the backup and restore tooling in `scripts/db/`.

## Required Variables

| Variable | Required | Used By | Description |
| --- | --- | --- | --- |
| `OPS_BACKUP_POLICY_FILE` | Yes | backup/restore/restore-test | Path to the policy JSON (default: `ops/ops_backup_policy.json`). |
| `PROD_DIRECT_URL` | Yes (backup), Optional (restore-test safety check) | backup/restore-test | Direct Postgres URL for production source database. |
| `STAGING_DIRECT_URL` | Yes (restore-test) | restore-test | Direct Postgres URL for staging restore drill target. |
| `TARGET_DIRECT_URL` | Yes (restore) | restore | Direct Postgres URL to restore into (never production for drills). |
| `R2_ACCOUNT_ID` | Yes | backup/restore/restore-test | Cloudflare account ID for R2 endpoint generation. |
| `R2_BUCKET` | Yes | backup/restore/restore-test | R2 bucket name holding backup payloads and manifests. |
| `R2_ACCESS_KEY_ID` | Yes | backup/restore/restore-test | R2 S3-compatible access key ID. |
| `R2_SECRET_ACCESS_KEY` | Yes | backup/restore/restore-test | R2 S3-compatible secret key. |

## Optional Variables

| Variable | Default | Used By | Description |
| --- | --- | --- | --- |
| `BACKUP_ID` | `LATEST` | restore/restore-test | Backup identifier to restore from. |
| `ARTIFACTS_DIR` | `artifacts/` | backup/restore/restore-test | Local output folder for manifests, logs, and proof artifacts. |
| `BACKUP_ENCRYPTION_PASSPHRASE` | unset | backup/restore/restore-test | If set, backup payload is client-side encrypted with OpenSSL. |
| `R2_ENDPOINT` | `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com` | backup/restore/restore-test | Override endpoint for custom networking scenarios. |
| `R2_REGION` | `auto` | backup/restore/restore-test | AWS SDK region value for R2 compatibility. |
| `ALLOW_GLOBALS_RESTORE` | `0` | restore | If `1`, applies `globals.sql` during restore (best effort). |
| `SKIP_GLOBALS_DUMP` | `0` | backup | If `1`, disables `pg_dumpall --globals-only`. |
| `RESTORE_OUTPUT_PATH` | auto-generated | restore | Explicit output path for restore result JSON. |
| `BACKUP_MANIFEST_PATH` | auto-generated | backup | Explicit output path for backup manifest JSON. |

## GitHub Actions Secrets

Configure these repository secrets for workflows:

1. `PROD_DIRECT_URL`
2. `STAGING_DIRECT_URL`
3. `R2_ACCOUNT_ID`
4. `R2_BUCKET`
5. `R2_ACCESS_KEY_ID`
6. `R2_SECRET_ACCESS_KEY`
7. `BACKUP_ENCRYPTION_PASSPHRASE` (optional)
8. `SLACK_WEBHOOK_URL` (optional failure alerts)

## Security Notes

1. Do not print full connection strings or secret values in logs.
2. Rotate `R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY` periodically.
3. Restrict R2 key scope to required bucket operations only.
4. Enable bucket versioning and lifecycle deletion (30+ days).
