import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
import BBBMeetingAttendanceExport from '@/models/BBBMeetingAttendanceExport';
import { normalizeAttendance } from '@/lib/bbb/normalizeAttendance';

// GET /api/attendance/meetings/[meetingIntId] - Get detailed attendance for specific meeting
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ meetingIntId: string }> }
) {
  try {
    const { meetingIntId } = await params;
    
    console.log('📋 Fetching attendance details for meeting:', meetingIntId);

    if (!meetingIntId || meetingIntId.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'Meeting ID is required'
      }, { status: 400 });
    }

    await connectMongo();

    // Find meeting export by internal meeting ID
    const meetingExport = await BBBMeetingAttendanceExport
      .findOne({ meetingIntId: meetingIntId.trim() })
      .lean();

    if (!meetingExport) {
      console.log('❌ Meeting not found:', meetingIntId);
      return NextResponse.json({
        success: false,
        error: 'Meeting not found',
        meetingIntId
      }, { status: 404 });
    }

    console.log('✅ Found meeting export:', {
      name: meetingExport.meetingName,
      status: meetingExport.endedOn ? 'COMPLETED' : 'IN_PROGRESS',
      hasData: Boolean(meetingExport.data)
    });

    // Normalize the attendance data using our parser
    const normalizedAttendance = normalizeAttendance(meetingExport) as any;
    
    // Add meeting metadata not included in normalizer
    const meetingDetails = {
      meetingIntId: meetingExport.meetingIntId,
      meetingExtId: meetingExport.meetingExtId,
      meetingName: meetingExport.meetingName || 'Unknown Meeting',
      status: normalizedAttendance.status,
      startedAt: normalizedAttendance.startedAt,
      endedAt: normalizedAttendance.endedAt,
      archivedAt: meetingExport.archivedAt ? new Date(meetingExport.archivedAt).toISOString() : null,
      participantCount: normalizedAttendance.participantCount,
      // Future: Add LMS mapping data
      batchId: null,
      batchName: null,
      courseName: null,
      trainerId: null,
      trainerName: null
    };

    // Calculate summary statistics
    const attendanceSummary = calculateAttendanceSummary(normalizedAttendance.participants);

    return NextResponse.json({
      success: true,
      data: {
        meeting: meetingDetails,
        attendance: normalizedAttendance.participants,
        attendanceAvailable: normalizedAttendance.attendanceAvailable,
        summary: attendanceSummary,
        errorMessage: normalizedAttendance.errorMessage || null
      }
    });

  } catch (error: any) {
    console.error('❌ Error fetching meeting attendance:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch meeting attendance',
      message: error.message
    }, { status: 500 });
  }
}

/**
 * Calculate attendance summary statistics
 */
function calculateAttendanceSummary(participants: any[]) {
  if (!participants || participants.length === 0) {
    return {
      totalParticipants: 0,
      moderatorCount: 0,
      studentCount: 0,
      averageDuration: null,
      totalDuration: null
    };
  }

  let moderatorCount = 0;
  let studentCount = 0;
  let totalDuration = 0;
  let participantsWithDuration = 0;

  participants.forEach(participant => {
    if (participant.role === 'MODERATOR') {
      moderatorCount++;
    } else if (participant.role === 'STUDENT') {
      studentCount++;
    }

    if (participant.totalDurationSeconds && participant.totalDurationSeconds > 0) {
      totalDuration += participant.totalDurationSeconds;
      participantsWithDuration++;
    }
  });

  const averageDuration = participantsWithDuration > 0 
    ? Math.round(totalDuration / participantsWithDuration) 
    : null;

  return {
    totalParticipants: participants.length,
    moderatorCount,
    studentCount,
    unknownRoleCount: participants.length - moderatorCount - studentCount,
    averageDuration: averageDuration, // seconds
    totalDuration: totalDuration > 0 ? totalDuration : null, // seconds
    participantsWithDuration
  };
}