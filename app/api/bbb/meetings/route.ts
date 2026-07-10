import { NextRequest, NextResponse } from 'next/server';
import { createMeeting, getRecordings, endMeeting, getMeetingInfo } from '@/lib/bigbluebutton';

// POST /api/bbb/meetings - Create a new meeting
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { meetingId, meetingName, attendeePW, moderatorPW, duration, record, recordVideo, welcome } = body;

    if (!meetingId || !meetingName) {
      return NextResponse.json(
        { success: false, error: 'meetingId and meetingName are required' },
        { status: 400 }
      );
    }

    const result = await createMeeting(meetingId, meetingName, {
      attendeePW,
      moderatorPW,
      duration,
      record,
      recordVideo,
      welcome,
      logoutURL: process.env.NEXT_PUBLIC_APP_URL,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error creating meeting:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create meeting' },
      { status: 500 }
    );
  }
}

// GET /api/bbb/meetings - Get recordings or meeting status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get('meetingId');
    const action = searchParams.get('action');

    if (action === 'status' && meetingId) {
      // Check if meeting is running
      const meetingInfo = await getMeetingInfo(meetingId);
      return NextResponse.json({
        success: true,
        meetingId: meetingInfo.meetingId,
        running: meetingInfo.running,
        participantCount: meetingInfo.participantCount,
        duration: meetingInfo.duration
      });
    }

    if (action === 'recordings') {
      const result = await getRecordings(meetingId || undefined);
      return NextResponse.json({
        success: true,
        data: result.recordings,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action. Use ?action=status or ?action=recordings' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error:', error);
    // If meeting not found, return success with running: false
    if (error.message && error.message.includes('not found')) {
      return NextResponse.json({
        success: true,
        running: false,
        participantCount: 0
      });
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch data' },
      { status: 500 }
    );
  }
}

// DELETE /api/bbb/meetings - End a meeting
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get('meetingId');
    const password = searchParams.get('password');

    if (!meetingId || !password) {
      return NextResponse.json(
        { success: false, error: 'meetingId and password are required' },
        { status: 400 }
      );
    }

    const result = await endMeeting(meetingId, password);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error ending meeting:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to end meeting' },
      { status: 500 }
    );
  }
}