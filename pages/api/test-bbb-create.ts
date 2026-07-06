import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('=== BBB CREATE TEST ===');
    
    const serverUrl = process.env.BIGBLUEBUTTON_SERVER_URL;
    const apiSecret = process.env.BIGBLUEBUTTON_API_SECRET;
    
    console.log('Server URL:', serverUrl);
    console.log('API Secret length:', apiSecret ? apiSecret.length : 0);
    console.log('API Secret (first 10 chars):', apiSecret ? apiSecret.substring(0, 10) + '...' : 'NOT SET');

    if (!serverUrl || !apiSecret) {
      return res.status(500).json({
        success: false,
        error: 'BBB configuration missing',
        debug: {
          serverUrl: serverUrl ? 'SET' : 'NOT SET',
          apiSecret: apiSecret ? 'SET' : 'NOT SET'
        }
      });
    }

    // Test creating a simple meeting
    const { createMeeting } = require('@/lib/bigbluebutton');
    
    const testMeetingId = `test-${Date.now()}`;
    const testMeetingName = 'Test Meeting';
    
    console.log('Testing meeting creation...');
    console.log('Meeting ID:', testMeetingId);
    console.log('Meeting Name:', testMeetingName);
    
    const result = await createMeeting(testMeetingId, testMeetingName, {
      attendeePW: 'student123',
      moderatorPW: 'trainer123',
      welcome: 'Test meeting for LMS integration',
      duration: 60,
      record: false
    });

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'BBB meeting created successfully!',
        meetingData: {
          meetingId: result.meetingId,
          attendeePassword: result.attendeePassword,
          moderatorPassword: result.moderatorPassword,
          joinUrl: result.joinUrl,
          moderatorJoinUrl: result.moderatorJoinUrl
        }
      });
    } else {
      throw new Error('Meeting creation returned success=false');
    }

  } catch (error: any) {
    console.error('BBB create test error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to create BBB meeting: ' + error.message,
      stack: error.stack,
      troubleshooting: [
        'Restart the development server after changing .env.local',
        'Verify the BBB server is accessible: https://class.techpratham.org',
        'Check that the API secret matches your BBB server configuration',
        'Try testing with the API-Mate tool from BBB server output'
      ]
    });
  }
}