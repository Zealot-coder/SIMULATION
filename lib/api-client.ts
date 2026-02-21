
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const createClient = () => {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Supabase public configuration missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)."
    );
  }
  return createBrowserClient(supabaseUrl, supabaseKey);
};


const LOCAL_API_BASE_URL = "http://localhost:3001/api/v1";
const PROD_API_BASE_FALLBACK =
  (process.env.NEXT_PUBLIC_API_FALLBACK_URL || "https://simulation-cyww.onrender.com/api/v1").replace(/\/$/, "");

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

function isLocalHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function isLocalApiUrl(url: string) {
  try {
    const parsed = new URL(url);
    return isLocalHost(parsed.hostname);
  } catch {
    return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?/i.test(url);
  }
}

export function getPublicApiBaseUrl() {
  const envUrl = normalizeApiBase(process.env.NEXT_PUBLIC_API_URL || "");

  // During build/SSR, fall back to a remote URL in production to avoid localhost-only config.
  if (typeof window === "undefined") {
    if (envUrl) return envUrl;
    return process.env.NODE_ENV === "production" ? normalizeApiBase(PROD_API_BASE_FALLBACK) : LOCAL_API_BASE_URL;
  }

  const browserIsLocal = isLocalHost(window.location.hostname);
  if (envUrl) {
    // If env points to localhost but browser is on a hosted domain, use production fallback.
    if (isLocalApiUrl(envUrl) && !browserIsLocal) {
      return normalizeApiBase(PROD_API_BASE_FALLBACK);
    }
    return envUrl;
  }

  return browserIsLocal ? LOCAL_API_BASE_URL : normalizeApiBase(PROD_API_BASE_FALLBACK);
}

const API_BASE_URL = getPublicApiBaseUrl();

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
      }
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
      });
    } catch (err: any) {
      const error = new Error(
        `Unable to reach backend API at ${this.baseUrl}. Check NEXT_PUBLIC_API_URL and backend CORS configuration.`
      );
      (error as any).status = 0;
      (error as any).response = { data: { message: error.message } };
      throw error;
    }

    if (!response.ok) {
      let errorMessage = response.statusText;
      try {
        const error = await response.json();
        errorMessage = error.message || error.error || errorMessage;
      } catch {
        // If JSON parsing fails, use status text
      }
      
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      (error as any).response = { data: { message: errorMessage } };
      throw error;
    }

    // Handle endpoints that may return empty body
    const text = await response.text();
    return (text ? JSON.parse(text) : ({} as T)) as T;
  }

  // Auth
  async register(data: {
    email?: string;
    phone?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    return this.request<{ accessToken: string; refreshToken: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: { email?: string; phone?: string; password?: string }): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    return this.request<{ accessToken: string; refreshToken: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async get<T = any>(endpoint: string): Promise<T> {
    return this.request(endpoint, { method: 'GET' });
  }

  async post<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // Organizations
  async createOrganization(data: { name: string; slug: string; description?: string }): Promise<any> {
    return this.request<any>('/organizations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMyOrganizations(): Promise<any[]> {
    return this.request<any[]>('/organizations/my');
  }

  async getOrganization(id: string): Promise<any> {
    return this.request<any>(`/organizations/${id}`);
  }

  // Events
  async createEvent(organizationId: string, data: {
    type: string;
    name: string;
    payload: any;
    source?: string;
  }): Promise<any> {
    return this.request<any>('/events', {
      method: 'POST',
      body: JSON.stringify({ ...data, organizationId }),
    });
  }

  async getEvents(organizationId: string): Promise<any[]> {
    return this.request<any[]>(`/events?organizationId=${organizationId}`);
  }

  // Workflows
  async createWorkflow(organizationId: string, data: {
    name: string;
    description?: string;
    triggerEventType?: string;
    triggerCondition?: any;
    steps: any[];
  }): Promise<any> {
    return this.request<any>('/workflows', {
      method: 'POST',
      body: JSON.stringify({ ...data, organizationId }),
    });
  }

  async getWorkflows(organizationId: string): Promise<any[]> {
    return this.request<any[]>(`/workflows?organizationId=${organizationId}`);
  }

  async getWorkflow(id: string): Promise<any> {
    return this.request<any>(`/workflows/${id}`);
  }

  // Admin APIs
  async getAdminUsers(page = 1, limit = 50): Promise<{ users: any[]; pagination: any }> {
    return this.request<{ users: any[]; pagination: any }>(`/admin/users?page=${page}&limit=${limit}`);
  }

  async updateUserStatus(userId: string, action: 'enable' | 'disable') {
    return this.post(`/admin/user/${userId}/${action}`);
  }

  async getAdminAnalytics(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const query = params.toString();
    return this.request(`/admin/analytics${query ? `?${query}` : ''}`);
  }

  async getAdminAIUsage(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const query = params.toString();
    return this.request(`/admin/ai-usage${query ? `?${query}` : ''}`);
  }

  async getAdminAutomations() {
    return this.request('/admin/automations');
  }

  async getAdminLogs(filters?: {
    entityType?: string;
    action?: string;
    userId?: string;
    limit?: number;
  }) {
    const params = new URLSearchParams();
    if (filters?.entityType) params.append('entityType', filters.entityType);
    if (filters?.action) params.append('action', filters.action);
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    const query = params.toString();
    return this.request(`/admin/logs${query ? `?${query}` : ''}`);
  }

  async getDlqItems(filters?: {
    organizationId?: string;
    stepType?: string;
    errorCategory?: string;
    status?: string;
    from?: string;
    to?: string;
    limit?: number;
    cursor?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.organizationId) params.append('organizationId', filters.organizationId);
    if (filters?.stepType) params.append('stepType', filters.stepType);
    if (filters?.errorCategory) params.append('errorCategory', filters.errorCategory);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.from) params.append('from', filters.from);
    if (filters?.to) params.append('to', filters.to);
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.cursor) params.append('cursor', filters.cursor);
    const query = params.toString();
    return this.request(`/workflow-dlq${query ? `?${query}` : ''}`);
  }

  async getDlqItem(id: string) {
    return this.request(`/workflow-dlq/${id}`);
  }

  async replayDlqItem(
    id: string,
    payload: {
      mode: 'STEP_ONLY' | 'FROM_STEP';
      fromStepIndex?: number;
      overrideRetryPolicy?: {
        maxRetries?: number;
        baseDelayMs?: number;
        factor?: number;
        maxDelayMs?: number;
        jitterRatio?: number;
      };
    },
  ) {
    return this.post(`/workflow-dlq/${id}/replay`, payload);
  }

  async resolveDlqItem(id: string, reason: string) {
    return this.post(`/workflow-dlq/${id}/resolve`, { reason });
  }

  async ignoreDlqItem(id: string, reason: string) {
    return this.post(`/workflow-dlq/${id}/ignore`, { reason });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

