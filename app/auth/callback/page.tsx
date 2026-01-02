"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { apiClient } from "@/lib/api-client";

export default function AuthCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { login } = useAuth();

  useEffect(() => {
    const token = searchParams.get("token");
    const provider = searchParams.get("provider");

    if (token) {
      // Set token and fetch user info
      apiClient.setToken(token);
      
      // Validate token by fetching user info (you might want to add a /auth/me endpoint)
      // For now, just redirect to dashboard
      router.push("/dashboard");
    } else {
      // No token, redirect to login
      router.push("/login?error=oauth_failed");
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}

