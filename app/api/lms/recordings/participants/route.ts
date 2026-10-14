import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from "@/utils/mongodb";

const ModuleClass = require("@/models/ModuleClass");
const Student = require("@/models/Student");
const Batch = require("@/models/Batch");
const BBBMeetingAttendanceExport = require("@/models/BBBMeetingAttendanceExport");
const { normalizeAttendance, formatDuration } = require("@/lib/bbb/normalizeAttendance");

// Finds the archived Learning Dashboard export for a recording.
//
// A BBB recordID is the meeting's internal ID, so `meetingIntId === recordingId`
// pins the exact session. The external meeting ID can be reused across
// sessions (same room), so it is only a fallback and picks the newest export.
// Meeting names are never used for matching.
async function findBBBAttendance(recordingId: string, meetingId: string): Promise<any> {
  try {
    const projection = 'meetingIntId meetingExtId meetingName createdOn endedOn data.users data.users_data';

    let bbbExport = await BBBMeetingAttendanceExport
      .findOne({ meetingIntId: recordingId })
      .select(projection)
      .lean();

    if (!bbbExport) {
      bbbExport = await BBBMeetingAttendanceExport
        .findOne({ meetingExtId: meetingId })
        .select(projection)
        .sort({ archivedAt: -1 })
        .lean();
    }

    return bbbExport ? normalizeAttendance(bbbExport) : null;
  } catch (error) {
    console.error('❌ Error searching BBB attendance:', error);
    return null;
  }
}

const formatIST = (iso: string | null) => iso ? new Date(iso).toLocaleString('en-IN', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
}) : 'N/A';

// GET /api/lms/recordings/participants?recordingId=X&batchId=Y&meetingId=Z
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const recordingId = searchParams.get('recordingId');
    const batchId = searchParams.get('batchId');
    const meetingId = searchParams.get('meetingId');

  
    if (!batchId || !meetingId || !recordingId) {
      return NextResponse.json({
        success: false,
        error: 'Batch ID, Meeting ID and Recording ID are required',
        participants: []
      }, { status: 400 });
    }

    await connectMongo();
   


    
    const bbbAttendance = await findBBBAttendance(recordingId, meetingId);

    if (bbbAttendance && bbbAttendance.attendanceAvailable && bbbAttendance.participants.length > 0) {
      // Transform BBB attendance data to match frontend expectations.
      // Only fields from the export are returned - no raw data.
      const transformedParticipants = bbbAttendance.participants.map((participant: any) => ({
        name: participant.displayName || participant.fullName || 'Unknown',
        email: 'N/A',
        studentId: participant.userKey || participant.participantId || 'N/A',
        phone: 'N/A',
        joinedAt: formatIST(participant.firstJoinedAt),
        leftAt: formatIST(participant.lastLeftAt),
        duration: participant.totalDurationSeconds ? formatDuration(participant.totalDurationSeconds) : 'N/A',
        status: 'present',
        role: participant.role || 'UNKNOWN',
        isModerator: participant.role === 'MODERATOR',
        isFromBBBAttendance: true,
        sessionCount: participant.sessionCount || 0,
        messageCount: participant.messageCount || 0,
        intervals: participant.intervals || []
      }));
      
      return NextResponse.json({
        success: true,
        message: `Found ${transformedParticipants.length} actual participants from BBB Learning Dashboard`,
        participants: transformedParticipants,
        dataSource: 'bbb_attendance_dashboard',
        meetingInfo: {
          meetingIntId: bbbAttendance.meetingIntId,
          meetingName: bbbAttendance.meetingName,
          status: bbbAttendance.status,
          startedAt: bbbAttendance.startedAt,
          endedAt: bbbAttendance.endedAt
        },
        debug: {
          method: 'bbb_attendance_dashboard',
          recordingId: recordingId,
          meetingId: meetingId,
          attendanceAvailable: true
        }
      });
    }

    // No archived attendance. We deliberately do NOT guess participants from
    // batch enrollment - that showed students who never attended.
    return NextResponse.json({
      success: true,
      message: 'No participant data found for this recording',
      participants: [],
      dataSource: 'none',
      debug: {
        method: 'no_data_available',
        recordingId,
        batchId,
        meetingId,
        reason: 'No BBB Learning Dashboard export found for this recording',
        troubleshooting: {
          suggestions: [
            'Check if BBB Learning Dashboard collector is running',
            'Verify meeting was created through LMS',
            'Ensure students joined through LMS links',
            'Check if meeting attendance was properly archived'
          ]
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Error fetching participant details:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      participants: []
    }, { status: 500 });
  }
}