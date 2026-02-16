"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Github } from "lucide-react";
import { getPublicApiBaseUrl } from "@/lib/api-client";
import { AuthShell } from "@/components/auth-shell";

const PUBLIC_API_BASE = getPublicApiBaseUrl();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForBackendReady(timeoutMs: number = 25000) {
  const healthUrl = `${PUBLIC_API_BASE}/health`;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(healthUrl, {
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) return;
    } catch {
      // Keep retrying until deadline.
    }
    await sleep(1000);
  }
}

function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const postAuthRedirect = "/auth/callback";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: postAuthRedirect,
      });

      if (result?.error) {
        setError(
          result.error === "Configuration"
            ? "Authentication is not configured correctly. Please contact support."
            : result.error
        );
      } else if (result?.ok) {
        router.push(postAuthRedirect);
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: "google" | "github") => {
    setIsLoading(true);
    setError(null);
    await waitForBackendReady();
    window.location.href = `/api/oauth/${provider}`;
  };

  return (
    <AuthShell heading="Welcome back" subheading="Log in to manage your commerce operations.">
      {error && (
        <div
          aria-live="polite"
          className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {error}
        </div>
      )}

      <div className="space-y-3">
        <button
          onClick={() => handleOAuthSignIn("google")}
          disabled={isLoading}
          className="inline-flex w-full items-center justify-center gap-3 rounded-xl border border-[#4e3728] bg-[#1b110b]/70 px-4 py-3 text-sm font-semibold text-[#f8f2ea] transition-colors hover:border-[#6a4a34] hover:bg-[#24160e] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

        <button
          onClick={() => handleOAuthSignIn("github")}
          disabled={isLoading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#4e3728] bg-transparent px-4 py-3 text-sm font-medium text-[#cfb9a8] transition-colors hover:border-[#6a4a34] hover:text-[#f8f2ea] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Github className="h-4 w-4" />
          Continue with GitHub
        </button>
      </div>

      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#4b3324]" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-[#130a04] px-4 text-xs font-medium uppercase tracking-[0.18em] text-[#856f5f]">
            Or continue with email
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-[#f7eee6]">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-[#4d3525] bg-[#23160e]/80 px-4 py-3 text-base text-[#f8f2ea] placeholder:text-[#9b8471] focus:border-[#f28a16] focus:outline-none focus:ring-2 focus:ring-[#f28a16]/35"
            placeholder="name@company.com"
            required
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-[#f7eee6]">Password</label>
            <span className="text-xs font-medium text-[#f28a16]">Forgot?</span>
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-[#4d3525] bg-[#23160e]/80 px-4 py-3 pr-12 text-base text-[#f8f2ea] placeholder:text-[#9b8471] focus:border-[#f28a16] focus:outline-none focus:ring-2 focus:ring-[#f28a16]/35"
              placeholder="Enter your password"
              required
              disabled={isLoading}
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 px-4 text-[#bfa998] transition-colors hover:text-[#f8f2ea]"
              disabled={isLoading}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-xl bg-[#f28a16] px-4 py-3 text-base font-semibold text-white shadow-[0_10px_34px_rgba(242,138,22,0.35)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Signing in..." : "Sign in to System"}
        </button>
      </form>

      <p className="pt-2 text-center text-sm text-[#baa291]">
        Don&apos;t have an account?{" "}
        <Link href="/auth/sign-up" className="font-semibold text-[#f28a16] transition-colors hover:text-[#ffb15d]">
          Start free trial
        </Link>
      </p>
    </AuthShell>
  );
}

function SignInLoading() {
  return (
    <div className="min-h-[calc(100svh-4rem)] bg-[#130a04] px-4 py-8 text-center text-[#a18a79]">
      Loading...
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInLoading />}>
      <SignInForm />
    </Suspense>
  );
}
