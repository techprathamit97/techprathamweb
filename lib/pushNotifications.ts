import webpush from 'web-push';
import { connectMongo } from '@/utils/mongodb';

const PushSubscriptionModel = require('@/models/PushSubscription');

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    'mailto:hello@techpratham.com',
    vapidPublicKey,
    vapidPrivateKey
  );
}

export async function sendPushNotification(
  userId: string,
  userType: 'student' | 'trainer' | 'admin',
  payload: { title: string; message: string; url?: string }
) {
  try {
    await connectMongo();
    const subscriptionDoc = await PushSubscriptionModel.findOne({ userId, userType }).lean();

    if (!subscriptionDoc?.subscription) {
      return false;
    }

    const notificationPayload = JSON.stringify({
      title: payload.title,
      message: payload.message,
      url: payload.url || '/'
    });

    await webpush.sendNotification(subscriptionDoc.subscription, notificationPayload);
    return true;
  } catch (error) {
    console.error('Failed to send push notification', error);
    return false;
  }
}

export function getVapidPublicKey() {
  return vapidPublicKey || null;
}
