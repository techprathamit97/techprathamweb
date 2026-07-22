import { NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const ModuleClass = require('@/models/ModuleClass');
const Batch = require('@/models/Batch');
const Trainer = require('@/models/Trainer');

export async function GET(request: Request) {
  try {
    await connectMongo();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'scheduled';
    const limit = parseInt(searchParams.get('limit') || '100');
    const batchId = searchParams.get('batchId');

    console.log('Fetching live classes with params:', { status, limit, batchId });

    // Query ModuleClass for scheduled classes (this is where trainers create classes)
    let query: any = {};

    if (status === 'scheduled') {
      // Include both scheduled and live classes
      query.$or = [
        { status: 'scheduled' },
        { status: 'live', isLive: true }
      ];
    } else {
      query.status = status;
    }

    if (batchId) {
      query.batchId = batchId;
    }

    console.log('ModuleClass query:', query);

    const classes = await ModuleClass.find(query)
      .populate('batchId', 'batchName')
      .populate('trainerId', 'name')
      .sort({ scheduledDate: 1, scheduledTime: 1 })
      .limit(limit)
      .lean();

    console.log(`Found ${classes?.length || 0} classes in ModuleClass collection`);

    // Guard against undefined classes
    if (!classes || !Array.isArray(classes)) {
      console.log('No classes found or invalid data');
      return NextResponse.json({
        success: true,
        data: [],
        total: 0
      });
    }

    // Transform to match LiveClass interface expected by student frontend
    const liveClasses = classes.map(cls => {
      // Parse scheduled time for display
      const scheduledDate = new Date(cls.scheduledDate);
      const [hours, minutes] = (cls.scheduledTime || '10:00').split(':');
      scheduledDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      return {
        _id: cls._id,
        title: cls.moduleTitle || 'Live Class',
        description: cls.description || cls.moduleTitle || '',
        batchName: cls.batchId?.batchName || 'Unknown Batch',
        trainerName: cls.trainerId?.name || 'Unknown Trainer',
        scheduledDate: cls.scheduledDate,
        scheduledTime: cls.scheduledTime || '10:00',
        duration: cls.duration || 60,
        status: cls.status || 'scheduled',
        roomConfig: {
          meetingLink: cls.bbbJoinUrl || cls.meetingLink || '',
          platform: 'bbb' // Always BBB since we're using BigBlueButton
        },
        recording: {
          enabled: !!(cls.recordings && cls.recordings.length > 0),
          recordingUrl: cls.recordingUrl || ''
        },
        // Include BBB-specific data for join functionality
        bbbMeetingId: cls.bbbMeetingId,
        bbbJoinUrl: cls.bbbJoinUrl,
        bbbModeratorJoinUrl: cls.bbbModeratorJoinUrl,
        isLive: cls.isLive || false,
        canJoin: cls.canJoin || false
      };
    });

    console.log('Transformed live classes:', liveClasses.length);

    return NextResponse.json({
      success: true,
      data: liveClasses,
      total: liveClasses.length
    });

  } catch (error: any) {
    console.error('Error fetching live classes:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch classes'
    }, { status: 500 });
  }
}