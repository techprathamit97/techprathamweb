/**
 * Server-side admin guard for API routes.
 *
 * The LMS admin session is stored in the browser as `userSession` and sent to
 * the API in the `Authorization: Bearer <url-encoded JSON>` header (see
 * lib/clientAuth.ts -> getAuthHeaders). This helper verifies that the caller is
 * a real, active admin in the unified `User` collection before any privileged
 * action (creating admins, resetting passwords) is allowed.
 *
 * Why this exists instead of `withAuth({ roles: ['admin'] })`:
 * at login the session stores `userId: <Mongo _id>` (not the ADMIN0001 `userId`
 * field), so the shared auth helper's admin lookup (`User.findOne({ userId })`)
 * never matches a logged-in admin. This guard matches on _id / userId / email so
 * it works with the session the app actually issues.
 */

import { NextRequest } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const mongoose = require('mongoose');
const User = require('@/models/User');

export interface AdminUser {
  _id: string;
  userId?: string;
  name: string;
  email: string;
  role: 'admin';
  isActive: boolean;
}

/** Parse the session JSON out of the request's auth headers, or null. */
function extractSession(req: NextRequest): any | null {
  try {
    const authHeader = req.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return JSON.parse(decodeURIComponent(authHeader.substring(7)));
    }
    const userDataHeader = req.headers.get('x-user-data');
    if (userDataHeader) {
      return JSON.parse(decodeURIComponent(userDataHeader));
    }
    return null;
  } catch (error) {
    console.error('adminApiAuth: failed to parse session header:', error);
    return null;
  }
}

/**
 * Returns the authenticated admin document, or null if the request does not
 * carry a valid, active admin session.
 */
export async function getRequestAdmin(req: NextRequest): Promise<AdminUser | null> {
  const session = extractSession(req);
  if (!session || session.role !== 'admin') {
    return null;
  }

  await connectMongo();

  // The session's `userId` usually holds the Mongo _id, but older/other sessions
  // may hold the ADMIN0001 userId. Match defensively on any of the identifiers.
  const or: any[] = [];
  const sid = session.userId;
  if (sid && mongoose.isValidObjectId(sid)) or.push({ _id: sid });
  if (sid) or.push({ userId: sid });
  if (session.email) or.push({ email: String(session.email).trim().toLowerCase() });

  if (or.length === 0) return null;

  const admin = await User.findOne({ role: 'admin', isActive: true, $or: or }).lean();
  if (!admin) return null;

  return {
    _id: admin._id.toString(),
    userId: admin.userId,
    name: admin.name,
    email: admin.email,
    role: 'admin',
    isActive: admin.isActive,
  };
}

/** True when at least one admin exists (used to allow first-time bootstrap). */
export async function anyAdminExists(): Promise<boolean> {
  await connectMongo();
  const count = await User.countDocuments({ role: 'admin' });
  return count > 0;
}
