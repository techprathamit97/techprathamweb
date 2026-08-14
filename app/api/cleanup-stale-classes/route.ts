import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
import crypto from 'crypto';
const ModuleClass = require('@/models/ModuleClass');

// Helper function to generate BBB API checksum
function generateBBBChecksum(apiCall: string, params: string, secret: string): string {
  const stringToHash = apiCall + params + secret;
  return crypto.createHash('sha1').update(stringToHash, 'utf8').digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    await connectMongo();
    
    console.log('🧹 MANUAL CLEANUP: Starting stale class cleanup');
    
    const bbbServerUrl = process.env.BIGBLUEBUTTON_SERVER_URL;
    const bbbApiSecret = process.env.BIGBLUEBUTTON_API_SECRET;
    
    if (!bbbServerUrl || !bbbApiSecret) {
      return NextResponse.json({
        success: false,
        error: 'BBB configuration not available'
      }, { status: 500 });
    }
    
    // Find all classes marked as live
    const liveClasses = await ModuleClass.find({
      status: 'live',
      isLive: true,
      bbbMeetingId: { $exists: true, $ne: null }
    });
    
    console.log(`🧹 CLEANUP: Found ${liveClasses.length} classes marked as live`);
    
    if (liveClasses.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No live classes to cleanup',
        cleanedUp: 0,
        total: 0
      });
    }
    
    const normalizedServerUrl = bbbServerUrl.replace(/\/$/, '');
    const apiUrl = normalizedServerUrl.endsWith('/api') ? normalizedServerUrl : `${normalizedServerUrl}/api`;
    
    let cleanedUp = 0;
    const results: any[] = [];
    
    for (const cls of liveClasses) {
      try {
        // Check if meeting is still active on BBB
        const getMeetingInfoParams = `meetingID=${encodeURIComponent(cls.bbbMeetingId)}`;
        const getMeetingInfoChecksum = generateBBBChecksum('getMeetingInfo', getMeetingInfoParams, bbbApiSecret);
        const getMeetingInfoUrl = `${apiUrl}/getMeetingInfo?${getMeetingInfoParams}&checksum=${getMeetingInfoChecksum}`;
        
        const response = await fetch(getMeetingInfoUrl);
        const xml = await response.text();
        
        // If meeting doesn't exist or has ended, mark class as completed
        if (xml.includes('notFound') || xml.includes('No such meeting') || 
            xml.includes('<ended>true</ended>') || xml.includes('meetingForciblyEnded')) {
          
          console.log(`🧹 CLEANUP: Meeting ${cls.bbbMeetingId} no longer active, marking class as completed`);
          
          await ModuleClass.findByIdAndUpdate(cls._id, {
            status: 'completed',
            isLive: false,
            actualEndTime: new Date()
          });
          
          cleanedUp++;
          results.push({
            classId: cls._id,
            moduleTitle: cls.moduleTitle,
            meetingId: cls.bbbMeetingId,
            action: 'marked_completed',
            reason: 'meeting_not_active'
          });
        } else {
          // Meeting is still active
          results.push({
            classId: cls._id,
            moduleTitle: cls.moduleTitle,
            meetingId: cls.bbbMeetingId,
            action: 'kept_live',
            reason: 'meeting_still_active'
          });
        }
      } catch (error) {
        console.log(`🧹 CLEANUP: Error checking meeting ${cls.bbbMeetingId}:`, error);
        results.push({
          classId: cls._id,
          moduleTitle: cls.moduleTitle,
          meetingId: cls.bbbMeetingId,
          action: 'error',
          reason: 'check_failed',
          error: error.message
        });
      }
    }
    
    console.log(`🧹 CLEANUP: Processed ${liveClasses.length} classes, cleaned up ${cleanedUp}`);
    
    return NextResponse.json({
      success: true,
      message: `Cleanup completed. Processed ${liveClasses.length} classes, cleaned up ${cleanedUp} stale classes.`,
      cleanedUp,
      total: liveClasses.length,
      details: results
    });
    
  } catch (error: any) {
    console.error('🧹 CLEANUP: Error during cleanup:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}