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
    const { classId, userName, userType } = req.body;

    console.log('=== DIRECT BBB API JOIN ===');
    console.log('Class ID:', classId);
    console.log('User Name:', userName);
    console.log('User Type:', userType);

    if (!classId || !userName || !userType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: classId, userName, userType'
      });
    }

    await connectMongo();

    // Get class details
    const moduleClass = await ModuleClass.findById(classId);
    if (!moduleClass) {
      return res.status(404).json({
        success: false,
        error: 'Class not found'
      });
    }

    console.log('Found class:', moduleClass.moduleTitle);

    // BBB API configuration
    const bbbServerUrl = 'https://class.techpratham.org/bigbluebutton';
    const bbbApiSecret = '77NxbTZnnrkERic8MBiqK5yOsUdMtmFjdgSmqr4Nj4';
    
    // Generate consistent meeting parameters (same for all users of this class)
    const meetingId = `class-${classId}`;  // Remove timestamp to keep same meeting
    const attendeePassword = 'student123';   // Fixed password for all students
    const moderatorPassword = 'trainer123';  // Fixed password for all trainers
    
    // Update class status if trainer is joining
    if (userType === 'trainer' || userType === 'moderator') {
      await ModuleClass.findByIdAndUpdate(classId, {
        status: 'live',
        isLive: true,
        actualStartTime: new Date(),
        bbbMeetingId: meetingId,
        bbbAttendeePassword: attendeePassword,
        bbbModeratorPassword: moderatorPassword
      });
      console.log('Updated class status to live');
    }

    // Initialize meeting creation flag
    let meetingCreated = false;

    // Enhanced meeting existence check - get meeting info to verify it's the same meeting
    let meetingExists = false;
    let actualMeetingId = null;
    
    try {
      // Check if meeting is running and get its info
      const getMeetingInfoParams = `meetingID=${meetingId}`;
      const getMeetingInfoChecksum = generateBBBChecksum('getMeetingInfo', getMeetingInfoParams, bbbApiSecret);
      const getMeetingInfoUrl = `${bbbServerUrl}/api/getMeetingInfo?meetingID=${encodeURIComponent(meetingId)}&checksum=${getMeetingInfoChecksum}`;
      
      console.log('Getting meeting info for:', meetingId);
      
      const infoResponse = await fetch(getMeetingInfoUrl);
      const infoXML = await infoResponse.text();
      
      console.log('Meeting info response:', infoXML);
      
      if (infoXML.includes('<returncode>SUCCESS</returncode>')) {
        // Meeting exists - extract the actual meeting ID from response
        const meetingIdMatch = infoXML.match(/<meetingID><!\[CDATA\[(.*?)\]\]><\/meetingID>/);
        actualMeetingId = meetingIdMatch ? meetingIdMatch[1] : meetingId;
        meetingExists = true;
        meetingCreated = false;
        console.log(`Meeting exists with ID: ${actualMeetingId}`);
      } else {
        console.log('Meeting does not exist yet');
      }
    } catch (error) {
      console.log('Error checking meeting info:', error);
    }

    // Only create meeting if it doesn't exist
    if (!meetingExists) {
      try {
        // Create meeting parameters
        const createParams = {
          meetingID: meetingId,
          name: moduleClass.moduleTitle,  // Use consistent class name
          attendeePW: attendeePassword,
          moderatorPW: moderatorPassword,
          welcome: `Welcome to ${moduleClass.moduleTitle}! Please wait for the instructor to start the class.`,
          record: 'true',  // Enable recording
          autoStartRecording: userType === 'trainer' || userType === 'moderator' ? 'true' : 'false',  // Auto-start only for trainers
          allowStartStopRecording: 'true',  // Allow trainers to control recording
          logoutURL: 'https://class.techpratham.org'
        };
        
        // Sort parameters for checksum
        const sortedKeys = Object.keys(createParams).sort();
        const paramsString = sortedKeys
          .map(key => `${key}=${encodeURIComponent(createParams[key as keyof typeof createParams])}`)
          .join('&');
        
        // Generate checksum for create API call
        const createChecksum = generateBBBChecksum('create', paramsString, bbbApiSecret);
        
        // Build create URL
        const createUrl = `${bbbServerUrl}/api/create?${paramsString}&checksum=${createChecksum}`;
        
        console.log('Creating new meeting:', meetingId);
        
        // Make create API call
        const createResponse = await fetch(createUrl);
        const createXML = await createResponse.text();
        
        console.log('Create response:', createXML);
        
        if (createXML.includes('<returncode>SUCCESS</returncode>')) {
          meetingCreated = true;
          console.log('New meeting created successfully');
        } else if (createXML.includes('<messageKey>idNotUnique</messageKey>')) {
          // Meeting already exists, that's fine
          meetingCreated = false;
          console.log('Meeting already exists (race condition), proceeding with join');
        } else {
          throw new Error('Failed to create meeting: ' + createXML);
        }
      } catch (createError: any) {
        console.log('Meeting creation error:', createError.message);
        // Continue anyway - maybe the meeting exists due to race condition
      }
    }

    // Determine password based on user type
    const password = (userType === 'trainer' || userType === 'moderator') 
      ? moderatorPassword 
      : attendeePassword;

    console.log('Using password for', userType, ':', password ? 'SET' : 'NOT SET');

    // Validate all required variables before proceeding
    if (!meetingId || !attendeePassword || !moderatorPassword) {
      throw new Error(`Missing meeting parameters: meetingId=${meetingId}, attendeePassword=${!!attendeePassword}, moderatorPassword=${!!moderatorPassword}`);
    }

    if (!password) {
      throw new Error(`Password not set for user type: ${userType}`);
    }

    console.log('All parameters validated:', {
      meetingId: meetingId,
      userName: userName,
      userType: userType,
      passwordSet: !!password
    });

    // Use the confirmed meeting ID (either existing or newly created)
    const finalMeetingId = actualMeetingId || meetingId;
    
    // Generate join URL with proper parameter encoding
    const joinParams = {
      meetingID: finalMeetingId,
      fullName: userName,
      password: password,
      redirect: 'true'
    };
    
    // Sort parameters for checksum (unencoded)
    const sortedJoinKeys = Object.keys(joinParams).sort();
    const joinParamsStringForChecksum = sortedJoinKeys
      .map(key => `${key}=${joinParams[key as keyof typeof joinParams]}`)
      .join('&');
    
    // Generate checksum for join API call
    const joinChecksum = generateBBBChecksum('join', joinParamsStringForChecksum, bbbApiSecret);
    
    // Build join URL with encoded parameters
    const joinParamsStringForUrl = sortedJoinKeys
      .map(key => `${key}=${encodeURIComponent(joinParams[key as keyof typeof joinParams])}`)
      .join('&');
    
    // Build join URL
    const joinUrl = `${bbbServerUrl}/api/join?${joinParamsStringForUrl}&checksum=${joinChecksum}`;
    
    console.log('=== JOIN URL GENERATION DEBUG ===');
    console.log('Original Meeting ID:', meetingId);
    console.log('Final Meeting ID:', finalMeetingId);
    console.log('User Name:', userName);
    console.log('User Type:', userType);
    console.log('Password:', password);
    console.log('Join Parameters:', joinParams);
    console.log('Params String for Checksum:', joinParamsStringForChecksum);
    console.log('Join Checksum:', joinChecksum);
    console.log('Final Join URL:', joinUrl);
    console.log('Meeting Exists:', meetingExists);
    console.log('Meeting Created:', meetingCreated);
    console.log('===================================');

    // Also provide fallback options that actually exist on your server
    const fallbackUrls = [
      {
        name: 'Direct Join',
        url: joinUrl,
        description: 'Direct BBB API join'
      },
      {
        name: 'Meeting Info',
        url: (() => {
          const infoParamsForChecksum = `meetingID=${finalMeetingId}`;
          const infoParamsForUrl = `meetingID=${encodeURIComponent(finalMeetingId)}`;
          const infoChecksum = generateBBBChecksum('getMeetingInfo', infoParamsForChecksum, bbbApiSecret);
          return `${bbbServerUrl}/api/getMeetingInfo?${infoParamsForUrl}&checksum=${infoChecksum}`;
        })(),
        description: 'Check meeting status'
      },
      {
        name: 'BBB Home',
        url: 'https://class.techpratham.org',
        description: 'BigBlueButton home page'
      }
    ];

    return res.status(200).json({
      success: true,
      joinUrl: joinUrl,
      meetingId: finalMeetingId,
      originalMeetingId: meetingId,
      className: moduleClass.moduleTitle,
      userType: userType,
      meetingCreated: meetingCreated,
      meetingExists: meetingExists,
      fallbackUrls: fallbackUrls,
      message: 'Direct BBB API join (no authentication required)',
      debug: {
        classId: classId,
        meetingId: finalMeetingId,
        originalMeetingId: meetingId,
        attendeePassword: attendeePassword,
        moderatorPassword: moderatorPassword,
        serverUrl: bbbServerUrl,
        actualMeetingId: actualMeetingId
      }
    });

  } catch (error: any) {
    console.error('=== DIRECT BBB API ERROR ===');
    console.error(error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to generate BBB join URL: ' + error.message
    });
  }
}