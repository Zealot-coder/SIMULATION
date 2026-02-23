import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import type { NextAuthOptions, User } from "next-auth";
import { isDevRole } from "@/lib/dashboard";

const LOCAL_API_BASE_URL = "http://localhost:3001/api/v1";
const PROD_API_BASE_FALLBACK =
  (process.env.API_URL_FALLBACK || process.env.NEXT_PUBLIC_API_FALLBACK_URL || "https://simulation-cyww.onrender.com/api/v1").replace(/\/$/, "");

function normalizeApiBase(url: string) {
  const trimmed = url.replace(/\/$/, "");
  if (!trimmed) return trimmed;

  try {
    const parsed = new URL(trimmed);
    if (!parsed.pathname || parsed.pathname === "/") {
      parsed.pathname = "/api/v1";
    }
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return trimmed;
  }
}

function isLocalApiUrl(url: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?/i.test(url);
}

// Build base API URL for server-side requests
function getServerApiBase() {
  const serverApi = normalizeApiBase(process.env.API_URL || "");
  const publicApi = normalizeApiBase(process.env.NEXT_PUBLIC_API_URL || "");

  if (serverApi) {
    if (process.env.NODE_ENV === "production" && isLocalApiUrl(serverApi)) {
      return PROD_API_BASE_FALLBACK;
    }
    return serverApi;
  }

  if (publicApi) {
    if (process.env.NODE_ENV === "production" && isLocalApiUrl(publicApi)) {
      return PROD_API_BASE_FALLBACK;
    }
    return publicApi;
  }

  return process.env.NODE_ENV === "production" ? normalizeApiBase(PROD_API_BASE_FALLBACK) : LOCAL_API_BASE_URL;
}

const API_BASE = getServerApiBase();
const AUTH_SECRET = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || process.env.JWT_SECRET;
const GOOGLE_OAUTH_ID = process.env.GOOGLE_CLIENT_ID || process.env.AUTH_GOOGLE_ID;
const GOOGLE_OAUTH_SECRET = process.env.GOOGLE_CLIENT_SECRET || process.env.AUTH_GOOGLE_SECRET;
const GITHUB_OAUTH_ID = process.env.GITHUB_ID || process.env.GITHUB_CLIENT_ID || process.env.AUTH_GITHUB_ID;
const GITHUB_OAUTH_SECRET = process.env.GITHUB_SECRET || process.env.GITHUB_CLIENT_SECRET || process.env.AUTH_GITHUB_SECRET;
// Default OAuth mode uses backend routes (/api/v1/auth/google|github).
// Set this to true only if you intentionally want direct NextAuth OAuth callbacks.
const NEXTAUTH_USE_DIRECT_OAUTH = process.env.NEXTAUTH_USE_DIRECT_OAUTH === "true";

// User roles type
export type UserRole = "OWNER" | "ADMIN" | "STAFF" | "VIEWER" | "SUPER_ADMIN" | "ORG_ADMIN" | "OPERATOR";

// Extended user type
interface ExtendedUser extends User {
  id: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  name?: string;
  avatar?: string;
  accessToken: string;
  refreshToken: string;
  activeOrganizationId?: string;
  onboardingRequired?: boolean;
}

type BackendLoginResponse = {
  user: {
    id: string;
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    avatar?: string;
    role: UserRole;
    activeOrganizationId?: string;
    onboardingRequired?: boolean;
  };
  accessToken: string;
  refreshToken: string;
};

type BackendMeResponse = {
  id: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  avatar?: string;
  role?: UserRole;
  activeOrganizationId?: string;
  onboardingRequired?: boolean;
};

/**
 * Determine dashboard route based on user role
 */
export function getDashboardRoute(role: UserRole): string {
  if (isDevRole(role)) {
    return '/dev/overview';
  }
  return '/app/overview';
}

function ensureServerApiBaseConfigured() {
  if (process.env.NODE_ENV === "production" && API_BASE.includes("localhost")) {
    throw new Error("Server auth misconfigured: API_URL must point to your deployed backend in production.");
  }
}

async function backendLogin(credentials: Record<string, string | undefined>) {
  try {
    ensureServerApiBaseConfigured();
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
      const payload = await res.json().catch(() => null);
      throw new Error(payload?.message || "Invalid credentials");
    }
    const data = (await res.json()) as BackendLoginResponse;
    return data;
  } catch (err: any) {
    console.error("Backend login failed:", err?.message || err);
    const msg = String(err?.message || "");
    if (msg.toLowerCase().includes("fetch failed")) {
      throw new Error("Unable to reach authentication server. Verify API_URL/NEXT_PUBLIC_API_URL and backend uptime.");
    }
    throw new Error(err?.message || "Unable to sign in at the moment. Please try again.");
  }
}

async function backendRegister(data: { email: string; password: string; firstName?: string; lastName?: string }) {
  try {
    ensureServerApiBaseConfigured();
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Registration failed");
    }
    return await res.json() as BackendLoginResponse;
  } catch (err: any) {
    console.warn("Backend registration failed:", err.message);
    const msg = String(err?.message || "");
    if (msg.toLowerCase().includes("fetch failed")) {
      throw new Error("Unable to reach authentication server. Verify API_URL/NEXT_PUBLIC_API_URL and backend uptime.");
    }
    throw err;
  }
}

