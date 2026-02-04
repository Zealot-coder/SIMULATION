import React from "react";
import { AppShell } from "@/components/app-shell";

async function fetchDevOverview() {
  const res = await fetch(`${process.env.NEXTAUTH_URL}/api/dev/overview`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load dev overview");
  return res.json();
}

export default async function DevOverviewPage() {
  let data: any = {};
  try {
    data = await fetchDevOverview();
  } catch (e) {
    console.error(e);
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="border rounded p-4 bg-white">
            <div className="text-xs text-muted-foreground">Error Rate</div>
            <div className="text-2xl font-semibold">{(data.error_rate ?? 0) * 100}%</div>
          </div>
          <div className="border rounded p-4 bg-white">
            <div className="text-xs text-muted-foreground">Queue Lag (avg)</div>
            <div className="text-2xl font-semibold">{data.queue_lag?.avg_ms ?? "—"} ms</div>
          </div>
          <div className="border rounded p-4 bg-white">
            <div className="text-xs text-muted-foreground">Events/min</div>
            <div className="text-2xl font-semibold">{data.events_per_minute ?? "—"}</div>
          </div>
          <div className="border rounded p-4 bg-white">
            <div className="text-xs text-muted-foreground">Noisy Tenants</div>
            <div className="text-2xl font-semibold">{data.noisy_tenants?.length ?? 0}</div>
          </div>
        </div>

        <div className="border rounded p-4 bg-white">
          <div className="text-sm font-semibold mb-2">Top Noisy Tenants</div>
          <ul className="space-y-2">
            {data.noisy_tenants?.map((t: any) => (
              <li key={t.orgId} className="flex justify-between">
                <div>{t.orgId}</div>
                <div className="text-sm text-muted-foreground">events: {t.events} failures: {t.failures}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
