"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  loading: boolean;
  login: (email?: string, phone?: string, password?: string) => Promise<void>;
  register: (data: {
    email?: string;
    phone?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
  }) => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check for existing tokens on mount
    const storedToken = localStorage.getItem('auth_token');
    const storedRefreshToken = localStorage.getItem('refresh_token');
    
    if (storedToken && storedRefreshToken) {
      setToken(storedToken);
      setRefreshToken(storedRefreshToken);
      apiClient.setToken(storedToken);
      
      // Validate token with backend
      apiClient.get('/auth/me')
        .then((response) => {
          setUser(response.data);
        })
        .catch(() => {
          // Token invalid, try refresh
          if (storedRefreshToken) {
            refreshAccessToken();
          } else {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('refresh_token');
          }
        });
    }
    setLoading(false);
  }, []);

  const refreshAccessToken = async () => {
    const storedRefreshToken = localStorage.getItem('refresh_token');
    if (!storedRefreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await apiClient.post('/auth/refresh', {
        refreshToken: storedRefreshToken,
      });
      
      const { accessToken, refreshToken: newRefreshToken } = response.data;
      localStorage.setItem('auth_token', accessToken);
      localStorage.setItem('refresh_token', newRefreshToken);
      setToken(accessToken);
      setRefreshToken(newRefreshToken);
      apiClient.setToken(accessToken);
    } catch (error: any) {
      // Refresh failed, logout
      logout();
      throw error;
    }
  };

  const login = async (email?: string, phone?: string, password?: string) => {
    try {
      const response = await apiClient.login({ email, phone, password });
      localStorage.setItem('auth_token', response.accessToken);
      localStorage.setItem('refresh_token', response.refreshToken);
      setToken(response.accessToken);
      setRefreshToken(response.refreshToken);
      apiClient.setToken(response.accessToken);
      setUser(response.user);
      router.push('/dashboard');
    } catch (error: any) {
      throw error;
    }
  };

  const register = async (data: {
    email?: string;
    phone?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
  }) => {
    try {
      const response = await apiClient.register(data);
      localStorage.setItem('auth_token', response.accessToken);
      localStorage.setItem('refresh_token', response.refreshToken);
      setToken(response.accessToken);
      setRefreshToken(response.refreshToken);
      apiClient.setToken(response.accessToken);
      setUser(response.user);
      router.push('/dashboard');
    } catch (error: any) {
      throw error;
    }
  };

  const logout = async () => {
    const storedRefreshToken = localStorage.getItem('refresh_token');
    if (storedRefreshToken) {
      try {
        await apiClient.post('/auth/logout', { refreshToken: storedRefreshToken });
      } catch (error) {
        // Ignore logout errors
      }
    }
    
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    apiClient.setToken(null);
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        refreshToken,
        loading,
        login,
        register,
        logout,
        refreshAccessToken,
        isAuthenticated: !!user,
      }}
    >
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

