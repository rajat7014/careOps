/**
 * API Client
 * 
 * Centralized fetch wrapper with:
 * - Base URL configuration
 * - Authorization header attachment
 * - Token expiration handling
 * - Automatic redirect on 401
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' && window.location.hostname.includes('render.com') 
  ? '/api/v1' 
  : 'http://localhost:3002/api/v1');

// Token storage key (using memory for security, fallback to localStorage for persistence)
let accessToken: string | null = null;

/**
 * Set the access token
 */
export function setAccessToken(token: string | null) {
  accessToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('accessToken', token);
      // Set a cookie hint for middleware
      document.cookie = 'auth_check=true; path=/; max-age=604800'; // 7 days
    } else {
      localStorage.removeItem('accessToken');
      // Clear the cookie hint
      document.cookie = 'auth_check=; path=/; max-age=0';
    }
  }
}

/**
 * Get the access token
 */
export function getAccessToken(): string | null {
  if (accessToken) return accessToken;
  if (typeof window !== 'undefined') {
    return localStorage.getItem('accessToken');
  }
  return null;
}

/**
 * Clear the access token
 */
export function clearAccessToken() {
  accessToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
    // Clear the cookie hint
    document.cookie = 'auth_check=; path=/; max-age=0';
  }
}

/**
 * API Error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Fetch wrapper with auth and error handling
 */
async function fetchWithAuth<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const token = getAccessToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const config: RequestInit = {
    ...options,
    headers,
    credentials: 'include',
  };
  
  try {
    const response = await fetch(url, config);
    
    // Handle 401 Unauthorized
    if (response.status === 401) {
      clearAccessToken();
      if (typeof window !== 'undefined') {
        window.location.href = '/login?error=session_expired';
      }
      throw new ApiError('Unauthorized', 401, 'UNAUTHORIZED');
    }
    
    // Parse response
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    // Handle error responses
    if (!response.ok) {
      throw new ApiError(
        data?.error?.message || data?.message || 'Request failed',
        response.status,
        data?.error?.code,
        data
      );
    }
    
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Network or other errors
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error',
      0,
      'NETWORK_ERROR'
    );
  }
}

/**
 * API client methods
 */
export const api = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    fetchWithAuth<T>(endpoint, { ...options, method: 'GET' }),
    
  post: <T>(endpoint: string, body: any, options?: RequestInit) =>
    fetchWithAuth<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    }),
    
  put: <T>(endpoint: string, body: any, options?: RequestInit) =>
    fetchWithAuth<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    }),
    
  patch: <T>(endpoint: string, body: any, options?: RequestInit) =>
    fetchWithAuth<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
    
  delete: <T>(endpoint: string, options?: RequestInit) =>
    fetchWithAuth<T>(endpoint, { ...options, method: 'DELETE' }),
};

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ success: boolean; data: { user: any; workspace: any; token: string } }>(
      '/auth/login',
      { email, password }
    ),
    
  register: (data: {
    email: string;
    password: string;
    name: string;
    workspaceName: string;
    timezone?: string;
  }) =>
    api.post<{ success: boolean; data: { user: any; workspace: any; token: string } }>(
      '/auth/register',
      data
    ),
    
  me: () =>
    api.get<{ success: boolean; data: { user: any; workspace: any; role: string } }>(
      '/auth/me'
    ),
    
  logout: () => {
    clearAccessToken();
    return Promise.resolve();
  },
};

// Dashboard API
export const dashboardApi = {
  getStats: () =>
    api.get<{ success: boolean; data: any }>('/dashboard/stats'),
    
  getBookings: () =>
    api.get<{ success: boolean; data: any[] }>('/bookings'),
    
  getRecentBookings: (limit: number = 5) =>
    api.get<{ success: boolean; data: any[] }>(`/bookings?limit=${limit}`),
};

export default api;
