# Workflow Reliability + DLQ Design

## Scope
This design adds deterministic workflow step retries, delayed queue scheduling, durable DLQ persistence, and admin replay/triage workflows.

## Retry Algorithm
- Retry decision is step-local and classification-based.
- Attempt counter starts at `1` for the first failure (`attemptCount + 1` on failure).
- If `isRetriable(error) === true` and `attempt <= maxRetries`, step transitions to `RETRYING`, `nextRetryAt` is persisted, and a delayed BullMQ job is enqueued.
- If non-retriable or retries exhausted, step transitions to `DLQ`, run transitions to `DLQ_PENDING`, and the failure is persisted to `WorkflowStepDlqItem`.

## Backoff + Jitter
- Formula (exact):
  - `delay = min(maxDelayMs, baseDelayMs * factor^(attempt-1))`
  - `jitter = random in [delay*(1-jitterRatio), delay*(1+jitterRatio)]`
- Defaults:
  - `baseDelayMs=2000`
  - `factor=2`
  - `maxDelayMs=120000`
  - `jitterRatio=0.25`
- Queue retries are disabled at queue-level (`attempts=1`); retries are scheduled explicitly with deterministic job IDs per step/attempt.

## Error Classification
- `workflow-error-classifier.ts` provides:
  - `errorCategory(error)`
  - `isRetriable(error)`
  - `classifyWorkflowError(error)`
- Retriable categories: timeout, transient network, provider 5xx, rate-limit (429).
- Non-retriable categories: validation, missing config, provider 4xx, unknown.

## Data Model Changes
- Workflow enums:
  - `WorkflowStatus.COMPLETED` renamed to `SUCCESS`.
  - Added run statuses: `PARTIAL`, `DLQ_PENDING`.
  - `WorkflowStepStatus.COMPLETED` renamed to `SUCCESS`.
  - Added step statuses: `RETRYING`, `DLQ`.
- `WorkflowStep` additions:
  - `attemptCount`, `maxRetries`, `nextRetryAt`, `firstFailedAt`, `lastFailedAt`, `errorStack`, `correlationId`, `retryPolicyOverride`.
- Idempotency:
  - `Communication.idempotencyKey` unique field.
- DLQ table:
  - `WorkflowStepDlqItem` stores org/run/step identity, failure reason + stack, category, attempt/timestamps, sanitized payload snapshot, config snapshot, correlation ID, replay metadata, and resolution metadata.

## Step/Run State Models
- Step: `PENDING -> RUNNING -> SUCCESS | RETRYING | DLQ | FAILED`.
- Run: `PENDING -> RUNNING -> SUCCESS | FAILED | PARTIAL | DLQ_PENDING`.
- `STEP_ONLY` replay marks run `PARTIAL` when downstream steps still exist.

## Replay Model
- `POST /api/v1/workflow-dlq/:id/replay`
- Modes:
  - `STEP_ONLY`: reruns failed step.
  - `FROM_STEP`: resets steps `>= fromStepIndex` to `PENDING` and resumes.
- Optional `overrideRetryPolicy` applied for replay execution.
- Replay updates DLQ item status to `REPLAYING`; successful replay resolves item.

## UI + Permissions
- Route: `/app/admin/dlq` (list) and `/app/admin/dlq/[id]` (detail).
- Actions: inspect, replay, resolve, ignore.
- Role gate:
  - `SUPER_ADMIN` alias maps to `OWNER`.
  - `ORG_ADMIN` alias maps to `ADMIN` and requires active org membership.
  - `STAFF`/`VIEWER` denied replay/resolve/ignore.

## Multi-Tenant and Safety
- All DLQ reads/writes are org-scoped in service queries.
- Membership checks enforce org-admin boundaries for non-owner users.
- Payload/config snapshots are redacted before DLQ persistence and audit metadata logging.

## Observability
- Structured logs include `correlationId` and workflow/step identity.
- Counters added:
  - `workflow_step_attempts_total`
  - `workflow_step_retries_total`
  - `workflow_dlq_moves_total`
  - `workflow_dlq_replays_total`
- Audit logs written for DLQ move, replay requested, replay outcome, resolve, and ignore.
