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
    process.env.GITHUB_ID || process.env.GITHUB_CLIENT_ID || process.env.AUTH_GITHUB_ID || process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
  const backendBase = getBackendApiBase();

  // If not configured, fall back to backend-initiated OAuth.
  if (!clientId) {
    return NextResponse.redirect(new URL(`${backendBase}/auth/github`));
  }

  const redirectUri = `${backendBase}/auth/github/callback`;

  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "user:email");

  return NextResponse.redirect(url);
}

