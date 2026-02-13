/*
  Minimal Supabase server helper using PostgREST endpoints via fetch.
  - Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment (do NOT modify env files here).
  - Designed for server-side usage only (service role key required for cross-tenant queries).
  - Falls back to throwing an informative error if keys are missing.
*/


import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const createClient = (cookieStore: ReturnType<typeof cookies>) => {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Supabase public configuration missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)."
    );
  }
  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
};


const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function assertSupabaseConfigured() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    const err: any = new Error(
      "Supabase service role configuration missing. Set SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) to enable DB-backed endpoints."
    );
    err.status = 500;
    throw err;
  }
}

async function supabaseFetch(path: string, opts: RequestInit = {}) {
  assertSupabaseConfigured();
  const base = SUPABASE_URL as string; // asserted after check
  const key = SERVICE_ROLE_KEY as string;
  const url = `${base.replace(/\/$/, "")}${path}`;
  const headers = new Headers(opts.headers || {});
  headers.set("apikey", key);
  headers.set("Authorization", `Bearer ${key}`);
  // By default allow relatively fresh data
  const res = await fetch(url, { ...opts, headers });
  if (!res.ok) {
    const body = await res.text();
    const err: any = new Error(`Supabase request failed: ${res.status} ${res.statusText} - ${body}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// Helper queries
export async function countEventsToday(orgId: string) {
  // Select count from events where organization_id=orgId and created_at >= today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const iso = today.toISOString();
  const data: any = await supabaseFetch(`/rest/v1/events?select=id&organization_id=eq.${orgId}&created_at=gte.${encodeURIComponent(iso)}&limit=1`, { method: "GET" });
  // PostgREST supports head requests for count via ?select=count
  const countRes = await supabaseFetch(`/rest/v1/events?select=count&id=not.is.null&organization_id=eq.${orgId}&created_at=gte.${encodeURIComponent(iso)}`, { method: "GET" });
  // countRes may be [{ count: 'N' }] depending on PostgREST version
  if (Array.isArray(countRes) && countRes.length > 0 && (countRes[0].count !== undefined)) {
    return Number(countRes[0].count);
  }
  return Array.isArray(data) ? data.length : 0;
}

export async function countFailedRuns(orgId: string) {
  const data: any = await supabaseFetch(`/rest/v1/workflow_runs?select=id&organization_id=eq.${orgId}&status=eq.failed`, { method: "GET" });
  return Array.isArray(data) ? data.length : 0;
}

export async function countPendingPayments(orgId: string) {
  const data: any = await supabaseFetch(`/rest/v1/payments?select=id&organization_id=eq.${orgId}&status=eq.pending`, { method: "GET" });
  return Array.isArray(data) ? data.length : 0;
}

export async function successRate(orgId: string) {
  // Compute success rate over last 7 days
  const now = new Date();
  const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const succeededRes = await supabaseFetch(`/rest/v1/workflow_runs?select=count&id=not.is.null&organization_id=eq.${orgId}&status=eq.completed&created_at=gte.${encodeURIComponent(from)}`, { method: "GET" });
  const totalRes = await supabaseFetch(`/rest/v1/workflow_runs?select=count&id=not.is.null&organization_id=eq.${orgId}&created_at=gte.${encodeURIComponent(from)}`, { method: "GET" });
  const succeeded = Array.isArray(succeededRes) && succeededRes.length > 0 && succeededRes[0].count ? Number(succeededRes[0].count) : 0;
  const total = Array.isArray(totalRes) && totalRes.length > 0 && totalRes[0].count ? Number(totalRes[0].count) : 0;
  if (total === 0) return 100;
  return Math.round((succeeded / total) * 100 * 100) / 100;
}

export async function recentEvents(orgId: string, limit = 10) {
  const data: any = await supabaseFetch(`/rest/v1/events?select=id,type,payload,created_at&organization_id=eq.${orgId}&order=created_at.desc&limit=${limit}`, { method: "GET" });
  return data;
}

export async function recentFailingRuns(orgId: string, limit = 5) {
  const data: any = await supabaseFetch(`/rest/v1/workflow_runs?select=id,workflow_id,status,input,output,created_at&organization_id=eq.${orgId}&status=eq.failed&order=created_at.desc&limit=${limit}`, { method: "GET" });
  return data;
}

export async function devOverview() {
  // Cross-tenant metrics, requires service role
  const eventsPerMinuteRes: any = await supabaseFetch(`/rest/v1/events?select=organization_id,count=id&group=organization_id`, { method: "GET" });
  // For simplicity, return aggregated counts
  return { events_per_org: eventsPerMinuteRes };
}
