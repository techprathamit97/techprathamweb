import { NextRequest, NextResponse } from 'next/server';
import { runReminders } from '@/lib/classReminder';

export const runtime = 'nodejs';

const CRON_SECRET = process.env.CRON_SECRET || 'techpratham-cron-secret';
const NOTIFICATION_SECRET = process.env.NOTIFICATION_SECRET || 'techpratham-notification-secret';

// POST: run the reminder job (secured). The in-process scheduler calls
// runReminders() directly; this endpoint is a manual/external trigger.
export async function POST(req: NextRequest) {
  try {
    const secret = new URL(req.url).searchParams.get('secret');
    if (secret !== CRON_SECRET && secret !== NOTIFICATION_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const summary = await runReminders(false);
    return NextResponse.json({ success: true, ...summary });
  } catch (error: any) {
    console.error('class-reminder cron error:', error);
    return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 });
  }
}

// GET: dry-run preview (no push, no DB writes) for debugging the schedule.
export async function GET() {
  try {
    const summary = await runReminders(true);
    return NextResponse.json({ success: true, dryRun: true, ...summary });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 });
  }
}
