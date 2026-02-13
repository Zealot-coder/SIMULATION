"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useSession, signOut, signIn } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { getDashboardRouteForRole, isDevRole } from '@/lib/dashboard';
import { apiClient } from '@/lib/api-client';

// User roles
export type UserRole = 'SUPER_ADMIN' | 'ORG_ADMIN' | 'OPERATOR' | 'VIEWER' | 'OWNER' | 'ADMIN' | 'STAFF';

// User interface with all fields
export interface User {
  id: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  avatar?: string;
  role: UserRole;
  lastLogin?: string;
  createdAt?: string;
}

// Auth context type
interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  
  // Auth methods
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to check if user is admin
function isAdminRole(role?: UserRole): boolean {
  return isDevRole(role);
}

// Helper to get dashboard route based on role
export function getDashboardRoute(role?: UserRole): string {
  return getDashboardRouteForRole(role);
}

// Protected routes that require authentication
const PROTECTED_ROUTES = ['/app', '/dev', '/dashboard', '/account', '/settings'];

// Admin-only routes
const ADMIN_ROUTES = ['/dev'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  
  const loading = status === 'loading';
  const isAuthenticated = !!session?.user;
  const accessToken = (session as any)?.accessToken as string | undefined;
  
  // Convert NextAuth session user to our User type
  const user: User | null = session?.user ? {
    id: (session.user as any).id || '',
    email: session.user.email || undefined,
    name: session.user.name || undefined,
    firstName: (session.user as any).firstName || undefined,
    lastName: (session.user as any).lastName || undefined,
    avatar: session.user.image || (session.user as any).avatar || undefined,
    role: (session.user as any).role || 'VIEWER',
  } : null;

  // Handle route protection
  useEffect(() => {
    if (loading) return;

    const isProtectedRoute = PROTECTED_ROUTES.some(route => 
      pathname?.startsWith(route)
    );
    
    const isAdminRoute = ADMIN_ROUTES.some(route => 
      pathname?.startsWith(route)
    );

    // Redirect unauthenticated users from protected routes
    if (isProtectedRoute && !isAuthenticated) {
      router.push('/auth/sign-in?redirect=' + encodeURIComponent(pathname || '/'));
      return;
    }

    // Redirect non-admin users from admin routes
    if (isAdminRoute && user && !isAdminRole(user.role)) {
      router.push(getDashboardRouteForRole(user.role));
      return;
    }
  }, [user, loading, pathname, router, isAuthenticated]);

  // Keep REST API client in sync with NextAuth session token.
  useEffect(() => {
    apiClient.setToken(accessToken || null);
  }, [accessToken]);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
        throw new Error(result.error);
      }
    } catch (error: any) {
      const message = error.message || 'Login failed';
      setError(message);
      throw error;
    }
  };

  const logout = () => {
    signOut({ callbackUrl: '/auth/sign-in' });
  };

  const clearError = () => setError(null);

  const value: AuthContextType = {
    user,
    loading,
    error,
    isAuthenticated,
    isAdmin: isAdminRole(user?.role),
    login,
    logout,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
