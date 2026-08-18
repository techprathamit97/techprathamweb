import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectMongo } from '@/utils/mongodb';
const ModuleClass = require('@/models/ModuleClass');

/**
 * Ends a live class for everyone.
 *
 * Ending the meeting from inside the BBB UI leaves our database saying
 * status:'live', which kept the Live button visible to students. This gives the
 * trainer an explicit action that tears down the BBB meeting AND retires the
 * database row in one step.
 */

function generateBBBChecksum(apiCall: string, params: string, secret: string): string {
  return crypto.createHash('sha1').update(apiCall + params + secret, 'utf8').digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    await connectMongo();

    const { classId, batchId } = await request.json();

    if (!classId && !batchId) {
      return NextResponse.json(
        { success: false, error: 'classId or batchId is required' },
        { status: 400 }
      );
    }

    // Either end one specific class or every live class in the batch.
    const query = classId ? { _id: classId } : { batchId, status: 'live', isLive: true };
    const classes = await ModuleClass.find(query);

    if (classes.length === 0) {
      return NextResponse.json({
        success: true,
        endedCount: 0,
        message: 'No live class found to end'
      });
    }

    const bbbServerUrl = process.env.BIGBLUEBUTTON_SERVER_URL;
    const bbbApiSecret = process.env.BIGBLUEBUTTON_API_SECRET;

    let endedCount = 0;
    const details: any[] = [];

    for (const cls of classes) {
      let bbbEnded = false;

      // Ask BBB to close the meeting. The moderator password is what authorizes
      // this; fall back to the fixed trainer password used by the join flow.
      if (bbbServerUrl && bbbApiSecret && cls.bbbMeetingId) {
        try {
          const normalized = bbbServerUrl.replace(/\/$/, '');
          const apiUrl = normalized.endsWith('/api') ? normalized : `${normalized}/api`;
          const moderatorPassword = cls.bbbModeratorPassword || 'trainer123';

          const params =
            `meetingID=${encodeURIComponent(cls.bbbMeetingId)}` +
            `&password=${encodeURIComponent(moderatorPassword)}`;
          const checksum = generateBBBChecksum('end', params, bbbApiSecret);

          const res = await fetch(`${apiUrl}/end?${params}&checksum=${checksum}`);
          const xml = await res.text();

          bbbEnded =
            xml.includes('<returncode>SUCCESS</returncode>') ||
            xml.includes('notFound') ||
            xml.includes('No such meeting');

          console.log(`🛑 BBB end for ${cls.bbbMeetingId}: ${bbbEnded ? 'ok' : 'failed'}`);
        } catch (error: any) {
          console.log(`⚠️ BBB end call failed for ${cls.bbbMeetingId}:`, error.message);
        }
      }

      // Retire the row regardless of the BBB result - the trainer's intent is to
      // stop the class, and a stale live row is exactly the bug being fixed.
      await ModuleClass.findByIdAndUpdate(cls._id, {
        status: 'completed',
        isLive: false,
        canJoin: false,
        actualEndTime: new Date(),
        $unset: { joinedSessionTokens: 1, studentSessionTokens: 1 }
      });

      endedCount++;
      details.push({
        classId: String(cls._id),
        moduleTitle: cls.moduleTitle,
        bbbMeetingId: cls.bbbMeetingId,
        bbbEnded
      });
    }

    return NextResponse.json({
      success: true,
      endedCount,
      details,
      message: `Ended ${endedCount} class${endedCount !== 1 ? 'es' : ''}`
    });
  } catch (error: any) {
    console.error('❌ end-session error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
