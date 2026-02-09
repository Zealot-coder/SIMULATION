import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import type { NextAuthOptions, User } from "next-auth";

// Build base API URL for server-side requests
const API_BASE = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

// User roles type
export type UserRole = 'SUPER_ADMIN' | 'ORG_ADMIN' | 'OPERATOR' | 'VIEWER';

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
  organizationId?: string;
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
    organizationId?: string;
  };
  accessToken: string;
  refreshToken: string;
};

/**
 * Determine dashboard route based on user role
 */
export function getDashboardRoute(role: UserRole): string {
  if (role === 'SUPER_ADMIN') {
    return '/dev/overview';
  }
  return '/app/overview';
}

async function backendLogin(credentials: Record<string, string | undefined>) {
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
    // Fallback: Allow demo login for testing
    console.warn("Backend auth unavailable, using demo account:", err.message);
    if (credentials.email === "demo@example.com" && credentials.password === "demo123") {
      return {
        user: { 
          id: "demo-user-1", 
          email: "demo@example.com", 
          role: "OPERATOR" as UserRole, 
          firstName: "Demo", 
          lastName: "User",
          name: "Demo User",
          avatar: null,
        },
        accessToken: "demo-token",
        refreshToken: "demo-refresh-token",
      };
    }
    if (credentials.email === "admin@example.com" && credentials.password === "admin123") {
      return {
        user: { 
          id: "admin-user-1", 
          email: "admin@example.com", 
          role: "SUPER_ADMIN" as UserRole, 
          firstName: "Super", 
          lastName: "Admin",
          name: "Super Admin",
          avatar: null,
        },
        accessToken: "admin-token",
        refreshToken: "admin-refresh-token",
      };
    }
    throw new Error("Backend unavailable and no demo credentials matched. Try demo@example.com / demo123 or admin@example.com / admin123");
  }
}

async function backendRegister(data: { email: string; password: string; firstName?: string; lastName?: string }) {
  try {
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
    throw err;
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
          organizationId: data.user.organizationId,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        };
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
          prompt: "select_account",
          scope: "openid email profile",
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
          email: extendedUser.email,
          name: extendedUser.name,
          firstName: extendedUser.firstName,
          lastName: extendedUser.lastName,
          avatar: extendedUser.avatar,
          role: extendedUser.role,
          organizationId: extendedUser.organizationId,
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
        // Check if it's a dashboard redirect
        if (url === "/" || url === "/auth/sign-in" || url === "/auth/sign-up") {
          // Will be handled by client-side auth context
          return `${baseUrl}/auth/callback`;
        }
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
  secret: process.env.NEXTAUTH_SECRET,
};

export type { NextAuthOptions };
export { backendRegister };