async function backendUserFromAccessToken(accessToken: string) {
  try {
    ensureServerApiBaseConfigured();
    const res = await fetch(`${API_BASE}/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => null);
      throw new Error(payload?.message || "Invalid OAuth token");
    }

    return (await res.json()) as BackendMeResponse;
  } catch (err: any) {
    console.error("Backend OAuth token verification failed:", err?.message || err);
    const msg = String(err?.message || "");
    if (msg.toLowerCase().includes("fetch failed")) {
      throw new Error("Unable to reach authentication server. Verify API_URL/NEXT_PUBLIC_API_URL and backend uptime.");
    }
    throw new Error(err?.message || "Unable to verify OAuth sign in.");
  }
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
        if (!credentials?.email || !credentials?.password) return null;
        const data = await backendLogin(credentials);
        const user: ExtendedUser = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name || [data.user.firstName, data.user.lastName].filter(Boolean).join(" ") || data.user.email,
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          avatar: data.user.avatar,
          role: data.user.role,
          activeOrganizationId: data.user.activeOrganizationId,
          onboardingRequired: data.user.onboardingRequired,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        };
        return user;
      },
  }),
  Credentials({
    id: "oauth-token",
    name: "OAuth Token",
    credentials: {
      token: { label: "Access Token", type: "text" },
      refreshToken: { label: "Refresh Token", type: "text" },
    },
    async authorize(credentials) {
      const accessToken = credentials?.token;
      if (!accessToken) return null;

      const backendUser = await backendUserFromAccessToken(accessToken);
      const user: ExtendedUser = {
        id: backendUser.id,
        email: backendUser.email,
        name: backendUser.name || [backendUser.firstName, backendUser.lastName].filter(Boolean).join(" ") || backendUser.email,
        firstName: backendUser.firstName,
        lastName: backendUser.lastName,
        avatar: backendUser.avatar,
        role: backendUser.role || "VIEWER",
        activeOrganizationId: backendUser.activeOrganizationId,
        onboardingRequired: backendUser.onboardingRequired,
        accessToken,
        refreshToken: credentials?.refreshToken || "",
      };

      return user;
    },
  }),
];

if (NEXTAUTH_USE_DIRECT_OAUTH && GOOGLE_OAUTH_ID && GOOGLE_OAUTH_SECRET) {
  providers.push(
    Google({
      clientId: GOOGLE_OAUTH_ID,
      clientSecret: GOOGLE_OAUTH_SECRET,
      authorization: {
        params: {
          prompt: "select_account",
          scope: "openid email profile",
        },
      },
    })
  );
}

if (NEXTAUTH_USE_DIRECT_OAUTH && GITHUB_OAUTH_ID && GITHUB_OAUTH_SECRET) {
  providers.push(
    GitHub({
      clientId: GITHUB_OAUTH_ID,
      clientSecret: GITHUB_OAUTH_SECRET,
    })
  );
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers,
  callbacks: {
    async signIn({ user, account, profile }) {
      // Allow OAuth sign-ins - the backend will handle user creation/upsert
      return true;
    },
    async jwt({ token, user, trigger, session, account }) {
      // Initial sign in
      if (user) {
        const extendedUser = user as ExtendedUser;
        token.user = {
          id: extendedUser.id,
          email: extendedUser.email ?? undefined,
          name: extendedUser.name ?? undefined,
          firstName: extendedUser.firstName,
          lastName: extendedUser.lastName,
          avatar: extendedUser.avatar,
          role: extendedUser.role,
          activeOrganizationId: extendedUser.activeOrganizationId,
          organizationId: extendedUser.activeOrganizationId,
          onboardingRequired: extendedUser.onboardingRequired,
        };
        token.accessToken = extendedUser.accessToken;
        token.refreshToken = extendedUser.refreshToken;
        token.provider = account?.provider || "credentials";
        return token;
      }

      // Handle client session update requests
      if (trigger === "update" && session) {
        token.user = { ...(token.user as any), ...(session as any).user };
        return token;
      }

      // Ensure user object exists on token for subsequent requests
      if (!token.user) {
        token.user = {
          role: "VIEWER",
        };
      }

      return token;
    },
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      (session as any).refreshToken = token.refreshToken;
      (session as any).provider = token.provider;
      
      // Ensure user exists with role
      const userData = (token.user as any) || {};
      session.user = {
        ...(session.user || {}),
        ...userData,
        role: userData.role || "VIEWER",
      } as any;
      return session;
    },
    async redirect({ url, baseUrl }) {
      // If URL is relative, prepend base URL
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      
      // If URL is on the same origin, allow it
      if (url.startsWith(baseUrl)) {
        return url;
      }
      
      // Default redirect to base URL
      return baseUrl;
    },
  },
  pages: {
    signIn: "/auth/sign-in",
    error: "/auth/sign-in",
    newUser: "/app/overview",
  },
  events: {
    async signIn({ user, account, isNewUser }) {
      console.log(`User signed in: ${user.email} via ${account?.provider}`);
      if (isNewUser) {
        console.log(`New user created: ${user.email}`);
      }
    },
  },
  secret: AUTH_SECRET,
};

export type { NextAuthOptions };
export { backendRegister };
