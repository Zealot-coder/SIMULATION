"use client";

import { useEffect, Suspense, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { getPublicApiBaseUrl } from "@/lib/api-client";

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
function SuccessState({ destination }: { destination: string }) {
  const isOnboarding = destination === "/app/onboarding";
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
          <h2 className="text-xl font-semibold">{isOnboarding ? "Let's get started" : "Welcome back!"}</h2>
          <p className="text-sm text-muted-foreground">
            Redirecting to {isOnboarding ? "onboarding" : "overview"}...
          </p>
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
  const [oauthExchangeError, setOauthExchangeError] = useState<string | null>(null);
  const [isExchangingToken, setIsExchangingToken] = useState(false);
  const [redirectTarget, setRedirectTarget] = useState<string | null>(null);
  const handledBackendToken = useRef(false);
  const resolvingRedirect = useRef(false);
  const error = searchParams.get("error");
  const backendAccessToken = searchParams.get("token");
  const backendRefreshToken = searchParams.get("refreshToken");

  useEffect(() => {
    if (!backendAccessToken || handledBackendToken.current) {
      return;
    }

    handledBackendToken.current = true;
    setIsExchangingToken(true);
    setOauthExchangeError(null);

    signIn("oauth-token", {
      token: backendAccessToken,
      refreshToken: backendRefreshToken || undefined,
      redirect: false,
      callbackUrl: "/auth/callback",
    })
      .then((result) => {
        if (result?.error) {
          const reason =
            result.error === "CredentialsSignin"
              ? "Session exchange failed. Verify API_URL/NEXT_PUBLIC_API_URL points to your backend /api/v1."
              : `Session exchange failed (${result.error}).`;
          setOauthExchangeError(reason);
          return;
        }

        // Drop sensitive query params from URL once session is set.
        router.replace("/auth/callback");
      })
      .catch((err: any) => {
        console.error("OAuth callback token exchange failed:", err?.message || err);
        setOauthExchangeError("Authentication with provider failed. Please try again.");
      })
      .finally(() => {
        setIsExchangingToken(false);
      });
  }, [backendAccessToken, backendRefreshToken, router]);

  useEffect(() => {
    if (error) {
      console.error("OAuth error:", error);
      return;
    }

    if (oauthExchangeError || isExchangingToken) {
      return;
    }

    if (status === "loading" || !session?.user || redirectTarget || resolvingRedirect.current) {
      return;
    }

    const accessToken = (session as any).accessToken as string | undefined;
    if (!accessToken) {
      setOauthExchangeError("Session token is missing. Please sign in again.");
      return;
    }

    resolvingRedirect.current = true;

    fetch(`${getPublicApiBaseUrl()}/auth/context`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.message || "Failed to resolve organization context");
        }

        const payload = (await response.json()) as { onboarding_required?: boolean };
        const nextRoute = payload.onboarding_required ? "/app/onboarding" : "/app/overview";
        setRedirectTarget(nextRoute);

        setTimeout(() => {
          router.push(nextRoute);
        }, 800);
      })
      .catch((fetchError: any) => {
        console.error("Failed to resolve auth context:", fetchError?.message || fetchError);
        setOauthExchangeError(fetchError?.message || "Failed to resolve organization context.");
      })
      .finally(() => {
        resolvingRedirect.current = false;
      });
  }, [error, oauthExchangeError, isExchangingToken, redirectTarget, router, session, status]);

  const resolvedError =
    oauthExchangeError ||
    (error === "oauth_failed"
      ? "Authentication with provider failed. Please try again."
      : error
      ? "An unexpected error occurred during sign in."
      : null);

  // Show error state
  if (resolvedError) {
    return (
      <ErrorState
        message={resolvedError}
        onRetry={() => window.location.href = "/auth/sign-in"}
      />
    );
  }

  // Show success state briefly before redirect
  if (session?.user && redirectTarget) {
    return <SuccessState destination={redirectTarget} />;
  }

  if (backendAccessToken || isExchangingToken || status === "loading") {
    return <LoadingState message="Completing sign in..." />;
  }

  // If authentication failed and no session exists
  if (status === "unauthenticated") {
    return (
      <ErrorState
        message="We could not establish a session. Please sign in again."
        onRetry={() => window.location.href = "/auth/sign-in"}
      />
    );
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
