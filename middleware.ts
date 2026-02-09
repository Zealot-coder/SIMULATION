import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Role hierarchy for permission checking
const ROLE_HIERARCHY: Record<string, number> = {
  OWNER: 4,
  ADMIN: 3,
  STAFF: 2,
  VIEWER: 1,
};

// Route configurations
const ROUTE_CONFIG = {
  // Admin-only routes (requires OWNER or ADMIN)
  admin: {
    paths: ["/dev"],
    minRole: "ADMIN",
    redirect: "/app/overview",
  },
  // Protected user routes (any authenticated user)
  user: {
    paths: ["/app", "/dashboard", "/account", "/settings"],
    redirect: "/auth/sign-in",
  },
  // Auth routes (redirect authenticated users away)
  auth: {
    paths: ["/login", "/auth/sign-in", "/signup"],
    redirect: "/app/overview",
  },
};

/**
 * Check if user has required role level
 */
function hasRequiredRole(userRole: string, minRole: string): boolean {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const minLevel = ROLE_HIERARCHY[minRole] || 0;
  return userLevel >= minLevel;
}

/**
 * Check if path matches any of the given path prefixes
 */
function matchesPath(pathname: string, paths: string[]): boolean {
  return paths.some((path) => pathname.startsWith(path));
}

/**
 * Get the user's dashboard route based on role
 */
function getUserDashboard(role: string): string {
  if (role === "OWNER" || role === "ADMIN") {
    return "/dev/overview";
  }
  return "/app/overview";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get session token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isAuthenticated = !!token;
  const userRole = (token?.user as any)?.role as string | undefined;

  // Check if trying to access admin routes
  if (matchesPath(pathname, ROUTE_CONFIG.admin.paths)) {
    // Not authenticated → redirect to sign-in
    if (!isAuthenticated) {
      const signInUrl = new URL("/auth/sign-in", request.url);
      signInUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(signInUrl);
    }

    // Authenticated but not admin → redirect to user dashboard
    if (!hasRequiredRole(userRole || "VIEWER", ROUTE_CONFIG.admin.minRole)) {
      const dashboardUrl = new URL(ROUTE_CONFIG.admin.redirect, request.url);
      return NextResponse.redirect(dashboardUrl);
    }

    // Admin access granted
    return NextResponse.next();
  }

  // Check if trying to access protected user routes
  if (matchesPath(pathname, ROUTE_CONFIG.user.paths)) {
    // Not authenticated → redirect to sign-in
    if (!isAuthenticated) {
      const signInUrl = new URL("/auth/sign-in", request.url);
      signInUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(signInUrl);
    }

    // Authenticated → allow access
    return NextResponse.next();
  }

  // Check if trying to access auth pages while authenticated
  if (matchesPath(pathname, ROUTE_CONFIG.auth.paths) && isAuthenticated) {
    // Redirect to appropriate dashboard based on role
    const dashboardUrl = new URL(getUserDashboard(userRole || "VIEWER"), request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // Allow all other routes
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Admin routes
    "/dev/:path*",
    // User protected routes
    "/app/:path*",
    "/dashboard/:path*",
    "/account/:path*",
    "/settings/:path*",
    // Auth routes (for redirecting authenticated users)
    "/login",
    "/auth/sign-in",
    "/signup",
    // Exclude static files and API routes
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)",
  ],
};
