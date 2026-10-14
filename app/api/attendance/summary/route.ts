import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
import BBBMeetingAttendanceExport from '@/models/BBBMeetingAttendanceExport';

// GET /api/attendance/summary - Get attendance summary statistics
export async function GET(req: NextRequest) {
  try {
    console.log('📊 Generating attendance summary...');

    await connectMongo();

    // Run aggregation pipeline for summary statistics
    const [
      totalSessions,
      completedSessions, 
      inProgressSessions,
      participantStats
    ] = await Promise.all([
      // Total sessions count
      BBBMeetingAttendanceExport.countDocuments({}),
      
      // Completed sessions count
      BBBMeetingAttendanceExport.countDocuments({
        endedOn: { $exists: true, $ne: null }
      }),
      
      // In-progress sessions count
      BBBMeetingAttendanceExport.countDocuments({
        $or: [
          { endedOn: { $exists: false } },
          { endedOn: null }
        ]
      }),
      
      // Participant statistics aggregation
      BBBMeetingAttendanceExport.aggregate([
        {
          // Current exports use `data.users`; older ones `data.users_data`.
          $match: {
            $or: [
              { 'data.users': { $exists: true, $ne: null } },
              { 'data.users_data': { $exists: true, $ne: null } }
            ]
          }
        },
        {
          $project: {
            participantCount: {
              $let: {
                vars: { users: { $ifNull: ['$data.users', '$data.users_data'] } },
                in: {
                  $cond: {
                    if: { $eq: [{ $type: '$$users' }, 'object'] },
                    then: { $size: { $objectToArray: '$$users' } },
                    else: 0
                  }
                }
              }
            }
          }
        },
        {
          $addFields: { hasParticipants: { $gt: ['$participantCount', 0] } }
        },
        {
          $group: {
            _id: null,
            totalParticipantSessions: { $sum: '$participantCount' },
            sessionsWithParticipants: { $sum: { $cond: ['$hasParticipants', 1, 0] } },
            averageParticipants: { $avg: '$participantCount' },
            maxParticipants: { $max: '$participantCount' },
            minParticipants: { $min: '$participantCount' }
          }
        }
      ])
    ]);

    // Extract participant stats (aggregation returns array)
    const participantData = participantStats[0] || {
      totalParticipantSessions: 0,
      sessionsWithParticipants: 0,
      averageParticipants: 0,
      maxParticipants: 0,
      minParticipants: 0
    };

    // Get recent session activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentSessions = await BBBMeetingAttendanceExport.countDocuments({
      archivedAt: { $gte: sevenDaysAgo }
    });

    // Calculate session completion rate
    const completionRate = totalSessions > 0 
      ? Math.round((completedSessions / totalSessions) * 100) 
      : 0;

    console.log('✅ Summary statistics calculated:', {
      total: totalSessions,
      completed: completedSessions,
      inProgress: inProgressSessions,
      participantSessions: participantData.totalParticipantSessions
    });

    return NextResponse.json({
      success: true,
      data: {
        sessions: {
          total: totalSessions,
          completed: completedSessions,
          inProgress: inProgressSessions,
          recentWeek: recentSessions,
          completionRate: completionRate
        },
        participants: {
          totalParticipantSessions: participantData.totalParticipantSessions,
          sessionsWithParticipants: participantData.sessionsWithParticipants,
          averageParticipants: Math.round(participantData.averageParticipants * 100) / 100,
          maxParticipants: participantData.maxParticipants,
          minParticipants: participantData.minParticipants
        },
        // Future metrics when LMS mapping is implemented
        batches: {
          totalWithSessions: 0, // TODO: Count batches with attendance data
          averageAttendanceRate: null // TODO: Calculate from LMS enrollment vs attendance
        },
        generated: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ Error generating attendance summary:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate summary',
      message: error.message
    }, { status: 500 });
  }
}