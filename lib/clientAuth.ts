/**
 * Client-side authentication utilities
 * 
 * These functions help the frontend manage authentication state
 * and make authenticated API requests.
 */

import { getStoredSession, clearSession, isSessionExpired } from '@/utils/session';

export interface ClientSession {
  role: 'admin' | 'student' | 'trainer';
  userId?: string;
  studentId?: string;
  trainerId?: string;
  name: string;
  email: string;
  loginTime: string;
}

/**
 * Get authentication headers for API requests
 */
export function getAuthHeaders(): HeadersInit {
  const session = getStoredSession();
  
  if (!session || isSessionExpired(session)) {
    // Session expired or doesn't exist
    clearSession();
    return {};
  }

  return {
    'Authorization': `Bearer ${encodeURIComponent(JSON.stringify(session))}`,
    'Content-Type': 'application/json'
  };
}

/**
 * Make authenticated API request
 */
export async function authenticatedFetch(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  const authHeaders = getAuthHeaders() as Record<string, string>;
  
  // Check if we have valid auth headers
  if (!authHeaders['Authorization']) {
    // Only redirect if we're not already on the login page
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
    }
    throw new Error('Authentication required');
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...authHeaders,
      ...options.headers
    }
  });

  // Handle authentication errors
  if (response.status === 401) {
    clearSession();
    // Only redirect if we're not already on the login page
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
    }
    throw new Error('Authentication failed');
  }

  if (response.status === 403) {
    throw new Error('Insufficient permissions');
  }

  return response;
}

/**
 * GET request with authentication
 */
export async function authGet(url: string): Promise<Response> {
  return authenticatedFetch(url, { method: 'GET' });
}

/**
 * POST request with authentication
 */
export async function authPost(url: string, data: any): Promise<Response> {
  return authenticatedFetch(url, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

/**
 * PUT request with authentication
 */
export async function authPut(url: string, data: any): Promise<Response> {
  return authenticatedFetch(url, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

/**
 * DELETE request with authentication
 */
export async function authDelete(url: string): Promise<Response> {
  return authenticatedFetch(url, { method: 'DELETE' });
}

/**
 * Check if current user has specific role
 */
export function hasRole(role: 'admin' | 'student' | 'trainer'): boolean {
  const session = getStoredSession();
  if (!session || isSessionExpired(session)) {
    return false;
  }
  return session.role === role;
}

/**
 * Check if current user is admin
 */
export function isAdmin(): boolean {
  const session = getStoredSession();
  
  if (!session || isSessionExpired(session)) {
    return false;
  }
  
  return session.role === 'admin';
}

/**
 * Check if current user is trainer
 */
export function isTrainer(): boolean {
  return hasRole('trainer');
}

/**
 * Check if current user is student
 */
export function isStudent(): boolean {
  return hasRole('student');
}

/**
 * Get current user info
 */
export function getCurrentUser(): ClientSession | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const session = getStoredSession();
    
    if (!session) {
      return null;
    }
    
    if (isSessionExpired(session)) {
      clearSession();
      return null;
    }
    
    return session as ClientSession;
  } catch (error) {
    console.error('getCurrentUser - Error:', error);
    return null;
  }
}

/**
 * Logout user (clear session and redirect)
 */
export function logout(redirectTo: string = '/login'): void {
  clearSession();
  if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
    window.location.href = redirectTo;
  }
}

/**
 * Check authentication status
 */
export function isAuthenticated(): boolean {
  const session = getStoredSession();
  return session !== null && !isSessionExpired(session);
}