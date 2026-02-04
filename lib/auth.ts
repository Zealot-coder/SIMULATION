import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import type { NextAuthOptions, User } from "next-auth";

// Build base API URL for server-side requests
const API_BASE = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

type BackendLoginResponse = {
  user: {
    id: string;
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    role: string;
  };
  accessToken: string;
  refreshToken: string;
};

async function backendLogin(credentials: Record<string, string | undefined>) {
  // Try backend first, but fall back to demo account if backend is unavailable
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: credentials.email,
        phone: credentials.phone,
        password: credentials.password,
      }),
    });

    if (!res.ok) {
      throw new Error("Invalid credentials");
    }
    const data = (await res.json()) as BackendLoginResponse;
    return data;
  } catch (err: any) {
    // Fallback: Allow demo login for testing (comment out when backend is ready)
    console.warn("Backend auth unavailable, using demo account:", err.message);
    if (credentials.email === "demo@example.com" && credentials.password === "demo123") {
      return {
        user: { id: "demo-user-1", email: "demo@example.com", role: "ORG_ADMIN", firstName: "Demo", lastName: "User" },
        accessToken: "demo-token",
        refreshToken: "demo-refresh-token",
      };
    }
    // For SUPER_ADMIN testing
    if (credentials.email === "admin@example.com" && credentials.password === "admin123") {
      return {
        user: { id: "admin-user-1", email: "admin@example.com", role: "SUPER_ADMIN", firstName: "Super", lastName: "Admin" },
        accessToken: "admin-token",
        refreshToken: "admin-refresh-token",
      };
    }
    throw new Error("Backend unavailable and no demo credentials matched. Try demo@example.com / demo123 or admin@example.com / admin123");
  }
}

async function backendRefresh(refreshToken: string) {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { accessToken: string; refreshToken: string };
  return data;
}

// Build providers list conditionally to avoid runtime errors when env vars are missing
const providers: NextAuthOptions["providers"] = [
  Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        phone: { label: "Phone", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials) return null;
        const data = await backendLogin(credentials);
        const user: User & {
          accessToken: string;
          refreshToken: string;
          role?: string;
        } = {
          ...data.user,
          name: [data.user.firstName, data.user.lastName].filter(Boolean).join(" ") || undefined,
          email: data.user.email,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          role: data.user.role,
        } as any;
        return user;
      },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          // Force account chooser so users can pick among Google accounts
          prompt: "select_account",
          // The following are common defaults; keep if you need refresh tokens
          // access_type: "offline",
          // response_type: "code",
        },
      },
    })
  );
}

if (process.env.GITHUB_ID && process.env.GITHUB_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    })
  );
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers,
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        token.user = {
          id: (user as any).id,
          email: (user as any).email,
          phone: (user as any).phone,
          firstName: (user as any).firstName,
          lastName: (user as any).lastName,
          role: (user as any).role,
        };
        token.accessToken = (user as any).accessToken;
        token.refreshToken = (user as any).refreshToken;
        return token;
      }

      // Handle client session update requests
      if (trigger === "update" && session) {
        token.user = { ...(token.user as any), ...(session as any).user };
        return token;
      }

      // Optionally refresh token here if needed
      if (token.refreshToken && !token.accessTokenExpiredAt) {
        // If your backend provides expiry, you can track it. Otherwise, rely on API 401s to trigger refresh server-side.
      }

      return token;
    },
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      (session as any).refreshToken = token.refreshToken;
      session.user = {
        ...(session.user || {}),
        ...(token.user as any),
      } as any;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export type { NextAuthOptions };

