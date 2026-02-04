import React from "react";
import { AppShell } from "@/components/app-shell";
import { KpiCard } from "@/components/kpi-card";
import { EventStream } from "@/components/event-stream";

async function fetchOverview(orgId: string) {
  const res = await fetch(`${process.env.NEXTAUTH_URL}/api/org/overview?orgId=${orgId}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load overview");
  return res.json();
}

export default async function OverviewPage({ searchParams }: { searchParams?: { orgId?: string } }) {
  const orgId = (searchParams && searchParams.orgId) || process.env.NEXT_PUBLIC_DEFAULT_ORG_ID || "00000000-0000-0000-0000-000000000000";

  let data: any = { kpis: {}, recent_events: [], failing_runs: [] };
  try {
    data = await fetchOverview(orgId);
  } catch (e) {
    // Show graceful empty state
  }

  return (
    <AppShell currentOrg={{ id: orgId, name: "Demo Org" }}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Events Today" value={data.kpis?.events_today ?? "—"} />
          <KpiCard title="Failed Runs" value={data.kpis?.failed_runs ?? "—"} />
          <KpiCard title="Pending Payments" value={data.kpis?.pending_payments ?? "—"} />
          <KpiCard title="Success Rate" value={data.kpis?.success_rate ? `${data.kpis.success_rate}%` : "—"} />
        </div>

        <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <EventStream items={data.recent_events} />
          </div>
          <div className="space-y-4">
            <div className="border rounded p-4 bg-white">
              <div className="text-sm font-semibold mb-2">Failing Workflows</div>
              {data.failing_runs.length === 0 ? <div className="text-muted-foreground">No recent failures</div> : (
                <ul className="space-y-2">
                  {data.failing_runs.map((r: any) => (
                    <li key={r.id} className="text-sm">
                      <div className="font-medium">{r.workflow}</div>
                      <div className="text-xs text-muted-foreground">{r.error}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border rounded p-4 bg-white">
              <div className="text-sm font-semibold mb-2">AI Assistant</div>
              <div className="text-sm text-muted-foreground">Daily summary & suggestions will appear here. (Requires AI service)</div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
