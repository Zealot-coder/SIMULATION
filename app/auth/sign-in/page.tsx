"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function SignInForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("next") || "/app/overview";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError(res.error);
      } else if (res?.ok) {
        window.location.href = callbackUrl;
      }
    } catch (err: any) {
      setError(err.message || "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: "google" | "github") {
    setLoading(true);
    try {
      await signIn(provider, { callbackUrl });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md p-6 bg-white rounded-lg border">
      <h1 className="text-2xl font-bold mb-4">Sign In</h1>
      {error && <div className="p-3 mb-4 bg-red-50 text-red-700 rounded text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded text-sm"
            placeholder="your@email.com"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded text-sm"
            placeholder="••••••••"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-primary text-white rounded text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-muted-foreground">Or continue with</span>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <button
          onClick={() => handleOAuth("google")}
          disabled={loading}
          className="w-full py-2 border rounded text-sm font-medium disabled:opacity-50 hover:bg-muted"
        >
          Google
        </button>
        <button
          onClick={() => handleOAuth("github")}
          disabled={loading}
          className="w-full py-2 border rounded text-sm font-medium disabled:opacity-50 hover:bg-muted"
        >
          GitHub
        </button>
      </div>

      <div className="text-sm text-center">
        Don't have an account?{" "}
        <Link href="/auth/sign-up" className="text-primary font-medium hover:underline">
          Sign up
        </Link>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <Suspense fallback={<div className="w-full max-w-md p-6 bg-white rounded-lg border animate-pulse">Loading...</div>}>
        <SignInForm />
      </Suspense>
    </div>
  );
}
