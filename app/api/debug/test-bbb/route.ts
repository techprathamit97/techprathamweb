import { NextRequest, NextResponse } from 'next/server';
import { createMeeting, getMeetingInfo } from '@/lib/bigbluebutton';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const meetingId = searchParams.get('meetingId');

    const serverUrl = process.env.BIGBLUEBUTTON_SERVER_URL;
    const apiSecret = process.env.BIGBLUEBUTTON_API_SECRET;

    const result: any = {
      config: {
        serverUrl: serverUrl ? `Set: ${serverUrl}` : 'Missing',
        apiSecret: apiSecret ? `Set (length: ${apiSecret.length})` : 'Missing'
      }
    };

    if (action === 'create') {
      // Create a test meeting
      const testMeetingId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const testPassword = Math.random().toString(36).substr(2, 8);

      console.log('[TEST BBB] Creating meeting:', testMeetingId);

      try {
        const meeting = await createMeeting(testMeetingId, 'Test Meeting', {
          attendeePW: testPassword,
          moderatorPW: testPassword,
          duration: 60,
          record: false
        });

        result.action = 'create';
        result.success = true;
        result.meetingId = meeting.meetingId;
        result.joinUrl = meeting.joinUrl;
        result.moderatorJoinUrl = meeting.moderatorJoinUrl;
        result.attendeePassword = meeting.attendeePassword;
        result.moderatorPassword = meeting.moderatorPassword;
        result.internalMeetingId = meeting.internalMeetingId;
      } catch (createError: any) {
        result.action = 'create';
        result.success = false;
        result.error = createError.message;
        console.error('[TEST BBB] Create error:', createError);
      }
    } else if (action === 'check' && meetingId) {
      // Check if meeting exists
      try {
        const info = await getMeetingInfo(meetingId);
        result.action = 'check';
        result.success = true;
        result.meetingId = info.meetingId;
        result.running = info.running;
        result.participantCount = info.participantCount;
      } catch (checkError: any) {
        result.action = 'check';
        result.success = false;
        result.error = checkError.message;
      }
    } else {
      result.message = 'Add ?action=create to create a test meeting, or ?action=check&meetingId=XYZ to check a meeting';
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}