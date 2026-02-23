# Supabase PITR and Backup Checklist

Use this checklist monthly (or after plan/config changes) to confirm vendor-managed backup readiness.

## Targets

1. `RPO <= 1 hour`
2. `RTO <= 4 hours`
3. Retention `>= 30 days`
4. PITR rewind window `>= 7 days`

## Dashboard Verification Steps

1. Open Supabase project for production.
2. Navigate to backup/PITR settings (menu names may vary by plan/UI release).
3. Confirm automated backups are enabled.
4. Confirm PITR is enabled.
5. Confirm PITR rewind window meets or exceeds 7 days.
6. Confirm retention setting meets policy retention (30 days minimum).
7. Confirm backup/restore permissions are restricted to least-privileged operators.

## Screenshot Evidence Requirements

Capture screenshots with:

1. Date/time visible.
2. Relevant settings visible (backups enabled, PITR enabled, retention window).
3. Project reference redacted.
4. Account-level secrets or credentials excluded.

Store evidence in:

`docs/db/evidence/YYYY-MM-DD-supabase-backup-check.md`

## Evidence Template

Create a file per check date with this structure:

```md
# Supabase Backup Check - YYYY-MM-DD

## Reviewer
- Name:
- Role:

## Environment
- Project: production (ref redacted)
- Date/time (UTC):

## Checks
- Automated backups enabled: PASS/FAIL
- PITR enabled: PASS/FAIL
- PITR rewind window >= 7 days: PASS/FAIL
- Retention >= 30 days: PASS/FAIL
- Access least privilege: PASS/FAIL

## Screenshots
- [ ] Backup settings screenshot attached
- [ ] PITR settings screenshot attached
- [ ] Access control screenshot attached

## Notes / Gaps
- ...
```
