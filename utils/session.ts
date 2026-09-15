/**
 * Client-side session expiry helpers.
 *
 * Sessions are stored in localStorage at login as `userSession`:
 *   { role, userId, name, email, loginTime }
 *
 * There is no server-side session, so this enforces an auto-logout purely on the
 * client: once `loginTime` is older than SESSION_MAX_AGE_MS, the session is
 * considered expired, all auth keys are cleared, and the user must log in again.
 *
 * NOTE: This is a convenience/auto-logout, not hard security — localStorage can
 * be edited in devtools. Real enforcement needs server-side sessions.
 */

// 5 hours
export const SESSION_MAX_AGE_MS = 5 * 60 * 60 * 1000;

interface StoredSession {
  role?: string;
  userId?: string;
  name?: string;
  email?: string;
  loginTime?: string;
}

/** Reads and parses the stored session, or null. */
export function getStoredSession(): StoredSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('userSession');
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

/** True when the session exists but its loginTime is older than the max age. */
export function isSessionExpired(session?: StoredSession | null): boolean {
  const s = session ?? getStoredSession();
  if (!s || !s.loginTime) {
    // No session/loginTime means we can't prove it's valid → treat as expired
    // only when a session object was expected. Callers decide what "no session"
    // means; here we report expired so guards fail safe.
    return true;
  }
  const started = new Date(s.loginTime).getTime();
  if (Number.isNaN(started)) return true;
  return Date.now() - started > SESSION_MAX_AGE_MS;
}

/** Milliseconds remaining before expiry (0 if already expired / unknown). */
export function sessionTimeRemainingMs(session?: StoredSession | null): number {
  const s = session ?? getStoredSession();
  if (!s || !s.loginTime) return 0;
  const started = new Date(s.loginTime).getTime();
  if (Number.isNaN(started)) return 0;
  return Math.max(0, SESSION_MAX_AGE_MS - (Date.now() - started));
}

/** Clears every auth-related key from storage. */
export function clearSession(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('userSession');
    localStorage.removeItem('admin');
    localStorage.removeItem('student');
    localStorage.removeItem('trainer');
    sessionStorage.removeItem('admin');
  } catch {
    // ignore
  }
}
