import { NextResponse } from "next/server";
import { requireRoleAtLeast } from "@/lib/rbac";
import * as sb from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // Only super admin can access developer console endpoints
    await requireRoleAtLeast("SUPER_ADMIN");

    try {
      const data = await sb.devOverview();
      return NextResponse.json({
        error_rate: 0.02,
        queue_lag: { avg_ms: 1200 },
        events_per_minute: 400,
        noisy_tenants: data.events_per_org || [],
      });
    } catch (supErr: any) {
      console.warn("Supabase dev overview failed, returning mock:", supErr.message || supErr);
      const data = {
        error_rate: 0.02,
        queue_lag: { avg_ms: 1200 },
        events_per_minute: 400,
        noisy_tenants: [{ orgId: "org_1", events: 12345, failures: 23 }],
        _warning: supErr.message || String(supErr),
      };
      return NextResponse.json(data);
    }
  } catch (err: any) {
    console.error("/api/dev/overview error", err);
    return new NextResponse(JSON.stringify({ error: err.message || "Invalid request" }), {
      status: err.status || 400,
    });
  }
}
