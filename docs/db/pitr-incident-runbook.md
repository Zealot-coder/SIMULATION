# PITR Incident Runbook (Supabase Primary Recovery)

Use this runbook when production data is corrupted, deleted, or otherwise requires point-in-time recovery.

## Recovery Targets

1. `RPO <= 1 hour`
2. `RTO <= 4 hours`

## Inputs Required Before Action

1. Incident ID
2. Detection timestamp (UTC)
3. Suspected corruption window
4. Target restore timestamp `T` (UTC)
5. Incident commander + approver

## 1) Declare Incident

1. Open incident channel/ticket.
2. Record incident metadata:
   - Incident ID
   - Detection time
   - Suspected bad deployment/process
   - Initial impact scope
3. Freeze non-essential schema changes and deploys.

## 2) Freeze Writes (Downtime Control)

1. Enable maintenance mode at platform edge (block write endpoints, keep read endpoints if safe).
2. Scale workflow/event workers to zero (or disable worker deployment).
3. Pause inbound webhook forwarding at provider gateways where possible.
4. Confirm queues are not executing mutating jobs.

## 3) Execute PITR in Supabase

1. In Supabase dashboard, start restore to timestamp `T`.
2. Restore into a new DB instance/project.
3. Do not overwrite production in-place.
4. Record restore job reference ID from Supabase UI.

## 4) Validate Restored Database

Run:

```bash
psql "$RESTORED_DIRECT_URL" -v ON_ERROR_STOP=1 -f scripts/db/verification.sql
```

Confirm:

1. Auth/user/org/workflow/event tables are present and populated.
2. RLS is enabled on key tables.
3. Policies are present (`pg_policies` checks).
4. Org-scoped query succeeds.

## 5) Cutover

1. Update runtime secrets:
   - `DATABASE_URL`
   - `DIRECT_URL`
2. Redeploy backend services.
3. Run smoke tests:
   - `/health`
   - login flow
   - org-scoped list query
4. Confirm workers can connect but remain paused until validation is complete.

## 6) Resume Traffic

1. Re-enable workers.
2. Resume webhook forwarding.
3. Disable maintenance mode.
4. Monitor:
   - error rate
   - queue depth
   - webhook retries
   - latency
   for at least 60 minutes.

## 7) Post-Incident Actions

1. Document timeline and root cause.
2. Record actual RPO and RTO.
3. Record recovered backup/PITR timestamp and any residual data gap.
4. Write incident audit entry in `AuditLog`:
   - `action=EXECUTE`
   - `entityType=DatabaseRestoreIncident`
   - metadata includes incident ID and restore timestamp.
5. Add evidence note in `docs/db/evidence/YYYY-MM-DD-supabase-backup-check.md`.
