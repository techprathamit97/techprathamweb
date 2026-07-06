import { NextRequest, NextResponse } from 'next/server';
import { getRecordings } from '@/lib/bigbluebutton';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json({ success: false, error: 'Student ID is required' }, { status: 400 });
    }

    console.log('=== FETCHING RECORDINGS ===');
    console.log('StudentId:', studentId);

    // Check if BigBlueButton is configured
    const bbbServerUrl = process.env.BIGBLUEBUTTON_SERVER_URL;
    const bbbApiSecret = process.env.BIGBLUEBUTTON_API_SECRET;

    if (!bbbServerUrl || !bbbApiSecret) {
      console.log('BigBlueButton not configured, returning empty recordings');
      return NextResponse.json({
        success: true,
        recordings: [],
        message: 'Recording system not configured'
      });
    }

    // Get all recordings from BigBlueButton
    const result = await getRecordings();

    if (!result.success) {
      throw new Error('Failed to fetch recordings from BigBlueButton');
    }

    // Filter for published recordings only
    const publishedRecordings = result.recordings.filter((r: any) => r.published === 'true');

    console.log('Found recordings:', publishedRecordings.length);

    // Transform recordings to match expected format
    const recordings = publishedRecordings.map((rec: any) => ({
      _id: rec.recordID,
      topic: rec.name || 'Class Recording',
      description: '',
      classDate: rec.startTime ? new Date(parseInt(rec.startTime)).toISOString() : new Date().toISOString(),
      recordingUrl: rec.playback?.url,
      batchName: 'Live Class',
      trainerName: 'Instructor'
    }));

    console.log('Returning recordings:', recordings.length);
    console.log('=== END FETCHING RECORDINGS ===');

    return NextResponse.json({
      success: true,
      recordings: recordings
    });
  } catch (error: any) {
    console.error('Error fetching recordings:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
