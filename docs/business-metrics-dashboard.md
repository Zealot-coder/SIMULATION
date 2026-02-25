# Business Metrics Dashboard - Automation Intelligence Layer

## Design Summary
- Added an org-scoped aggregation layer backed by two bucketed tables:
  - `org_hourly_metrics`
  - `org_daily_metrics`
- Aggregates are updated on operational writes, not on dashboard reads:
  - Event ingestion (`EventService.create`)
  - Workflow terminal outcomes (`SUCCESS`, `FAILED`, `FAILED_SAFETY_LIMIT`)
  - Message send + delivery updates (`CommunicationService`)
- Dashboard APIs read only aggregate tables (plus bounded operational lookups for workflow health lists), then serve cached responses.

## SQL Migration
- Migration: `backend/prisma/migrations/20260225111500_business_metrics_dashboard/migration.sql`
- Adds:
  - `org_hourly_metrics`
  - `org_daily_metrics`
- Both tables include:
  - `organization_id`
  - bucket (`hour_bucket` or `day_bucket`)
  - required counters:
    - `orders_created`
    - `payments_total`
    - `payments_successful`
    - `workflows_total`
    - `workflows_failed`
    - `total_execution_time_ms`
    - `messages_sent`
    - `messages_delivered`
- Indexing:
  - unique `(organization_id, bucket)`
  - time bucket index
  - org + bucket index

## Backend Components
- Module: `backend/src/business-metrics/business-metrics.module.ts`
- Service: `backend/src/business-metrics/business-metrics.service.ts`
  - Writes delta increments to hourly + daily buckets in one transaction.
  - Computes summary, trend, and workflow-health responses.
  - Always filters by `organizationId`.
- Registry: `backend/src/business-metrics/metrics-registry.ts`
  - Metrics are declared via registry entries (`key`, `label`, `compute`, `buildAlerts`).
  - Supports extension without rewriting dashboard composition.
- Cache: `backend/src/business-metrics/business-metrics-cache.service.ts`
  - Uses Redis via Bull queue connection.
  - TTL default: `45s` (`BUSINESS_METRICS_CACHE_TTL_SEC`).
  - Cache invalidation via org version bump on every aggregate write.
  - In-memory fallback if Redis is unavailable.
- Controller: `backend/src/business-metrics/business-metrics.controller.ts`
  - `GET /metrics/summary`
  - `GET /metrics/trends`
  - `GET /metrics/workflow-health`

## Runtime Guard Hooks
- `backend/src/event/event.service.ts`
  - Emits event-derived order/payment deltas.
- `backend/src/workflow/workflow-execution.service.ts`
  - Records terminal workflow outcomes for failure rate + avg execution metrics.
- `backend/src/communication/communication.service.ts`
  - Records sent and delivered counters.
  - Adds webhook delivery-state application for provider callbacks.
- `backend/src/webhook/webhook.service.ts`
  - Applies communication delivery updates before event creation.

## Caching Strategy
- Every read endpoint uses cache key pattern:
  - `metrics:{orgId}:{scope}:v{version}:{range}`
- Version key:
  - `metrics:{orgId}:version`
- Invalidation:
  - Any aggregation write increments org version (`INCR`), invalidating previous keys.
- Benefits:
  - No wildcard deletes
  - Safe under horizontal scaling
  - Fast read path for dashboard traffic bursts

## Frontend Implementation
- Route: `app/(protected)/app/overview/page.tsx`
- Layout includes:
  - Header with org identity, date filter, refresh control
  - Plan badge + system health badge
  - Row 1: five KPI cards
  - Row 2: trend chart + workflow health breakdown
  - Row 3: recent failures table + AI insight panel
- Added components:
  - `components/metrics/metric-kpi-card.tsx`
  - `components/metrics/metric-alert-badge.tsx`
  - `components/metrics/orders-payments-trend-chart.tsx`
  - `components/metrics/workflow-health-breakdown.tsx`

## Example API Response

```json
{
  "organizationId": "org_123",
  "plan": { "id": "plan_pro", "name": "pro" },
  "range": {
    "from": "2026-02-25T00:00:00.000Z",
    "to": "2026-02-25T10:00:00.000Z",
    "granularity": "hour"
  },
  "kpis": [
    {
      "key": "orders_created",
      "label": "Orders Created",
      "value": 42,
      "unit": "count",
      "trend": "up",
      "deltaPercent": 16.7,
      "severity": "healthy",
      "description": "Orders captured from commerce events"
    }
  ],
  "alerts": [],
  "systemHealth": { "status": "healthy", "alertCount": 0 },
  "generatedAt": "2026-02-25T10:00:12.000Z"
}
```

## Test Coverage
- `backend/src/business-metrics/business-metrics.service.spec.ts`
  - Aggregation upsert delta correctness
  - Success/failure/delivery rate calculations
  - Workflow failure-rate scenario (10 runs, 2 failures => 20%)
  - Org isolation filter assertion
- `backend/src/business-metrics/business-metrics.controller.spec.ts`
  - Controller query-to-service wiring with org scope
- Existing specs updated for constructor signature changes:
  - `workflow-safety-guards.spec.ts`
  - `workflow-dlq.integration.spec.ts`
  - `event.service.spec.ts`
  - `webhook-dedup.integration.spec.ts`

## Edge Cases
- Empty denominator handling:
  - Rates return `0` (not `NaN`).
- Invalid date ranges:
  - Service clamps and normalizes ranges.
- Oversized range:
  - Capped by configurable guard in service (`clampDays`).
- Duplicate delivery webhooks:
  - No extra delivery increment unless status transitions to delivered/read.

## Concurrency Notes
- Writes are transactional and increment-based (no read-modify-write race).
- Unique org+bucket constraints prevent duplicate buckets.
- Cache invalidation uses atomic version increment; all workers converge safely.
- Operational event processing remains retry-safe; metrics failures are non-blocking and logged.
