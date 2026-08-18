import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectMongo } from '@/utils/mongodb';
import { classifyMeetingState } from '@/utils/bbbMeetingState';
const ModuleClass = require('@/models/ModuleClass');

/**
 * Authoritative "is this batch actually live right now?" check.
 *
 * Time alone is not enough to decide this. A class is only live for students when
 * the trainer has started the BigBlueButton meeting AND is still in it. Two bugs
 * came from trusting the clock or the database alone:
 *
 *  - Students saw "Live Now" during the scheduled window before the trainer had
 *    started anything, so Join always failed.
 *  - When the trainer left or used "End session for all", BBB tore the meeting
 *    down but the database still said status:'live', so the Live button stayed.
 *
 * This endpoint verifies against BBB and self-heals stale rows.
 */

function generateBBBChecksum(apiCall: string, params: string, secret: string): string {
  return crypto.createHash('sha1').update(apiCall + params + secret, 'utf8').digest('hex');
}

export async function GET(request: NextRequest) {
  try {
    await connectMongo();

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

    if (!batchId) {
      return NextResponse.json(
        { success: false, error: 'batchId is required' },
        { status: 400 }
      );
    }

    // Newest first - if several rows are somehow live, the most recent wins.
    const liveClasses = await ModuleClass.find({
      batchId,
      status: 'live',
      isLive: true
    }).sort({ actualStartTime: -1, updatedAt: -1, createdAt: -1 });

    if (liveClasses.length === 0) {
      return NextResponse.json({
        success: true,
        isLive: false,
        trainerPresent: false,
        liveClass: null,
        reason: 'no-live-class'
      });
    }

    const bbbServerUrl = process.env.BIGBLUEBUTTON_SERVER_URL;
    const bbbApiSecret = process.env.BIGBLUEBUTTON_API_SECRET;

    if (!bbbServerUrl || !bbbApiSecret) {
      // Without BBB we cannot verify. Fall back to the database rather than
      // hiding a class that may genuinely be running.
      const fallback = liveClasses[0];
      return NextResponse.json({
        success: true,
        isLive: true,
        trainerPresent: true,
        verified: false,
        reason: 'bbb-not-configured',
        liveClass: {
          _id: String(fallback._id),
          moduleTitle: fallback.moduleTitle,
          scheduledDate: fallback.scheduledDate,
          scheduledTime: fallback.scheduledTime,
          duration: fallback.duration,
          bbbMeetingId: fallback.bbbMeetingId
        }
      });
    }

    const normalized = bbbServerUrl.replace(/\/$/, '');
    const apiUrl = normalized.endsWith('/api') ? normalized : `${normalized}/api`;

    let activeClass: any = null;
    let moderatorCount = 0;
    let participantCount = 0;
    let reason = 'not-running';

    for (const cls of liveClasses) {
      if (!cls.bbbMeetingId) {
        reason = 'no-meeting-id';
        continue;
      }

      try {
        const params = `meetingID=${encodeURIComponent(cls.bbbMeetingId)}`;
        const checksum = generateBBBChecksum('getMeetingInfo', params, bbbApiSecret);
        const res = await fetch(`${apiUrl}/getMeetingInfo?${params}&checksum=${checksum}`);
        const xml = await res.text();

        const meeting = classifyMeetingState(xml);

        if (meeting.state === 'ended') {
          // Trainer ended the session (or BBB reaped it). Retire the row so the
          // Live button stops showing for everyone.
          console.log(`🛑 Meeting ended for "${cls.moduleTitle}" - marking completed`);

          await ModuleClass.findByIdAndUpdate(cls._id, {
            status: 'completed',
            isLive: false,
            canJoin: false,
            actualEndTime: new Date(),
            $unset: { joinedSessionTokens: 1, studentSessionTokens: 1 }
          });

          reason = 'session-ended';
          continue;
        }

        if (meeting.state === 'trainer-present') {
          activeClass = cls;
          moderatorCount = meeting.moderatorCount;
          participantCount = meeting.participantCount;
          reason = 'trainer-present';
          break;
        }

        if (meeting.state === 'trainer-absent') {
          // Meeting object still exists but no moderator is in it. The trainer
          // has stepped out, so students must not see it as live. Deliberately
          // NOT marked completed - a reconnect brings it back to live.
          console.log(`⏸️ No moderator in "${cls.moduleTitle}" - not live for students`);
          participantCount = meeting.participantCount;
          reason = 'trainer-absent';
        }
      } catch (error: any) {
        console.log(`⚠️ Could not verify meeting ${cls.bbbMeetingId}:`, error.message);
        reason = 'verify-failed';
      }
    }

    if (!activeClass) {
      return NextResponse.json({
        success: true,
        isLive: false,
        trainerPresent: false,
        verified: true,
        liveClass: null,
        participantCount,
        reason
      });
    }

    return NextResponse.json({
      success: true,
      isLive: true,
      trainerPresent: true,
      verified: true,
      reason,
      moderatorCount,
      participantCount,
      liveClass: {
        _id: String(activeClass._id),
        moduleTitle: activeClass.moduleTitle,
        scheduledDate: activeClass.scheduledDate,
        scheduledTime: activeClass.scheduledTime,
        duration: activeClass.duration,
        bbbMeetingId: activeClass.bbbMeetingId,
        actualStartTime: activeClass.actualStartTime
      }
    });
  } catch (error: any) {
    console.error('❌ batch-live-status error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
