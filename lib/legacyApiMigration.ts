/**
 * Legacy API Migration Utility
 * 
 * This provides a backward-compatible way to migrate existing fetch calls
 * to use the new authentication system without breaking the entire application.
 */

import { getAuthHeaders, logout } from './clientAuth';

/**
 * Drop-in replacement for fetch that automatically adds authentication
 * This can be used to replace fetch() calls without changing the API
 */
export async function secureApiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  // Only add auth headers for API calls
  if (url.startsWith('/api/')) {
    const authHeaders = getAuthHeaders() as Record<string, string>;
    
    // If no auth headers, redirect to login
    if (!authHeaders['Authorization']) {
      console.warn('No authentication found for API call:', url);
      // Only redirect if we're not already on the login page
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      }
      throw new Error('Authentication required');
    }

    options.headers = {
      ...authHeaders,
      ...options.headers
    };
  }

  const response = await fetch(url, options);

  // Handle authentication errors
  if (response.status === 401) {
    console.warn('Authentication failed for API call:', url);
    // Only redirect if we're not already on the login page
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      logout('/login?session_expired=1');
    }
    throw new Error('Authentication failed');
  }

  if (response.status === 403) {
    console.warn('Access denied for API call:', url);
    throw new Error('Insufficient permissions');
  }

  return response;
}

/**
 * Global monkey patch for fetch (use sparingly)
 * This replaces the global fetch with our authenticated version
 */
export function enableGlobalAuthFetch() {
  if (typeof window !== 'undefined') {
    // Store original fetch if not already stored
    if (!(window as any).__originalFetch) {
      (window as any).__originalFetch = window.fetch;
    }
    
    // Replace with authenticated version
    window.fetch = function(url: string | Request, options?: RequestInit) {
      if (typeof url === 'string' && url.startsWith('/api/')) {
        return secureApiFetch(url, options || {});
      }
      return (window as any).__originalFetch(url, options);
    } as typeof fetch;
    
    console.log('🔒 Global authenticated fetch enabled for all /api/ calls');
  }
}

/**
 * Restore original fetch functionality
 */
export function disableGlobalAuthFetch() {
  if (typeof window !== 'undefined' && (window as any).__originalFetch) {
    window.fetch = (window as any).__originalFetch;
    delete (window as any).__originalFetch;
    console.log('🔓 Global authenticated fetch disabled');
  }
}