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
    const { classId, meetingId } = req.body;

    if (!classId) {
      return res.status(400).json({
        success: false,
        error: 'classId is required'
      });
    }

    console.log('=== ENDING CLASS AND PREPARING RECORDING PROCESSING ===');
    console.log('Class ID:', classId);
    console.log('Meeting ID:', meetingId);

    await connectMongo();

    // Get class details
    const moduleClass = await ModuleClass.findById(classId);
    if (!moduleClass) {
      return res.status(404).json({
        success: false,
        error: 'Class not found'
      });
    }

    const searchMeetingId = meetingId || moduleClass.bbbMeetingId || `class-${classId}`;

    // BBB API configuration
    const bbbServerUrl = 'https://class.techpratham.org/bigbluebutton';
    const bbbApiSecret = '77NxbTZnnrkERic8MBiqK5yOsUdMtmFjdgSmqr4Nj4';

    // Check if meeting is still running
    const isMeetingRunningParams = `meetingID=${searchMeetingId}`;
    const isMeetingRunningChecksum = generateBBBChecksum('isMeetingRunning', isMeetingRunningParams, bbbApiSecret);
    const isMeetingRunningUrl = `${bbbServerUrl}/api/isMeetingRunning?meetingID=${encodeURIComponent(searchMeetingId)}&checksum=${isMeetingRunningChecksum}`;

    console.log('Checking if meeting is still running:', isMeetingRunningUrl);

    const runningResponse = await fetch(isMeetingRunningUrl);
    const runningXML = await runningResponse.text();

    console.log('Meeting running check response:', runningXML);

    const isStillRunning = runningXML.includes('<running>true</running>');

    // Update class status
    moduleClass.status = 'completed';
    moduleClass.isLive = false;
    moduleClass.actualEndTime = new Date();

    // If meeting is still running, we note it but don't try to end it forcibly
    if (isStillRunning) {
      console.log('Meeting is still running - will process recordings when it naturally ends');
    } else {
      console.log('Meeting has ended - ready for recording processing');
    }

    await moduleClass.save();

    // Schedule recording processing for a few minutes later (to allow BBB to process recordings)
    // This could be implemented as a background job, but for now we'll provide an endpoint to call
    
    console.log('Class marked as completed, recording processing can be triggered shortly');

    return res.status(200).json({
      success: true,
      message: 'Class ended successfully',
      classId: classId,
      meetingId: searchMeetingId,
      meetingStillRunning: isStillRunning,
      actualEndTime: moduleClass.actualEndTime,
      nextStep: 'Call /api/process-bbb-recordings in 2-3 minutes to process recordings'
    });

  } catch (error: any) {
    console.error('Error ending class:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to end class: ' + error.message
    });
  }
}