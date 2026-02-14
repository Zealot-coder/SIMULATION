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

export async function GET() {
  const clientId =
    process.env.GOOGLE_CLIENT_ID || process.env.AUTH_GOOGLE_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const backendBase = getBackendApiBase();

  // If not configured, fall back to backend-initiated OAuth.
  if (!clientId) {
    return NextResponse.redirect(new URL(`${backendBase}/auth/google`));
  }

  const redirectUri = `${backendBase}/auth/google/callback`;

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "email profile");
  // Always show account chooser. Consent screen may not appear if already granted.
  url.searchParams.set("prompt", "select_account");

  return NextResponse.redirect(url);
}

