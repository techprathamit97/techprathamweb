import { NextRequest, NextResponse } from 'next/server';
import { getRecordings } from '@/lib/bigbluebutton';

// GET /api/lms/recordings - Get available recordings
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const batchId = searchParams.get('batchId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Check if BigBlueButton is configured
    const bbbServerUrl = process.env.BIGBLUEBUTTON_SERVER_URL;
    const bbbApiSecret = process.env.BIGBLUEBUTTON_API_SECRET;

    if (!bbbServerUrl || !bbbApiSecret) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: { page, limit, total: 0, pages: 0 },
        message: 'Recording system not configured'
      });
    }

    // Get all recordings from BigBlueButton
    const result = await getRecordings();

    if (!result.success) {
      throw new Error('Failed to fetch recordings from BigBlueButton');
    }

    // Filter for published recordings only
    let allRecordings = result.recordings.filter((r: any) => r.published === 'true');

    // If batchId is provided, we would need meeting name filtering (future enhancement)
    // For now, just return all recordings

    const skip = (page - 1) * limit;
    const total = allRecordings.length;
    const paginatedRecordings = allRecordings.slice(skip, skip + limit);

    // Transform recordings to match expected format
    const recordings = paginatedRecordings.map((rec: any) => ({
      _id: rec.recordID,
      sessionId: rec.recordID,
      liveClassId: null,
      title: rec.name || 'Live Class',
      description: '',
      courseId: null,
      batchId: batchId,
      batchName: 'Live Class',
      sessionNumber: null,
      scheduledStart: rec.startTime ? new Date(parseInt(rec.startTime)).toISOString() : null,
      scheduledEnd: null,
      actualStart: rec.startTime ? new Date(parseInt(rec.startTime)).toISOString() : null,
      actualEnd: rec.endTime ? new Date(parseInt(rec.endTime)).toISOString() : null,
      duration: rec.duration ? parseInt(rec.duration) : 0,
      platform: 'bigbluebutton',
      recording: {
        enabled: true,
        recordingUrl: rec.playback?.url,
        recordingId: rec.recordID
      },
      hostName: 'Instructor',
      viewCount: 0,
      createdAt: rec.startTime ? new Date(parseInt(rec.startTime)).toISOString() : new Date().toISOString()
    }));

    console.log('Found recordings:', recordings.length, 'total:', total);

    return NextResponse.json({
      success: true,
      data: recordings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('Get recordings error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recordings', message: error.message },
      { status: 500 }
    );
  }
}