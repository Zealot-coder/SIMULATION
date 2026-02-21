import { NextResponse } from "next/server";

function normalizeApiBase(url: string) {
  const trimmed = url.replace(/\/$/, "");
  if (!trimmed) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (!parsed.pathname || parsed.pathname === "/") parsed.pathname = "/api/v1";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return trimmed;
  }
}

function getBackendApiBase() {
  const serverApi = normalizeApiBase(process.env.API_URL || "");
  const publicApi = normalizeApiBase(process.env.NEXT_PUBLIC_API_URL || "");
  const fallback = normalizeApiBase(process.env.NEXT_PUBLIC_API_FALLBACK_URL || "https://simulation-cyww.onrender.com/api/v1");
  return serverApi || publicApi || fallback;
}

async function warmBackend(backendApiBase: string) {
  let timeoutHandle: NodeJS.Timeout | undefined;
  const controller = new AbortController();

  try {
    timeoutHandle = setTimeout(() => controller.abort(), 8000);
    const healthUrl = new URL("/health", backendApiBase).toString();
    await fetch(healthUrl, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
  } catch {
    // Render free instances can be asleep; ignore warm-up failures and continue OAuth flow.
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

export async function GET() {
  const backendBase = getBackendApiBase();
  await warmBackend(backendBase);
  return NextResponse.redirect(new URL(`${backendBase}/auth/google`));
}
