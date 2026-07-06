import { NextRequest, NextResponse } from 'next/server';
import { getRecordings, publishRecording, deleteRecording } from '@/lib/bigbluebutton';

// GET /api/lms/recordings/[id] - Get recording details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const userType = searchParams.get('userType'); // 'student', 'trainer', 'admin'

    // Check if BigBlueButton is configured
    const bbbServerUrl = process.env.BIGBLUEBUTTON_SERVER_URL;
    const bbbApiSecret = process.env.BIGBLUEBUTTON_API_SECRET;

    if (!bbbServerUrl || !bbbApiSecret) {
      return NextResponse.json(
        { error: 'Recording system not configured' },
        { status: 503 }
      );
    }

    // Get all recordings and find the one with matching ID
    const result = await getRecordings();

    if (!result.success) {
      throw new Error('Failed to fetch recordings from BigBlueButton');
    }

    const recording = result.recordings.find((r: any) => r.recordID === id);

    if (!recording) {
      return NextResponse.json(
        { error: 'Recording not found' },
        { status: 404 }
      );
    }

    // Check if recording is published (access control for students)
    if (recording.published !== 'true' && userType !== 'admin') {
      return NextResponse.json(
        { error: 'Recording not available' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        _id: recording.recordID,
        title: recording.name || 'Live Class',
        description: '',
        courseId: null,
        batchId: null,
        batchName: 'Live Class',
        sessionNumber: null,
        scheduledStart: recording.startTime ? new Date(parseInt(recording.startTime)).toISOString() : null,
        actualStart: recording.startTime ? new Date(parseInt(recording.startTime)).toISOString() : null,
        actualEnd: recording.endTime ? new Date(parseInt(recording.endTime)).toISOString() : null,
        duration: recording.duration ? parseInt(recording.duration) : 0,
        platform: 'bigbluebutton',
        recording: {
          enabled: true,
          recordingUrl: recording.playback?.url,
          recordingId: recording.recordID,
          recordingStatus: recording.published === 'true' ? 'ready' : 'not_started'
        },
        hostId: null,
        hostName: 'Instructor',
        accessLevel: userType || 'public',
        classSettings: null,
        createdAt: recording.startTime ? new Date(parseInt(recording.startTime)).toISOString() : new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Get recording error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recording', message: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/lms/recordings/[id] - Update recording (publish/unpublish/delete)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await req.json();
    const { action } = data;

    // Check if BigBlueButton is configured
    const bbbServerUrl = process.env.BIGBLUEBUTTON_SERVER_URL;
    const bbbApiSecret = process.env.BIGBLUEBUTTON_API_SECRET;

    if (!bbbServerUrl || !bbbApiSecret) {
      return NextResponse.json(
        { error: 'Recording system not configured' },
        { status: 503 }
      );
    }

    switch (action) {
      case 'publish':
        if (data.publish === undefined) {
          return NextResponse.json({ error: 'publish parameter is required' }, { status: 400 });
        }
        const publishResult = await publishRecording(id, data.publish);
        return NextResponse.json({
          success: publishResult.success,
          message: data.publish ? 'Recording published' : 'Recording unpublished'
        });
      case 'delete':
        const deleteResult = await deleteRecording(id);
        return NextResponse.json({
          success: deleteResult.success,
          message: 'Recording deleted'
        });
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use action=publish or action=delete' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Update recording error:', error);
    return NextResponse.json(
      { error: 'Failed to update recording', message: error.message },
      { status: 500 }
    );
  }
}