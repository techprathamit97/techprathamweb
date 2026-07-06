import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

// Helper function to generate BBB API checksum
function generateBBBChecksum(apiCall: string, params: string, secret: string): string {
  const stringToHash = apiCall + params + secret;
  return crypto.createHash('sha1').update(stringToHash, 'utf8').digest('hex');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // BBB API configuration
    const bbbServerUrl = 'https://class.techpratham.org/bigbluebutton';
    const bbbApiSecret = '77NxbTZnnrkERic8MBiqK5yOsUdMtmFjdgSmqr4Nj4';
    
    // Use a test class ID with timestamp to avoid conflicts
    const testClassId = 'test-same-meeting-' + Date.now();
    const meetingId = `class-${testClassId}`;
    const attendeePassword = 'student123';
    const moderatorPassword = 'trainer123';
    
    console.log('=== SAME MEETING TEST ===');
    console.log('Test Class ID:', testClassId);
    console.log('Meeting ID:', meetingId);
    
    // First, create the meeting
    const createParams = {
      meetingID: meetingId,
      name: 'Test Same Meeting Room',
      attendeePW: attendeePassword,
      moderatorPW: moderatorPassword,
      welcome: 'Testing that trainer and student join the same room',
      record: 'false'
    };
    
    const createParamsString = Object.keys(createParams)
      .sort()
      .map(key => `${key}=${encodeURIComponent(createParams[key as keyof typeof createParams])}`)
      .join('&');
    
    const createChecksum = generateBBBChecksum('create', createParamsString, bbbApiSecret);
    const createUrl = `${bbbServerUrl}/api/create?${createParamsString}&checksum=${createChecksum}`;
    
    console.log('Creating test meeting...');
    console.log('Create URL:', createUrl);
    
    let meetingCreated = false;
    try {
      const createResponse = await fetch(createUrl);
      const createXML = await createResponse.text();
      
      console.log('Create Response:', createXML);
      
      if (createXML.includes('<returncode>SUCCESS</returncode>')) {
        meetingCreated = true;
        console.log('✅ Test meeting created successfully');
      } else {
        throw new Error('Failed to create test meeting: ' + createXML);
      }
    } catch (createError) {
      console.log('❌ Meeting creation failed:', createError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create test meeting: ' + createError
      });
    }
    
    // Generate trainer join URL
    const trainerJoinParams = {
      meetingID: meetingId,
      fullName: 'Test Trainer',
      password: moderatorPassword,
      redirect: 'true'
    };
    
    const trainerParamsString = Object.keys(trainerJoinParams)
      .sort()
      .map(key => `${key}=${trainerJoinParams[key as keyof typeof trainerJoinParams]}`)
      .join('&');
    
    const trainerChecksum = generateBBBChecksum('join', trainerParamsString, bbbApiSecret);
    const trainerJoinUrl = `${bbbServerUrl}/api/join?${trainerParamsString}&checksum=${trainerChecksum}`;
    
    // Generate student join URL
    const studentJoinParams = {
      meetingID: meetingId,
      fullName: 'Test Student',
      password: attendeePassword,
      redirect: 'true'
    };
    
    const studentParamsString = Object.keys(studentJoinParams)
      .sort()
      .map(key => `${key}=${studentJoinParams[key as keyof typeof studentJoinParams]}`)
      .join('&');
    
    const studentChecksum = generateBBBChecksum('join', studentParamsString, bbbApiSecret);
    const studentJoinUrl = `${bbbServerUrl}/api/join?${studentParamsString}&checksum=${studentChecksum}`;
    
    console.log('✅ Generated join URLs for same meeting');
    console.log('Trainer URL:', trainerJoinUrl);
    console.log('Student URL:', studentJoinUrl);
    
    return res.status(200).json({
      success: true,
      testClassId: testClassId,
      meetingId: meetingId,
      meetingCreated: meetingCreated,
      trainer: {
        joinUrl: trainerJoinUrl,
        params: trainerJoinParams,
        checksum: trainerChecksum
      },
      student: {
        joinUrl: studentJoinUrl,
        params: studentJoinParams,
        checksum: studentChecksum
      },
      passwords: {
        trainer: moderatorPassword,
        student: attendeePassword
      },
      verification: {
        sameMeetingId: trainerJoinParams.meetingID === studentJoinParams.meetingID,
        meetingIdUsed: meetingId
      },
      message: 'Both trainer and student should join the SAME meeting room - test by opening both URLs',
      instructions: [
        '1. Click "Copy Trainer URL" and open in one browser tab',
        '2. Click "Copy Student URL" and open in another browser tab', 
        '3. Both should join the same BigBlueButton meeting room',
        '4. If they get different session tokens, there is still an issue'
      ]
    });

  } catch (error: any) {
    console.error('Test error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}