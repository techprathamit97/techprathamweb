import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
import BBBMeetingAttendanceExport from '@/models/BBBMeetingAttendanceExport';
import { getUsersMap } from '@/lib/bbb/normalizeAttendance';

// GET /api/attendance/meetings - List all meeting sessions with attendance data
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Pagination parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;
    
    // Filter parameters
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status'); // 'completed' | 'in_progress'
    const from = searchParams.get('from'); // ISO date string
    const to = searchParams.get('to'); // ISO date string
    const batchId = searchParams.get('batchId'); // Future: filter by LMS batch
    
    console.log('📊 Fetching attendance meetings:', { page, limit, status, search, from, to });

    await connectMongo();

    // Build query filter
    const filter: any = {};
    
    // Status filter
    if (status === 'completed') {
      filter.endedOn = { $exists: true, $ne: null };
    } else if (status === 'in_progress') {
      filter.$or = [
        { endedOn: { $exists: false } },
        { endedOn: null }
      ];
    }
    
    // Date range filter
    if (from || to) {
      filter.archivedAt = {};
      if (from) {
        filter.archivedAt.$gte = new Date(from);
      }
      if (to) {
        filter.archivedAt.$lte = new Date(to);
      }
    }
    
    // Search filter (meeting name)
    if (search.trim()) {
      filter.meetingName = { $regex: search.trim(), $options: 'i' };
    }
    
    // TODO: Add batchId filter once meeting-to-batch mapping is implemented
    
    // Execute queries
    const [meetings, totalCount] = await Promise.all([
      BBBMeetingAttendanceExport
        .find(filter)
        .select('meetingIntId meetingName meetingExtId createdOn endedOn archivedAt data.users data.users_data')
        .sort({ archivedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      
      BBBMeetingAttendanceExport.countDocuments(filter)
    ]);

    console.log(`✅ Found ${meetings.length} meetings (${totalCount} total)`);

    // Transform meetings for API response
    const transformedMeetings = meetings.map(meeting => {
      const timestamps = {
        startedAt: meeting.createdOn ? new Date(meeting.createdOn).toISOString() : null,
        endedAt: meeting.endedOn ? new Date(meeting.endedOn).toISOString() : null
      };
      
      const usersMap = getUsersMap(meeting.data);
      const participantCount = usersMap ? Object.keys(usersMap).length : null;
      
      return {
        meetingIntId: meeting.meetingIntId,
        meetingExtId: meeting.meetingExtId,
        meetingName: meeting.meetingName || 'Unknown Meeting',
        status: meeting.endedOn ? 'COMPLETED' : 'IN_PROGRESS',
        startedAt: timestamps.startedAt,
        endedAt: timestamps.endedAt,
        archivedAt: meeting.archivedAt ? new Date(meeting.archivedAt).toISOString() : null,
        participantCount: participantCount,
        // Future: Add batch/course mapping
        batchName: null,
        courseName: null,
        trainerName: null
      };
    });

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      data: {
        meetings: transformedMeetings,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Error fetching attendance meetings:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch meetings',
      message: error.message
    }, { status: 500 });
  }
}