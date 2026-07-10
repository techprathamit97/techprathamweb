import { NextApiRequest, NextApiResponse } from 'next';
import { connectMongo } from '@/utils/mongodb';
import crypto from 'crypto';
const ModuleClass = require('@/models/ModuleClass');

// Helper function to generate BBB API checksum
function generateBBBChecksum(apiCall: string, params: string, secret: string): string {
  const stringToHash = apiCall + params + secret;
  return crypto.createHash('sha1').update(stringToHash, 'utf8').digest('hex');
}

// End BBB meeting
async function endBBBMeeting(meetingId: string, moderatorPW: string): Promise<boolean> {
  const bbbServerUrl = 'https://class.techpratham.org/bigbluebutton';
  const bbbApiSecret = '77NxbTZnnrkERic8MBiqK5yOsUdMtmFjdgSmqr4Nj4';

  const endMeetingParams = `meetingID=${meetingId}&password=${moderatorPW}`;
  const endMeetingChecksum = generateBBBChecksum('endMeeting', endMeetingParams, bbbApiSecret);
  const endMeetingUrl = `${bbbServerUrl}/api/endMeeting?${endMeetingParams}&checksum=${endMeetingChecksum}`;

  console.log('Ending BBB meeting:', endMeetingUrl);

  const response = await fetch(endMeetingUrl);
  const responseXML = await response.text();

  return responseXML.includes('<returncode>SUCCESS</returncode>');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { classId, meetingId, moderatorPW } = req.body;

    if (!classId) {
      return res.status(400).json({
        success: false,
        error: 'classId is required'
      });
    }

    console.log('=== ENDING CLASS ===');
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
    const modPassword = moderatorPW || 'trainer123'; // Use the consistent trainer password

    console.log('Searching for meeting:', searchMeetingId);

    // Try to end the BBB meeting
    let meetingEnded = false;
    try {
      meetingEnded = await endBBBMeeting(searchMeetingId, modPassword);
      console.log('BBB meeting ended:', meetingEnded);
    } catch (error) {
      console.error('Error ending BBB meeting:', error);
      // Continue anyway - meeting might have already ended
    }

    // Update class status
    moduleClass.status = 'completed';
    moduleClass.isLive = false;
    moduleClass.actualEndTime = new Date();
    await moduleClass.save();

    console.log('Class marked as completed');

    return res.status(200).json({
      success: true,
      message: 'Class ended successfully! Recordings will be available in BBB viewer.',
      classId: classId,
      meetingId: searchMeetingId,
      meetingEnded: meetingEnded,
      note: 'View recordings at /view-bbb-recordings'
    });

  } catch (error: any) {
    console.error('Error ending class:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to end class: ' + error.message
    });
  }
}