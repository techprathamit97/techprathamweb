import { NextRequest, NextResponse } from 'next/server';

// Firebase Admin needs the Node.js runtime (not Edge).
export const runtime = 'nodejs';

/**
 * Isolated push-notification test route.
 *
 * Sends a single FCM notification directly to one device token using the
 * Firebase Admin SDK. No student/batch lookup — this is purely to verify the
 * push pipeline (Admin credentials -> FCM -> service worker) end to end.
 *
 * Local-only so it can never fire from production by accident.
 *
 * Body: { token: string, title?: string, body?: string, url?: string }
 */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Local testing only' }, { status: 403 });
  }

  try {
    const { token, title, body, url } = await req.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'An FCM device "token" is required. Grant permission first to get one.' },
        { status: 400 }
      );
    }

    if (
      !process.env.FIREBASE_PRIVATE_KEY ||
      !process.env.FIREBASE_CLIENT_EMAIL ||
      process.env.FIREBASE_PRIVATE_KEY.includes('placeholder')
    ) {
      return NextResponse.json(
        {
          error:
            'Firebase Admin SDK not configured. Set FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL (and related) in .env.local',
        },
        { status: 500 }
      );
    }

    // firebase-admin v14 uses modular subpath imports; the old namespaced
    // API (admin.apps / admin.credential / admin.messaging) no longer exists.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { initializeApp, getApps, cert } = require('firebase-admin/app');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getMessaging } = require('firebase-admin/messaging');

    if (!getApps().length) {
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
    }

    const actionUrl = url || '/student/dashboard';
    const notifTitle = title || 'TechPratham Test 🔔';
    const notifBody = body || 'If you can see this, push notifications work!';

    const message = {
      token,
      notification: {
        title: notifTitle,
        body: notifBody,
      },
      data: {
        type: 'test',
        url: actionUrl,
        clickAction: actionUrl,
        timestamp: Date.now().toString(),
      },
      webpush: {
        notification: {
          title: notifTitle,
          body: notifBody,
          icon: '/og.jpg',
          badge: '/og.jpg',
          requireInteraction: true,
        },
        fcmOptions: { link: actionUrl },
      },
      android: {
        notification: { priority: 'high' as const, defaultSound: true },
      },
      apns: {
        payload: { aps: { badge: 1, sound: 'default' } },
      },
    };

    try {
      const messageId = await getMessaging().send(message);
      return NextResponse.json({
        success: true,
        message: 'Push notification sent. Check your device/browser.',
        messageId,
      });
    } catch (sendError: any) {
      return NextResponse.json(
        {
          success: false,
          error: 'FCM rejected the message',
          code: sendError?.code,
          message: sendError?.message || String(sendError),
        },
        { status: 502 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Request failed', message: error?.message || String(error) },
      { status: 500 }
    );
  }
}
