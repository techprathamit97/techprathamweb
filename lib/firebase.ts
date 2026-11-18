// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getMessaging, getToken, deleteToken, onMessage } from "firebase/messaging";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBk_2J7aZhK_03oPWj4gDWdxmVBNY9zFBA",
  authDomain: "techpratham-lms.firebaseapp.com",
  projectId: "techpratham-lms",
  storageBucket: "techpratham-lms.firebasestorage.app",
  messagingSenderId: "972812696190",
  appId: "1:972812696190:web:8af883c03f8a5635c4362f",
  measurementId: "G-P360QQJSC8"
};

// Web Push certificate (VAPID) public key from
// Firebase Console > Project Settings > Cloud Messaging > Web configuration.
// Required by getToken() to mint a web FCM token. Configured via
// NEXT_PUBLIC_VAPID_PUBLIC_KEY in .env.local.
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;

// Request notification permission and get FCM token
export const requestNotificationPermission = async () => {
  try {
    if (!messaging) {
      console.warn('Firebase messaging not available (probably SSR)');
      return null;
    }
    
    console.log('🔔 Requesting notification permission...');
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('✅ Notification permission granted.');
      
      try {
        console.log('🎯 Attempting to get FCM token...');

        // Make sure the FCM service worker is registered and pass it to getToken
        // so the token is bound to the correct push subscription.
        let swRegistration: ServiceWorkerRegistration | undefined;
        if ('serviceWorker' in navigator) {
          swRegistration = await navigator.serviceWorker.register(
            '/firebase-messaging-sw.js'
          );
          await navigator.serviceWorker.ready;
        }

        const token = await getToken(messaging, {
          vapidKey: VAPID_PUBLIC_KEY,
          serviceWorkerRegistration: swRegistration,
        });

        if (token) {
          console.log('🎉 FCM Token obtained:', token.substring(0, 20) + '...');
          return token;
        } else {
          console.log('⚠️ No FCM token available - might need VAPID key configuration');
          return null;
        }
      } catch (tokenError: any) {
        console.error('❌ Error getting FCM token:', tokenError);
        
        // Check if it's an authentication/VAPID key error
        if (tokenError.message?.includes('authentication credential') || 
            tokenError.message?.includes('VAPID')) {
          console.warn('🔧 VAPID key might be missing or invalid. FCM token generation failed.');
          console.warn('📝 To fix: Generate a VAPID key in Firebase Console > Project Settings > Cloud Messaging > Web configuration');
          return null;
        }
        
        throw tokenError;
      }
    } else {
      console.log('❌ Notification permission denied.');
      return null;
    }
  } catch (error: any) {
    console.error('💥 Error requesting notification permission:', error);
    return null;
  }
};

// Same as requestNotificationPermission but surfaces the real error instead of
// swallowing it to null. Use this in test/debug UIs so failures are diagnosable.
export const getFcmTokenOrThrow = async (): Promise<string> => {
  if (typeof window === 'undefined') throw new Error('Not in a browser (SSR)');
  if (!('serviceWorker' in navigator))
    throw new Error('Service workers are not supported in this browser');
  if (!messaging)
    throw new Error('Firebase messaging is not available in this browser');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error(`Notification permission was "${permission}", not "granted"`);
  }

  const swRegistration = await navigator.serviceWorker.register(
    '/firebase-messaging-sw.js'
  );
  await navigator.serviceWorker.ready;

  // Clear any stale push subscription / cached token left over from an earlier
  // attempt that used a different (or no) VAPID key. Without this, getToken may
  // reuse an old browser subscription bound to the wrong applicationServerKey,
  // and FCM send then fails with THIRD_PARTY_PERMISSION_DENIED.
  try {
    const existingSub = await swRegistration.pushManager.getSubscription();
    if (existingSub) await existingSub.unsubscribe();
    await deleteToken(messaging);
  } catch (e) {
    console.warn('Could not clear stale push subscription (continuing):', e);
  }

  const token = await getToken(messaging, {
    vapidKey: VAPID_PUBLIC_KEY,
    serviceWorkerRegistration: swRegistration,
  });

  if (!token) {
    throw new Error(
      'getToken() returned empty. The VAPID key may not belong to this Firebase project, or the push subscription was blocked.'
    );
  }
  return token;
};

// Listen for foreground messages (one-shot, resolves on the first message).
export const onMessageListener = () => {
  return new Promise((resolve) => {
    if (messaging) {
      onMessage(messaging, (payload) => {
        console.log('Received foreground message:', payload);
        resolve(payload);
      });
    }
  });
};

/**
 * Persistent foreground message listener that ALSO renders a visible system
 * notification. FCM only auto-displays notifications when the tab is in the
 * background; when it is focused the payload arrives here instead, so we show
 * it manually via the service worker. Returns an unsubscribe function.
 */
export const onForegroundMessage = (
  cb?: (payload: any) => void
): (() => void) => {
  if (!messaging) return () => {};

  return onMessage(messaging, async (payload) => {
    console.log('📬 Foreground message received:', payload);
    cb?.(payload);

    try {
      if (
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted' &&
        'serviceWorker' in navigator
      ) {
        const reg = await navigator.serviceWorker.ready;
        const d = payload.data || {};
        await reg.showNotification(
          payload.notification?.title || 'TechPratham',
          {
            body: payload.notification?.body || '',
            icon: payload.notification?.icon || '/favicon.ico',
            badge: '/favicon.ico',
            data: { ...d, url: d.url || '/student/dashboard' },
            // Same tag as the SW so foreground + background don't stack.
            tag: d.tag || d.type || 'techpratham-notification',
            // `renotify` is valid in browsers but missing from TS's DOM types.
            renotify: true,
            requireInteraction: true,
          } as NotificationOptions & { renotify?: boolean }
        );
      }
    } catch (e) {
      console.warn('Could not display foreground notification:', e);
    }
  });
};

export { app, analytics, messaging };