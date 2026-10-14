import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectMongo } from '@/utils/mongodb';
const ModuleClass = require('@/models/ModuleClass');

function generateBBBChecksum(apiCall: string, params: string, secret: string): string {
  return crypto.createHash('sha1').update(apiCall + params + secret, 'utf8').digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    await connectMongo();
    
    const { classId, batchId, adminName, purpose } = await request.json();
    
    console.log('🔑 Admin join request:', { classId, batchId, adminName, purpose });
    
    if (!classId && !batchId) {
      return NextResponse.json({
        success: false,
        error: 'Either classId or batchId is required'
      }, { status: 400 });
    }

    // Find the live class - prioritize classId over batchId
    let moduleClass;
    if (classId) {
      console.log('🔍 Looking for class by ID:', classId);
      moduleClass = await ModuleClass.findById(classId);
      console.log('📋 Found class by ID:', moduleClass ? {
        id: moduleClass._id,
        title: moduleClass.moduleTitle,
        status: moduleClass.status,
        isLive: moduleClass.isLive,
        bbbMeetingId: moduleClass.bbbMeetingId
      } : 'NOT FOUND');
    } else {
      console.log('🔍 Looking for live class by batchId:', batchId);
      // Find live class by batchId (same logic as batch-live-status)
      moduleClass = await ModuleClass.findOne({
        batchId,
        status: 'live',
        isLive: true
      }).sort({ actualStartTime: -1 });
      console.log('📋 Found class by batchId:', moduleClass ? moduleClass.moduleTitle : 'NOT FOUND');
    }

    if (!moduleClass) {
      return NextResponse.json({
        success: false,
        error: 'No live class found'
      }, { status: 404 });
    }

    // Get BBB configuration
    const bbbServerUrl = process.env.BIGBLUEBUTTON_SERVER_URL;
    const bbbApiSecret = process.env.BIGBLUEBUTTON_API_SECRET;

    if (!bbbServerUrl || !bbbApiSecret) {
      return NextResponse.json({
        success: false,
        error: 'BBB not configured'
      }, { status: 500 });
    }

    if (!moduleClass.bbbMeetingId) {
      return NextResponse.json({
        success: false,
        error: 'No BBB meeting ID found for this class'
      }, { status: 400 });
    }

    // Verify meeting is actually running
    try {
      const checkParams = `meetingID=${encodeURIComponent(moduleClass.bbbMeetingId)}`;
      const checkChecksum = generateBBBChecksum('getMeetingInfo', checkParams, bbbApiSecret);
      const normalized = bbbServerUrl.replace(/\/$/, '');
      const apiUrl = normalized.endsWith('/api') ? normalized : `${normalized}/api`;
      
      const checkRes = await fetch(`${apiUrl}/getMeetingInfo?${checkParams}&checksum=${checkChecksum}`);
      const xmlText = await checkRes.text();
      
      // Simple check if meeting exists and is running
      if (!xmlText.includes('<returncode>SUCCESS</returncode>') || 
          xmlText.includes('<running>false</running>')) {
        return NextResponse.json({
          success: false,
          error: 'Meeting is not currently running'
        }, { status: 400 });
      }
    } catch (verifyError) {
      console.error('Error verifying meeting:', verifyError);
      // Continue anyway - don't block admin join if verification fails
    }

    // Generate attendee join URL (not moderator)
    const params = new URLSearchParams({
      meetingID: moduleClass.bbbMeetingId,
      fullName: adminName || 'Admin',
      password: moduleClass.bbbAttendeePassword || 'ap',
      redirect: 'true'
    });

    const queryString = params.toString();
    const checksum = generateBBBChecksum('join', queryString, bbbApiSecret);
    const normalized = bbbServerUrl.replace(/\/$/, '');
    const apiUrl = normalized.endsWith('/api') ? normalized : `${normalized}/api`;
    const joinUrl = `${apiUrl}/join?${queryString}&checksum=${checksum}`;

    // Log admin entry for audit (safe update with error handling)
    try {
      await ModuleClass.findByIdAndUpdate(moduleClass._id, {
        $push: {
          adminEntries: {
            adminName: adminName || 'Admin',
            joinedAt: new Date(),
            purpose: purpose || 'attendance-monitoring'
          }
        }
      });
    } catch (logError) {
      console.error('Failed to log admin entry:', logError);
      // Don't fail the request if logging fails
    }

    // Populate batch and trainer info safely
    let classInfo = {
      title: moduleClass.moduleTitle,
      batchName: 'Unknown Batch',
      trainerName: 'Unknown Trainer'
    };

    try {
      const populatedClass = await ModuleClass.findById(moduleClass._id)
        .populate('batchId', 'batchName')
        .populate('trainerId', 'name');
      
      if (populatedClass) {
        classInfo = {
          title: populatedClass.moduleTitle,
          batchName: populatedClass.batchId?.batchName || 'Unknown Batch',
          trainerName: populatedClass.trainerId?.name || 'Unknown Trainer'
        };
      }
    } catch (populateError) {
      console.error('Failed to populate class info:', populateError);
      // Use defaults set above
    }

    return NextResponse.json({
      success: true,
      joinUrl,
      message: 'Admin join URL generated',
      classInfo
    });

  } catch (error: any) {
    console.error('Admin join class error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}