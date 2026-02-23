# Workflow Safety Limits & Resource Governance Layer

## Design Summary
- Limits are persisted in PostgreSQL and resolved per organization at runtime.
- Effective limits are computed in this order: `plan defaults -> organization override_config`.
- Enforcement occurs in four paths:
  - Workflow definition validation (`create/update workflow`).
  - Runtime execution guard (`workflow runner` before each step).
  - Queue throttling (`concurrent slot acquisition` before run start).
  - Quota consumption (`daily workflow runs/messages/AI requests`).
- Safety limit failures are deterministic and auditable.

## Data Model
- `plans`: configurable plan limits (`free/pro/enterprise` seeded via migration).
- `organization_plans`: per-org plan assignment + optional `override_config`.
- `organization_usage`: per-org daily counters + current concurrent runs.
- `workflow_safety_violations`: structured safety breach log with action taken.
- `WorkflowExecution` extended with:
  - `iterationCount`
  - `concurrencySlotHeld`
  - `safetyLimitCode`
- `WorkflowStatus` extended with `FAILED_SAFETY_LIMIT`.

## Runtime Safety Guards
- `WORKFLOW_TIMEOUT`:
  - checked before each step using persisted `startedAt`.
  - deterministic (no `setTimeout` reliance).
- `STEP_ITERATION_LIMIT_EXCEEDED`:
  - execution-level `iterationCount` is incremented and enforced before each step.
- `CONCURRENT_LIMIT_EXCEEDED`:
  - atomic slot acquire using `organization_usage.concurrent_runs_current`.
  - if saturated, run is requeued with delay.
- Terminal safety failures:
  - set `WorkflowExecution.status = FAILED_SAFETY_LIMIT`
  - persist `safetyLimitCode`
  - audit + safety violation entry
  - release concurrency slot safely.

## Definition-Time Safety
- `MAX_STEPS_EXCEEDED` if workflow step count exceeds plan limit.
- Loop safety validation:
  - known loop step types require explicit iteration cap.
  - backward jumps require iteration cap to prevent infinite loops.
- Violations are rejected with structured error payload and audited.

## Quota Enforcement
- `PLAN_LIMIT_REACHED` is returned when daily quota is exceeded.
- Enforced before:
  - creating workflow execution (daily runs).
  - creating outbound communication record (daily messages).
  - creating AI request record (daily AI requests).

## Admin Surfaces
- APIs:
  - plan CRUD (create/update/list)
  - org plan assignment + overrides
  - usage listing and counter reset
  - safety violation listing
- Admin UI adds:
  - plan table + create/edit actions
  - org usage + reset + plan assignment controls
  - safety violation feed

## Tests Added
- Workflow runtime guards:
  - timeout breach
  - iteration breach
  - concurrent limit requeue
- Governance service:
  - reject definition with > max steps
  - block quota when daily run cap reached
  - org usage query scoping
- Governance controller:
  - usage endpoint enforces current-org scope.

## Edge Cases
- Missing governance tables: service falls back to safe defaults.
- Quota race conditions: daily increments use transaction-scoped upsert/update.
- Counter underflow: concurrent counter decrements only when `> 0`.
- Existing workflows with excessive steps are blocked at runtime even if legacy.

## Concurrency Safety Notes
- Concurrent slot acquisition uses compare-and-increment semantics per org/day.
- Slot release is idempotent via `updateMany` guard on `concurrencySlotHeld`.
- Requeue path records violation context and avoids process crash under saturation.
