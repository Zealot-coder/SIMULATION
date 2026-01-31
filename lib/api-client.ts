const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

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

    const response = await fetch(url, {
      ...options,
      headers,
    });

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

    return response.json();
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
    return this.patch(`/admin/users/${userId}/status?action=${action}`);
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
}

export const apiClient = new ApiClient(API_BASE_URL);

