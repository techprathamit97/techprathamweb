import { NextApiRequest, NextApiResponse } from 'next';
import { connectMongo } from '@/utils/mongodb';
import ModuleClass from '@/models/ModuleClass';
import crypto from 'crypto';

// Helper function to generate BBB API checksum
function generateBBBChecksum(apiCall: string, params: string, secret: string): string {
  const stringToHash = apiCall + params + secret;
  return crypto.createHash('sha1').update(stringToHash, 'utf8').digest('hex');
}

// POST { classId, trainerAction: 'end_session' }
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { classId, trainerAction } = req.body;

    if (!classId || trainerAction !== 'end_session') {
      return res.status(400).json({
        success: false,
        error: 'Missing classId or invalid trainerAction'
      });
    }

    await connectMongo();

    const moduleClass = await ModuleClass.findById(classId);
    if (!moduleClass) {
      return res.status(404).json({ success: false, error: 'Class not found' });
    }

    const bbbServerUrl = process.env.BIGBLUEBUTTON_SERVER_URL;
    const bbbApiSecret = process.env.BIGBLUEBUTTON_API_SECRET;
    const meetingId = moduleClass.bbbMeetingId;

    // End the actual BBB meeting if it exists
    if (bbbServerUrl && bbbApiSecret && meetingId) {
      const normalizedServerUrl = bbbServerUrl.replace(/\/$/, '');
      const apiUrl = normalizedServerUrl.endsWith('/api') ? normalizedServerUrl : `${normalizedServerUrl}/api`;

      try {
        // Use end API to end the meeting
        const endParams = `meetingID=${encodeURIComponent(meetingId)}&password=trainer123`;
        const endChecksum = generateBBBChecksum('end', endParams, bbbApiSecret);
        const endUrl = `${apiUrl}/end?${endParams}&checksum=${endChecksum}`;

        console.log('Ending BBB meeting:', meetingId);
        console.log('End URL:', endUrl);

        const endResponse = await fetch(endUrl);
        const endXML = await endResponse.text();

        console.log('BBB End response:', endXML);

        if (endXML.includes('<returncode>SUCCESS</returncode>')) {
          console.log('BBB meeting ended successfully');
        } else {
          console.log('BBB end response:', endXML);
        }
      } catch (bbbError) {
        console.error('Error ending BBB meeting:', bbbError);
        // Continue with database update even if BBB end fails
      }
    }

    // Clear all session data when trainer ends the session
    const updateResult = await ModuleClass.findByIdAndUpdate(
      classId,
      {
        $set: {
          status: 'completed',
          isLive: false,
          actualEndTime: new Date(),
          // Clear session tokens to allow fresh joins for future classes
          joinedSessionTokens: [],
          studentSessionTokens: [],
          // Clear the saved join URL
          bbbModeratorJoinUrl: null
        }
      },
      { new: true }
    );

    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('activeBBBMeeting');
    }

    console.log('Session ended by trainer for class:', classId);
    console.log('Cleared all session tokens and marked class as completed');

    return res.status(200).json({
      success: true,
      message: 'Class session ended successfully',
      classStatus: 'completed',
      clearedTokens: true,
      bbbMeetingEnded: true
    });

  } catch (err: any) {
    console.error('End session error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}