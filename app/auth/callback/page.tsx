"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { getDashboardRouteForRole, isDevRole } from "@/lib/dashboard";

// Brand colors
const BRAND_ORANGE = "#f97316";

/**
 * Loading animation component with brand styling
 */
function LoadingState({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20"
    >
      <div className="text-center space-y-6 p-8 rounded-2xl bg-card border border-border shadow-lg">
        {/* Animated logo/icon */}
        <div className="relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 mx-auto"
          >
            <Loader2 className="w-16 h-16" style={{ color: BRAND_ORANGE }} />
          </motion.div>
          {/* Pulse effect */}
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 w-16 h-16 mx-auto rounded-full"
            style={{ backgroundColor: BRAND_ORANGE }}
          />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold">{message}</h2>
          <p className="text-sm text-muted-foreground">
            Please wait while we prepare your workspace
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: BRAND_ORANGE }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Success state before redirect
 */
function SuccessState({ role }: { role: string }) {
  const dashboardRoute = getDashboardRouteForRole(role);
  const isAdmin = isDevRole(role);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20"
    >
      <div className="text-center space-y-6 p-8 rounded-2xl bg-card border border-border shadow-lg">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <CheckCircle2 className="w-16 h-16 mx-auto text-green-500" />
        </motion.div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Welcome back!</h2>
          <p className="text-sm text-muted-foreground">
            Redirecting to your {isAdmin ? "admin" : "user"} dashboard...
          </p>
        </div>

        <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full inline-block">
          {dashboardRoute}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Error state for failed authentication
 */
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20"
    >
      <div className="text-center space-y-6 p-8 rounded-2xl bg-card border border-destructive/20 shadow-lg max-w-md">
        <AlertCircle className="w-16 h-16 mx-auto text-destructive" />

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-destructive">Sign In Failed</h2>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={onRetry}
            className="w-full px-4 py-2 rounded-lg font-medium text-white transition-all hover:opacity-90"
            style={{ backgroundColor: BRAND_ORANGE }}
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.href = "/auth/sign-in"}
            className="w-full px-4 py-2 rounded-lg font-medium border border-border hover:bg-muted transition-all"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Main callback content - handles OAuth response
 */
function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    const error = searchParams.get("error");
    
    if (error) {
      console.error("OAuth error:", error);
      return;
    }

    // Wait for session to be ready
    if (status === "loading") {
      return;
    }

    // If we have a session, redirect to appropriate dashboard
    if (session?.user) {
      const userRole = (session.user as any).role || "VIEWER";
      const redirectRoute = getDashboardRouteForRole(userRole);
      
      // Short delay to show success state
      const timeout = setTimeout(() => {
        router.push(redirectRoute);
      }, 800);
      
      return () => clearTimeout(timeout);
    }
  }, [searchParams, router, session, status]);

  const error = searchParams.get("error");

  // Show error state
  if (error) {
    return (
      <ErrorState
        message={error === "oauth_failed" 
          ? "Authentication with provider failed. Please try again."
          : "An unexpected error occurred during sign in."
        }
        onRetry={() => window.location.href = "/auth/sign-in"}
      />
    );
  }

  // Show success state briefly before redirect
  if (session?.user) {
    const userRole = (session.user as any).role || "VIEWER";
    return <SuccessState role={userRole} />;
  }

  // Default loading state
  return <LoadingState message="Completing sign in..." />;
}

/**
 * Main page component with suspense boundary
 */
export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingState message="Loading..." />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
