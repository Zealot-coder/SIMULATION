# Idempotency Layer Design

## Scope
- API idempotency for selected state-mutating endpoints via `Idempotency-Key`.
- Webhook deduplication for `whatsapp`, `momo`, and `custom`.
- Workflow step deduplication to prevent duplicate side effects under redelivery/retry.
- Payment deduplication at webhook boundary (`payment_confirmation`, `payment_request` scopes).

## Keys and Fingerprints
- Request fingerprint:
  - `sha256(method + path + canonical_json(body) + organization_id + actor_user_id)`
- API scope key:
  - `scope = api:<METHOD>:<ROUTE_PATH>:actor:<ACTOR_ID>`
  - uniqueness from `(organizationId, scope, key)`.
- Webhook dedup key:
  - WhatsApp: message/event id fields.
  - MoMo: transaction/reference id fields.
  - Fallback: `sha256(signature + timestamp + canonical_json(payload))`.
- Step dedup key:
  - `(organization_id, workflow_run_id, step_key, input_hash)`
  - `input_hash` built from canonicalized step input with volatile timestamps removed.
- Payment dedup keys:
  - Confirmation: `provider:<provider>:tx:<provider_tx_id>`
  - Request intent: `provider:<provider>:order:<order_id>:amount:<amount>:phone:<phone>`

## Concurrency Model
- API requests use DB uniqueness on `(organizationId, scope, key)`.
- First request inserts `IN_PROGRESS`.
- Duplicate behavior:
  - fingerprint mismatch: `409 Conflict`.
  - `COMPLETED`: replay stored response.
  - `FAILED` + non-retriable (4xx): replay stored error.
  - `IN_PROGRESS`: return `202`.
- Webhooks use DB uniqueness on `(organizationId, provider, dedupKey)` to prevent double processing under concurrent delivery.
- Step dedup uses DB uniqueness plus lock status:
  - `DONE`: reuse stored result.
  - `LOCKED`: requeue and avoid side effects.

## TTL and Cleanup
- Default TTL: 24 hours (`IDEMPOTENCY_TTL_HOURS`, `WEBHOOK_DEDUP_TTL_HOURS`, `STEP_DEDUP_TTL_HOURS`).
- Cleanup runs hourly on BullMQ maintenance queue and deletes expired rows in bounded batches.

## Safety
- All records are organization-scoped.
- Sensitive payload fragments are redacted before persistence.
- Phone-like values are masked in cached payload snapshots.

## Observability
- Metrics:
  - `idempotency_hit`
  - `idempotency_miss`
  - `webhook_duplicate`
  - `step_duplicate`
  - `payment_duplicate`
- Response headers on idempotent routes:
  - `X-Idempotency-Key`
  - `X-Idempotency-Status` (`MISS|HIT|IN_PROGRESS|CONFLICT`)
