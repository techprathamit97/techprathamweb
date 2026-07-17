import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const Trainer = require('@/models/Trainer');
const Batch = require('@/models/Batch');
const Course = require('@/models/Course');
const ModuleClass = require('@/models/ModuleClass');
const Student = require('@/models/Student');

// Helper to generate BBB join URL if meeting exists but URL is missing
function getBBBJoinUrls(cls: any) {
  const serverUrl = process.env.BIGBLUEBUTTON_SERVER_URL;

  // If we already have the join URLs, return them
  if (cls.bbbJoinUrl && cls.bbbModeratorJoinUrl) {
    return {
      bbbJoinUrl: cls.bbbJoinUrl,
      bbbModeratorJoinUrl: cls.bbbModeratorJoinUrl
    };
  }

  // If meeting ID exists but URLs are missing, generate them
  if (cls.bbbMeetingId && serverUrl) {
    const attendeePassword = cls.bbbAttendeePassword;
    const moderatorPassword = cls.bbbModeratorPassword;

    return {
      bbbJoinUrl: attendeePassword
        ? `${serverUrl}/bigbluebutton/api/join?meetingID=${cls.bbbMeetingId}&password=${attendeePassword}`
        : null,
      bbbModeratorJoinUrl: moderatorPassword
        ? `${serverUrl}/bigbluebutton/api/join?meetingID=${cls.bbbMeetingId}&password=${moderatorPassword}`
        : null
    };
  }

  // No meeting info available
  return {
    bbbJoinUrl: null,
    bbbModeratorJoinUrl: null
  };
}

// GET - Fetch trainer's courses with scheduled classes and completed modules
export async function GET(request: NextRequest) {
  try {
    await connectMongo();

    const { searchParams } = new URL(request.url);
    const trainerId = searchParams.get('trainerId');

    if (!trainerId) {
      return NextResponse.json({
        success: false,
        error: 'Trainer ID is required'
      }, { status: 400 });
    }

    // Find trainer and their batches
    const trainer = await Trainer.findById(trainerId).lean();
    if (!trainer) {
      return NextResponse.json({
        success: false,
        error: 'Trainer not found'
      }, { status: 404 });
    }

    // Find batches assigned to this trainer - also populate students
    const batches = await Batch.find({ trainerId })
      .populate('courseId')
      .populate('studentIds')
      .lean();

    if (batches.length === 0) {
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    // Get all module classes for these batches
    const batchIds = batches.map((b: any) => b._id);
    const allClasses = await ModuleClass.find({
      batchId: { $in: batchIds },
      status: { $ne: 'cancelled' }
    }).sort({ scheduledDate: -1, scheduledTime: -1 }).lean();

    // Separate completed classes (with recordings) and scheduled classes
    const completedModules: any[] = [];
    const scheduledClasses: any[] = [];

    allClasses.forEach((cls: any) => {
      // Generate BBB join URLs if meeting exists but URLs are missing
      const bbbUrls = getBBBJoinUrls(cls);

      const classData = {
        ...cls,
        _id: cls._id.toString(),
        batchId: cls.batchId.toString(),
        courseId: cls.courseId.toString(),
        trainerId: cls.trainerId?.toString(),
        scheduledDate: cls.scheduledDate.toISOString(),
        isLive: isClassLive(cls),
        canJoin: canJoinClass(cls),
        isCompleted: cls.status === 'completed' || cls.isCompleted,
        hasRecordings: cls.recordings && cls.recordings.length > 0,
        // Include BigBlueButton fields explicitly
        bbbMeetingId: cls.bbbMeetingId || null,
        bbbAttendeePassword: cls.bbbAttendeePassword || null,
        bbbModeratorPassword: cls.bbbModeratorPassword || null,
        bbbJoinUrl: bbbUrls.bbbJoinUrl,
        bbbModeratorJoinUrl: bbbUrls.bbbModeratorJoinUrl,
        // Include student progress for each class
        studentProgress: cls.studentProgress?.map((sp: any) => ({
          studentId: sp.studentId?.toString(),
          progress: sp.progress,
          updatedAt: sp.updatedAt,
          updatedBy: sp.updatedBy
        })) || []
      };

      // Scheduled classes = only status 'scheduled' or 'live' (not completed/cancelled)
      // If status is 'completed', show in completed section regardless of recordings
      if (cls.status === 'completed') {
        completedModules.push(classData);
      } else {
        scheduledClasses.push(classData);
      }
    });

    // Build response data - group by course/batch
    const coursesData = [];
    const processedBatches = new Set();

    for (const batch of batches) {
      if (processedBatches.has(batch._id.toString())) continue;
      processedBatches.add(batch._id.toString());

      const course = batch.courseId;

      // Filter classes for this batch
      const batchCompletedModules = completedModules.filter(m => m.batchId === batch._id.toString());
      const batchScheduledClasses = scheduledClasses.filter(s => s.batchId === batch._id.toString());

      // Get students for this batch
      const batchStudents = (batch.studentIds || []).map((student: any) => ({
        _id: student._id?.toString(),
        studentId: student.studentId || student._id?.toString(),
        name: student.name,
        email: student.email
      }));

      coursesData.push({
        batchId: batch._id.toString(),
        batchName: batch.batchName,
        courseId: course._id.toString(),
        courseTitle: course.title,
        courseDescription: course.description || course.desc || '',
        completedModules: batchCompletedModules,
        scheduledClasses: batchScheduledClasses,
        totalCompletedModules: batchCompletedModules.length,
        totalScheduledClasses: batchScheduledClasses.length,
        students: batchStudents,
        courseProgress: batch.courseProgress || 0
      });
    }

    return NextResponse.json({
      success: true,
      data: coursesData
    });
  } catch (error: any) {
    console.error('Error fetching trainer course modules:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Helper function to determine if class is currently live
function isClassLive(cls: any): boolean {
  if (cls.status !== 'scheduled' && cls.status !== 'live') return false;

  const now = new Date();
  const classDate = new Date(cls.scheduledDate);
  const [hours, minutes] = cls.scheduledTime.split(':');
  classDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

  const endTime = new Date(classDate.getTime() + cls.duration * 60 * 1000);

  return now >= classDate && now <= endTime;
}

// Helper function to determine if class can be joined
function canJoinClass(cls: any): boolean {
  if (cls.status !== 'scheduled' && cls.status !== 'live') return false;

  const now = new Date();
  const classDate = new Date(cls.scheduledDate);
  const [hours, minutes] = cls.scheduledTime.split(':');
  classDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

  // Allow joining 15 minutes before class starts + 60 minutes grace period after class ends (for trainers)
  const joinWindow = 15 * 60 * 1000; // 15 minutes before
  const gracePeriod = 60 * 60 * 1000; // 60 minutes grace after class ends for trainers
  const endTime = new Date(classDate.getTime() + cls.duration * 60 * 1000);
  const extendedEndTime = new Date(endTime.getTime() + gracePeriod);

  return now >= new Date(classDate.getTime() - joinWindow) && now <= extendedEndTime;
}