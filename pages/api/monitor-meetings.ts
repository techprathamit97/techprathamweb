import { NextApiRequest, NextApiResponse } from 'next';
import { connectMongo } from '@/utils/mongodb';
import crypto from 'crypto';
const ModuleClass = require('@/models/ModuleClass');

// Helper function to generate BBB API checksum
function generateBBBChecksum(apiCall: string, params: string, secret: string): string {
  const stringToHash = apiCall + params + secret;
  return crypto.createHash('sha1').update(stringToHash, 'utf8').digest('hex');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('=== MONITORING LIVE MEETINGS ===');

    await connectMongo();

    // Find all live classes
    const liveClasses = await ModuleClass.find({
      status: 'live',
      bbbMeetingId: { $exists: true, $ne: null }
    });

    console.log(`Found ${liveClasses.length} live classes to monitor`);

    if (liveClasses.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No live classes to monitor',
        liveClasses: 0
      });
    }

    // BBB API configuration
    const bbbServerUrl = 'https://class.techpratham.org/bigbluebutton';
    const bbbApiSecret = '6R9sIYi5RItE0xnuvXhWffyDHLqR5yzujOGLZfs8X0g';

    const monitorResults: any[] = [];
    let endedClasses = 0;

    for (const moduleClass of liveClasses) {
      try {
        const meetingId = moduleClass.bbbMeetingId || `class-${moduleClass._id}`;
        
        console.log(`Checking if meeting is still running: ${meetingId}`);

        // Check if meeting is still running
        const isMeetingRunningParams = `meetingID=${meetingId}`;
        const isMeetingRunningChecksum = generateBBBChecksum('isMeetingRunning', isMeetingRunningParams, bbbApiSecret);
        const isMeetingRunningUrl = `${bbbServerUrl}/api/isMeetingRunning?meetingID=${encodeURIComponent(meetingId)}&checksum=${isMeetingRunningChecksum}`;

        const runningResponse = await fetch(isMeetingRunningUrl);
        const runningXML = await runningResponse.text();

        console.log(`Meeting ${meetingId} status:`, runningXML.includes('<running>true</running>') ? 'RUNNING' : 'ENDED');

        const isStillRunning = runningXML.includes('<running>true</running>');

        if (!isStillRunning) {
          // Meeting has ended, mark class as completed
          console.log(`🔴 Meeting ${meetingId} has ended, updating class status`);
          
          moduleClass.status = 'completed';
          moduleClass.isLive = false;
          moduleClass.actualEndTime = new Date();
          await moduleClass.save();

          endedClasses++;

          // Immediately trigger recording processing
          console.log(`📹 Scheduling recording processing for class: ${moduleClass.moduleTitle}`);
          
          // Call recording processing after a short delay
          setTimeout(async () => {
            try {
              const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
              
              console.log('🎬 Processing recordings for:', moduleClass._id);
              
              const processResponse = await fetch(`${baseUrl}/api/process-bbb-recordings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  classId: moduleClass._id,
                  meetingId: meetingId
                })
              });

              const processData = await processResponse.json();
              console.log('Recording processing result:', processData);

            } catch (processError) {
              console.error('Error processing recordings:', processError);
            }
          }, 60000); // Wait 1 minute for BBB to start processing recordings

          monitorResults.push({
            classId: moduleClass._id,
            className: moduleClass.moduleTitle,
            meetingId: meetingId,
            status: 'ended',
            action: 'recording_processing_scheduled'
          });
        } else {
          monitorResults.push({
            classId: moduleClass._id,
            className: moduleClass.moduleTitle,
            meetingId: meetingId,
            status: 'still_running'
          });
        }

      } catch (classError: any) {
        console.error(`Error monitoring class ${moduleClass._id}:`, classError);
        monitorResults.push({
          classId: moduleClass._id,
          className: moduleClass.moduleTitle,
          error: classError.message
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Monitoring completed. ${endedClasses} classes ended and scheduled for recording processing.`,
      liveClassesChecked: liveClasses.length,
      classesEnded: endedClasses,
      monitorResults: monitorResults
    });

  } catch (error: any) {
    console.error('Error monitoring meetings:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to monitor meetings: ' + error.message
    });
  }
}