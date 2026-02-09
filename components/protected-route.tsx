"use client";

import { useEffect, ReactNode } from "react";
import { useAuth, UserRole, getDashboardRoute } from "@/contexts/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

// Brand color
const BRAND_ORANGE = "#f97316";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: UserRole | UserRole[];
  fallback?: ReactNode;
}

/**
 * Loading screen for authentication checks
 */
function AuthLoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-4"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="w-12 h-12 mx-auto" style={{ color: BRAND_ORANGE }} />
        </motion.div>
        <p className="text-muted-foreground text-sm">Verifying your session...</p>
      </motion.div>
    </div>
  );
}

/**
 * Unauthorized access screen
 */
function UnauthorizedScreen({ requiredRole }: { requiredRole?: UserRole | UserRole[] }) {
  const router = useRouter();
  const { user } = useAuth();

  const roleText = Array.isArray(requiredRole) 
    ? requiredRole.join(" or ")
    : requiredRole;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center space-y-6"
      >
        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-10 h-10 text-destructive" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">
            You don&apos;t have permission to access this page.
            {roleText && (
              <span className="block mt-1">
                Required role: <span className="font-medium text-foreground">{roleText}</span>
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => router.push(user ? getDashboardRoute(user.role) : "/auth/sign-in")}
            className="text-white"
            style={{ backgroundColor: BRAND_ORANGE }}
          >
            Go to {user ? "Your Dashboard" : "Sign In"}
          </Button>
          {user && (
            <Button variant="outline" onClick={() => router.back()}>
              Go Back
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Protected Route Component
 * 
 * Features:
 * - Shows loading state while checking authentication
 * - Redirects unauthenticated users to sign-in
 * - Checks role requirements and shows unauthorized screen if needed
 * - Smooth animations for all state transitions
 */
export function ProtectedRoute({ 
  children, 
  requiredRole,
  fallback 
}: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Wait for auth check to complete
    if (loading) return;

    // Redirect unauthenticated users to sign-in
    if (!isAuthenticated) {
      const redirectUrl = `/auth/sign-in?redirect=${encodeURIComponent(pathname || "/")}`;
      router.replace(redirectUrl);
    }
  }, [isAuthenticated, loading, router, pathname]);

  // Show loading screen while checking auth
  if (loading) {
    return <AuthLoadingScreen />;
  }

  // Don't render anything if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  // Check role requirements
  if (requiredRole && user) {
    const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const hasRequiredRole = requiredRoles.includes(user.role);

    if (!hasRequiredRole) {
      return fallback || <UnauthorizedScreen requiredRole={requiredRole} />;
    }
  }

  // Render children if all checks pass
  return <>{children}</>;
}

/**
 * Admin-only route wrapper
 */
export function AdminRoute({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <ProtectedRoute requiredRole={["OWNER", "ADMIN"]} fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
}

/**
 * User route wrapper (excludes VIEWER from sensitive operations)
 */
export function StaffRoute({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <ProtectedRoute requiredRole={["OWNER", "ADMIN", "STAFF"]} fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
}

export default ProtectedRoute;
