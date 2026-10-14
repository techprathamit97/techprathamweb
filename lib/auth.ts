/**
 * Authentication and Role-Based Access Control (RBAC) middleware
 * 
 * This module provides utilities for authenticating requests and enforcing
 * role-based permissions across all API endpoints.
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const User = require('@/models/User');
const Student = require('@/models/Student');
const Trainer = require('@/models/Trainer');

export interface AuthenticatedUser {
  _id: string;
  role: 'admin' | 'student' | 'trainer';
  userId?: string;
  studentId?: string;
  trainerId?: string;
  name: string;
  email: string;
  isActive: boolean;
}

export interface AuthContext {
  user: AuthenticatedUser;
  isAuthenticated: true;
}

/**
 * Extract user session from request headers
 * The frontend should send user data in the Authorization header as JSON
 */
function extractUserSession(req: NextRequest): any | null {
  try {
    // Try Authorization header first (recommended approach)
    const authHeader = req.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      return JSON.parse(decodeURIComponent(token));
    }

    // Fallback: Try custom header
    const userDataHeader = req.headers.get('x-user-data');
    if (userDataHeader) {
      return JSON.parse(decodeURIComponent(userDataHeader));
    }

    return null;
  } catch (error) {
    console.error('Failed to extract user session:', error);
    return null;
  }
}

/**
 * Verify user exists in database and is active
 */
async function verifyUserInDatabase(sessionData: any): Promise<AuthenticatedUser | null> {
  try {
    await connectMongo();

    let dbUser = null;
    let role = sessionData.role;

    // Verify user based on role
    switch (role) {
      case 'admin':
        if (sessionData.userId) {
          dbUser = await User.findOne({ 
            userId: sessionData.userId, 
            role: 'admin',
            isActive: true 
          }).lean();
        }
        break;

      case 'student':
        if (sessionData.studentId) {
          dbUser = await Student.findOne({ 
            studentId: sessionData.studentId,
            isActive: true 
          }).lean();
        }
        break;

      case 'trainer':
        if (sessionData.trainerId) {
          dbUser = await Trainer.findOne({ 
            trainerId: sessionData.trainerId,
            isActive: true 
          }).lean();
        }
        break;

      default:
        console.warn('Unknown role in session:', role);
        return null;
    }

    if (!dbUser) {
      console.warn('User not found in database or inactive:', { role, sessionData });
      return null;
    }

    // Return authenticated user data
    return {
      _id: dbUser._id.toString(),
      role: role,
      userId: dbUser.userId,
      studentId: dbUser.studentId,
      trainerId: dbUser.trainerId,
      name: dbUser.name,
      email: dbUser.email,
      isActive: dbUser.isActive
    };
  } catch (error) {
    console.error('Database verification error:', error);
    return null;
  }
}

/**
 * Authenticate request and return user context
 */
export async function authenticate(req: NextRequest): Promise<AuthContext | null> {
  const sessionData = extractUserSession(req);
  if (!sessionData) {
    return null;
  }

  const user = await verifyUserInDatabase(sessionData);
  if (!user) {
    return null;
  }

  return {
    user,
    isAuthenticated: true
  };
}

/**
 * Role-based access control rules
 */
interface RoleRule {
  paths: string[];
  excludedPaths?: string[];
  description: string;
}

export const RBAC_RULES: Record<string, RoleRule> = {
  // Admin APIs - Full access
  admin: {
    paths: [
      '/api/lms/**',
      '/api/admin-join-class/**',
      '/api/create-admin-user/**',
      '/api/reset-admin-password/**',
      '/api/cleanup-**',
      '/api/attendance/**',
      '/api/batch-live-status/**',
      '/api/class-notifications/**',
      '/api/course/**',
      '/api/debug/**',
      '/api/invoice/**',
      '/api/module-class/**',
      '/api/notifications/**',
      '/api/payments/**',
      '/api/send-email/**',
      '/api/test-**',
      '/api/bbb/**',
      '/api/upload/**'
    ],
    description: 'Admins have access to all LMS management and system APIs'
  },

  // Trainer APIs - Limited access
  trainer: {
    paths: [
      '/api/trainer/**',
      '/api/bbb/join/**',
      '/api/bbb/meetings/**',
      '/api/module-class/join/**',
      '/api/module-class/recordings/**',
      '/api/module-class/end-session/**',
      '/api/attendance/meetings/**',
      '/api/attendance/summary/**'
    ],
    excludedPaths: [
      '/api/trainer/assignments/upload/**',  // Trainers CANNOT upload assignments for students
      '/api/upload/assignments/**'           // Trainers CANNOT access assignment upload endpoints
    ],
    description: 'Trainers can access training-related APIs but cannot upload assignments'
  },

  // Student APIs - Specific access
  student: {
    paths: [
      '/api/student/**',
      '/api/bbb/join/**',
      '/api/module-class/join/**',
      '/api/module-class/recordings/**',
      '/api/course/fetch/**',
      '/api/upload/assignments/**'  // Students CAN upload assignments
    ],
    description: 'Students can access student-specific APIs and upload assignments'
  },

  // Public APIs - No authentication required
  public: {
    paths: [
      '/api/auth/**'  // Login/logout endpoints
    ],
    description: 'Public endpoints that do not require authentication'
  }
};

