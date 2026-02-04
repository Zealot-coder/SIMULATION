import { NextResponse } from "next/server";
import { z } from "zod";
import { OverviewQuerySchema } from "@/lib/schemas/api";
import { requireOrgAccess } from "@/lib/rbac";
import * as sb from "@/lib/supabase-server";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const orgId = url.searchParams.get("orgId");
    const parsed = OverviewQuerySchema.parse({ orgId });

    await requireOrgAccess(parsed.orgId);

    // If Supabase is configured, return live KPIs
    try {
      const [eventsToday, failedRuns, pendingPayments, successRate, recentEvents, failingRuns] = await Promise.all([
        sb.countEventsToday(parsed.orgId),
        sb.countFailedRuns(parsed.orgId),
        sb.countPendingPayments(parsed.orgId),
        sb.successRate(parsed.orgId),
        sb.recentEvents(parsed.orgId, 10),
        sb.recentFailingRuns(parsed.orgId, 5),
      ]);

      const data = {
        kpis: {
          events_today: eventsToday,
          failed_runs: failedRuns,
          pending_payments: pendingPayments,
          success_rate: successRate,
        },
        recent_events: recentEvents.map((e: any) => ({ id: e.id, time: e.created_at, title: e.type, details: JSON.stringify(e.payload) })),
        failing_runs: failingRuns.map((r: any) => ({ id: r.id, workflow: r.workflow_id, error: JSON.stringify(r.output) })),
      };

      return NextResponse.json(data);
    } catch (supErr: any) {
      // If Supabase not configured or query fails, fall back to safe mock and include warning
      console.warn("Supabase overview fetch failed, returning mock data:", supErr.message || supErr);
      const data = {
        kpis: {
          events_today: 1234,
          failed_runs: 3,
          pending_payments: 5,
          success_rate: 98.7,
        },
        recent_events: [
          { id: "1", time: new Date().toISOString(), title: "Order.created", details: "Order #1009 placed" },
          { id: "2", time: new Date().toISOString(), title: "Payment.failed", details: "Stripe payment failed" },
        ],
        failing_runs: [{ id: "run_1", workflow: "checkout", error: "Timeout calling payment provider" }],
        _warning: supErr.message || String(supErr),
      };

      return NextResponse.json(data);
    }
  } catch (err: any) {
    console.error("/api/org/overview error", err);
    return new NextResponse(JSON.stringify({ error: err.message || "Invalid request" }), { status: err.status || 400 });
  }
}
