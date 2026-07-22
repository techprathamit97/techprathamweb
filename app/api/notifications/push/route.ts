import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
import webpush from 'web-push';

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

export async function GET() {
  return NextResponse.json({
    success: true,
    publicKey: vapidPublicKey || null
  });
}

export async function POST(req: NextRequest) {
  try {
    await connectMongo();
    const body = await req.json();
    const { userId, userType, subscription } = body;

    if (!userId || !userType || !subscription) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const existing = await PushSubscriptionModel.findOne({ userId, userType });
    if (existing) {
      existing.subscription = subscription;
      existing.updatedAt = new Date();
      await existing.save();
      return NextResponse.json({ success: true, message: 'Subscription updated' });
    }

    const doc = new PushSubscriptionModel({ userId, userType, subscription });
    await doc.save();

    return NextResponse.json({ success: true, message: 'Subscription saved' });
  } catch (error: any) {
    console.error('Push subscription error', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectMongo();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const userType = searchParams.get('userType');

    if (!userId || !userType) {
      return NextResponse.json({ success: false, error: 'Missing user info' }, { status: 400 });
    }

    await PushSubscriptionModel.deleteMany({ userId, userType });
    return NextResponse.json({ success: true, message: 'Subscription removed' });
  } catch (error: any) {
    console.error('Push subscription delete error', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
