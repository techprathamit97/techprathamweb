import { NextRequest, NextResponse } from 'next/server';
import { getJoinUrl, isMeetingRunning, createMeeting } from '@/lib/bigbluebutton';

// POST /api/bbb/join - Generate a join URL for a participant
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { meetingId, userName, password, role, skipRunningCheck, meetingName } = body;

    if (!meetingId || !userName || !password) {
      return NextResponse.json(
        { success: false, error: 'meetingId, userName, and password are required' },
        { status: 400 }
      );
    }

    // Check if meeting exists and is running
    let running = false;
    try {
      running = await isMeetingRunning(meetingId);
    } catch (e) {
      // Meeting might not exist - try to create it
      console.log('Meeting not found, creating:', meetingId);
    }

    // If meeting doesn't exist, create it
    if (!running) {
      try {
        const attendeePW = password;
        const moderatorPW = Math.random().toString(36).substr(2, 8);
        await createMeeting(meetingId, meetingName || 'Live Class', {
          attendeePW,
          moderatorPW,
          record: true,
          recordVideo: true,
        });
      } catch (createError: any) {
        console.error('Failed to create meeting:', createError.message);
        // Continue anyway - BBB might auto-create meeting on join
      }
    }

    // Allow joining even if meeting is not running (for scheduled future classes)
    // The meeting will start automatically when someone joins
    const result = await getJoinUrl(meetingId, userName, password, role || 'attendee');

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error generating join URL:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate join URL' },
      { status: 500 }
    );
  }
}

// GET /api/bbb/join - Check if meeting is running
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get('meetingId');

    if (!meetingId) {
      return NextResponse.json(
        { success: false, error: 'meetingId is required' },
        { status: 400 }
      );
    }

    const running = await isMeetingRunning(meetingId);

    return NextResponse.json({
      success: true,
      data: {
        meetingId,
        running,
      },
    });
  } catch (error: any) {
    console.error('Error checking meeting:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to check meeting status' },
      { status: 500 }
    );
  }
}