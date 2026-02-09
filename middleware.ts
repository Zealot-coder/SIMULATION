import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getDashboardRouteForRole, isDevRole } from "@/lib/dashboard";

const USER_PROTECTED_PATHS = ["/app", "/dashboard", "/account", "/settings"];
const AUTH_PATHS = ["/login", "/signup", "/auth/sign-in", "/auth/sign-up"];

function matchesPath(pathname: string, paths: string[]): boolean {
  return paths.some((path) => pathname.startsWith(path));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isAuthenticated = !!token;
  const userRole = (token?.user as any)?.role as string | undefined;

  if (pathname.startsWith("/dev")) {
    if (!isAuthenticated) {
      const signInUrl = new URL("/auth/sign-in", request.url);
      signInUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(signInUrl);
    }

    if (!isDevRole(userRole)) {
      const dashboardUrl = new URL(getDashboardRouteForRole(userRole), request.url);
      return NextResponse.redirect(dashboardUrl);
    }

    return NextResponse.next();
  }

  if (matchesPath(pathname, USER_PROTECTED_PATHS)) {
    if (!isAuthenticated) {
      const signInUrl = new URL("/auth/sign-in", request.url);
      signInUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(signInUrl);
    }

    return NextResponse.next();
  }

  if (matchesPath(pathname, AUTH_PATHS) && isAuthenticated) {
    const dashboardUrl = new URL(getDashboardRouteForRole(userRole), request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dev/:path*",
    "/app/:path*",
    "/dashboard/:path*",
    "/account/:path*",
    "/settings/:path*",
    "/login",
    "/signup",
    "/auth/sign-in",
    "/auth/sign-up",
  ],
};