/**
 * Check if a path matches any pattern in the array
 */
function matchesPath(requestPath: string, patterns: string[]): boolean {
  return patterns.some(pattern => {
    // Convert wildcard pattern to regex
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')  // ** matches any path segments
      .replace(/\*/g, '[^/]*') // * matches any characters except /
      .replace(/\?/g, '.');    // ? matches single character
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(requestPath);
  });
}

/**
 * Check if user has permission to access the requested path
 */
export function hasPermission(user: AuthenticatedUser, requestPath: string): boolean {
  const { role } = user;
  
  // Check public paths first
  if (matchesPath(requestPath, RBAC_RULES.public.paths)) {
    return true;
  }

  // Admin has access to everything (except excluded paths if any)
  if (role === 'admin') {
    return matchesPath(requestPath, RBAC_RULES.admin.paths);
  }

  // Check role-specific permissions
  const roleRules = RBAC_RULES[role];
  if (!roleRules) {
    return false;
  }

  // Check if path is explicitly excluded
  if (roleRules.excludedPaths && matchesPath(requestPath, roleRules.excludedPaths)) {
    console.warn(`Access denied: ${role} trying to access excluded path: ${requestPath}`);
    return false;
  }

  // Check if path is allowed
  return matchesPath(requestPath, roleRules.paths);
}

/**
 * Middleware wrapper for API routes
 * Usage: export const GET = withAuth(handler, { roles: ['admin', 'trainer'] });
 */
export function withAuth(
  handler: (req: NextRequest, context: AuthContext, ...args: any[]) => Promise<NextResponse>,
  options: {
    roles?: ('admin' | 'student' | 'trainer')[];
    requireAuth?: boolean;
  } = {}
) {
  const { roles, requireAuth = true } = options;

  return async (req: NextRequest, ...args: any[]): Promise<NextResponse> => {
    try {
      // Skip auth for public endpoints
      const pathname = new URL(req.url).pathname;
      if (!requireAuth || matchesPath(pathname, RBAC_RULES.public.paths)) {
        return handler(req, null as any, ...args);
      }

      // Authenticate user
      const authContext = await authenticate(req);
      
      if (!authContext) {
        return NextResponse.json(
          { 
            error: 'Authentication required', 
            code: 'UNAUTHORIZED',
            message: 'Please log in to access this resource'
          },
          { status: 401 }
        );
      }

      // Check role-based permissions
      if (roles && !roles.includes(authContext.user.role)) {
        return NextResponse.json(
          { 
            error: 'Insufficient permissions', 
            code: 'FORBIDDEN',
            message: `This endpoint requires one of the following roles: ${roles.join(', ')}`,
            userRole: authContext.user.role
          },
          { status: 403 }
        );
      }

      // Check path-based permissions
      if (!hasPermission(authContext.user, pathname)) {
        return NextResponse.json(
          { 
            error: 'Access denied', 
            code: 'FORBIDDEN',
            message: `You do not have permission to access this resource`,
            path: pathname,
            userRole: authContext.user.role
          },
          { status: 403 }
        );
      }

      // All checks passed, execute handler
      return handler(req, authContext, ...args);
      
    } catch (error) {
      console.error('Auth middleware error:', error);
      return NextResponse.json(
        { 
          error: 'Internal server error', 
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while processing authentication'
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Simple authentication check without role enforcement
 * For endpoints that just need to know who the user is
 */
export function withSimpleAuth(
  handler: (req: NextRequest, context: AuthContext | null, ...args: any[]) => Promise<NextResponse>
) {
  return async (req: NextRequest, ...args: any[]): Promise<NextResponse> => {
    try {
      const authContext = await authenticate(req);
      return handler(req, authContext, ...args);
    } catch (error) {
      console.error('Simple auth middleware error:', error);
      return NextResponse.json(
        { error: 'Authentication error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Utility to create authorization header value for frontend
 * Frontend should call this after login and include in API requests
 */
export function createAuthHeader(sessionData: any): string {
  return `Bearer ${encodeURIComponent(JSON.stringify(sessionData))}`;
}