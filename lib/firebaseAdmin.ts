// Shared Firebase Admin (server-side) helper.
//
// firebase-admin v14 exposes the modular API via subpath imports. The old
// namespaced API (admin.apps / admin.credential.cert / admin.messaging()) no
// longer exists and silently throws "Cannot read properties of undefined", so
// always go through this helper instead of require('firebase-admin').

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { initializeApp, getApps, cert } = require('firebase-admin/app');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getMessaging } = require('firebase-admin/messaging');

export function isFirebaseAdminConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PRIVATE_KEY &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      !process.env.FIREBASE_PRIVATE_KEY.includes('placeholder')
  );
}

/** Initialise the default Admin app once (idempotent). Returns false if unconfigured. */
export function ensureFirebaseAdmin(): boolean {
  if (!isFirebaseAdminConfigured()) return false;
  if (getApps().length) return true;

  const serviceAccount = {
    type: 'service_account',
    project_id: 'techpratham-lms',
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
  };

  initializeApp({
    credential: cert(serviceAccount as any),
    projectId: 'techpratham-lms',
  });
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  type?: string;
  data?: Record<string, string>;
}

export interface PushResult {
  sent: boolean;
  successCount: number;
  failureCount: number;
  invalidTokens: string[];
  error?: string;
}

/**
 * Send one notification to many device tokens. Returns per-token results and the
 * list of tokens FCM reports as permanently invalid (so callers can prune them).
 */
export async function sendPushToTokens(
  tokens: string[],
  payload: PushPayload
): Promise<PushResult> {
  const unique = Array.from(new Set((tokens || []).filter(Boolean)));
  if (unique.length === 0) {
    return { sent: false, successCount: 0, failureCount: 0, invalidTokens: [], error: 'No tokens' };
  }
  if (!ensureFirebaseAdmin()) {
    return {
      sent: false,
      successCount: 0,
      failureCount: 0,
      invalidTokens: [],
      error: 'Firebase Admin not configured',
    };
  }

  const url = payload.url || '/student/dashboard';
  const message = {
    notification: { title: payload.title, body: payload.body },
    data: {
      type: payload.type || 'info',
      url,
      clickAction: url,
      timestamp: Date.now().toString(),
      ...(payload.data || {}),
    },
    webpush: {
      notification: {
        title: payload.title,
        body: payload.body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        requireInteraction: true,
      },
      fcmOptions: { link: url },
    },
    android: { notification: { priority: 'high' as const, defaultSound: true } },
    apns: { payload: { aps: { badge: 1, sound: 'default' } } },
  };

  const res = await getMessaging().sendEachForMulticast({ ...message, tokens: unique });

  const invalidTokens: string[] = [];
  res.responses.forEach((r: any, i: number) => {
    if (!r.success) {
      const code = r.error?.code;
      if (
        code === 'messaging/invalid-registration-token' ||
        code === 'messaging/registration-token-not-registered'
      ) {
        invalidTokens.push(unique[i]);
      }
    }
  });

  return {
    sent: true,
    successCount: res.successCount,
    failureCount: res.failureCount,
    invalidTokens,
  };
}
