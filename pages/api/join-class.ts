import { NextApiRequest, NextApiResponse } from 'next';
import { connectMongo } from '@/utils/mongodb';
import crypto from 'crypto';
import ModuleClass from '@/models/ModuleClass';

// Helper function to generate BBB API checksum - IMPORTANT: Use URL-encoded params!
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
    console.log('Class status:', moduleClass.status);
    console.log('Stored bbbMeetingId:', moduleClass.bbbMeetingId);

    // Generate meeting ID early to check for duplicates
    let meetingId = moduleClass.bbbMeetingId || `class-${classId}`;
    
    // PREVENT DUPLICATE JOINS - Check if user is already in meeting
    try {
      const bbbServerUrl = process.env.BIGBLUEBUTTON_SERVER_URL;
      const bbbApiSecret = process.env.BIGBLUEBUTTON_API_SECRET;
      
      if (bbbServerUrl && bbbApiSecret) {
        const normalizedServerUrl = bbbServerUrl.replace(/\/$/, '');
        const apiUrl = normalizedServerUrl.endsWith('/api') ? normalizedServerUrl : `${normalizedServerUrl}/api`;
        
        // Check meeting participants to prevent duplicates
        const getMeetingInfoParams = `meetingID=${encodeURIComponent(meetingId)}`;
        const getMeetingInfoChecksum = generateBBBChecksum('getMeetingInfo', getMeetingInfoParams, bbbApiSecret);
        const getMeetingInfoUrl = `${apiUrl}/getMeetingInfo?${getMeetingInfoParams}&checksum=${getMeetingInfoChecksum}`;
        
        console.log('Checking for existing participants in meeting:', meetingId);
        
        const participantResponse = await fetch(getMeetingInfoUrl);
        const participantXML = await participantResponse.text();
        
        if (participantXML.includes('<returncode>SUCCESS</returncode>') && participantXML.includes('<attendees>')) {
          // Extract participant names from XML
          const attendeeMatches = participantXML.match(/<fullName><!\[CDATA\[(.*?)\]\]><\/fullName>/g) || [];
          const existingNames = attendeeMatches.map(match => 
            match.replace(/<fullName><!\[CDATA\[/, '').replace(/\]\]><\/fullName>/, '').toLowerCase()
          );
          
          console.log('Existing participants:', existingNames);
          console.log('Trying to join as:', userName.toLowerCase());
          
          // Check if user is already in meeting (exact match)
          if (existingNames.includes(userName.toLowerCase())) {
            console.log('⚠️ User already in meeting - preventing duplicate join');
            return res.status(400).json({
              success: false,
              error: `You are already in this meeting! Please check your other browser tabs or windows.`,
              alreadyJoined: true,
              meetingId: meetingId,
              message: 'Duplicate join prevented - exact name match'
            });
          }
          
          // Check for similar names (more strict matching to reduce false positives)
          const userFirstName = userName.toLowerCase().split(' ')[0];
          const similarName = existingNames.find(name => {
            const nameFirstName = name.split(' ')[0];
            // Only flag as similar if first names match exactly and are at least 3 characters
            return nameFirstName === userFirstName && userFirstName.length >= 3;
          });
          
          if (similarName) {
            console.log('⚠️ Similar name found in meeting - potential duplicate');
            return res.status(400).json({
              success: false,
              error: `A user with a similar name "${similarName}" is already in the meeting. If this is you, please check your other tabs.`,
              alreadyJoined: true,
              similarName: similarName,
              meetingId: meetingId,
              message: 'Potential duplicate join prevented - similar name match'
            });
          }
          
          // Additional check: Prevent rapid successive join attempts from same IP/user
          // (This could be enhanced with Redis/database for production)
          console.log(`✅ Duplicate check passed. User "${userName}" can join meeting with ${existingNames.length} existing participants.`);
        }
      }
    } catch (duplicateCheckError) {
      console.log('Duplicate check failed, proceeding with join:', duplicateCheckError);
      // Continue with join if duplicate check fails (don't block legitimate users)
    }

    // If class is not live or meeting ID is old, generate a new one
    const isClassLive = moduleClass.status === 'live' && moduleClass.isLive === true;
    let currentMeetingId = moduleClass.bbbMeetingId;
    if (!isClassLive && moduleClass.bbbMeetingId) {
      console.log('Class is not live - will generate new meeting ID');
      // Clear old meeting ID so a new one is created
      await ModuleClass.findByIdAndUpdate(classId, {
        bbbMeetingId: null,
        status: 'scheduled',
        isLive: false
      });
      // Clear the local variable so a new meeting ID is generated
      
      console.log('Cleared old meeting ID, will create new one');
    }

    // BBB API configuration from environment
    const bbbServerUrl = process.env.BIGBLUEBUTTON_SERVER_URL;
    const bbbApiSecret = process.env.BIGBLUEBUTTON_API_SECRET;
    
    console.log('BBB Configuration:');
    console.log('Server URL:', bbbServerUrl);
    console.log('API Secret length:', bbbApiSecret?.length);
    
    if (!bbbServerUrl || !bbbApiSecret) {
      throw new Error('BigBlueButton configuration missing. Please set BIGBLUEBUTTON_SERVER_URL and BIGBLUEBUTTON_API_SECRET in .env.local');
    }
    
    // Normalize server URL and ensure proper API endpoint format (same as BBB library)
    const normalizedServerUrl = bbbServerUrl.replace(/\/$/, '');
    const apiUrl = normalizedServerUrl.endsWith('/api') ? normalizedServerUrl : `${normalizedServerUrl}/api`;
    console.log('Normalized server URL:', normalizedServerUrl);
    console.log('API URL:', apiUrl);
    
    // Generate meeting ID - use stored one if available, otherwise create new
    meetingId = currentMeetingId || `class-${classId}`;
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
    let meetingEnded = false;
    let actualMeetingId = null;

    try {
      // Check if meeting is running and get its info
      // Use URL-encoded meetingID for checksum
      const getMeetingInfoParams = `meetingID=${encodeURIComponent(meetingId)}`;
      const getMeetingInfoChecksum = generateBBBChecksum('getMeetingInfo', getMeetingInfoParams, bbbApiSecret);
      const getMeetingInfoUrl = `${apiUrl}/getMeetingInfo?${getMeetingInfoParams}&checksum=${getMeetingInfoChecksum}`;

      console.log('Getting meeting info for:', meetingId);

      const infoResponse = await fetch(getMeetingInfoUrl);
      const infoXML = await infoResponse.text();

      console.log('Meeting info response:', infoXML);

      if (infoXML.includes('<returncode>SUCCESS</returncode>')) {
        // Check if meeting has been forcibly ended - multiple detection methods
        const isEnded = infoXML.includes('<ended>true</ended>') ||
                       infoXML.includes('<ended>true</ended>') ||
                       infoXML.includes('meetingForciblyEnded') ||
                       infoXML.includes('forciblyEnded') ||
                       infoXML.includes('<status>') && infoXML.includes('ended');

        if (isEnded) {
          console.log('Meeting has been forcibly ended - will create new meeting');
          meetingEnded = true;
          meetingExists = false;
        } else {
          // Meeting exists and is active
          const meetingIdMatch = infoXML.match(/<meetingID><!\[CDATA\[(.*?)\]\]><\/meetingID>/);
          actualMeetingId = meetingIdMatch ? meetingIdMatch[1] : meetingId;
          meetingExists = true;
          meetingCreated = false;
          console.log(`Meeting exists with ID: ${actualMeetingId}`);
        }
      } else if (infoXML.includes('notFound') || infoXML.includes('No such meeting')) {
        console.log('Meeting not found in BBB - will create new meeting');
        meetingExists = false;
      } else {
        console.log('Meeting does not exist yet');
      }
    } catch (error) {
      console.log('Error checking meeting info:', error);
    }

    // If meeting was ended, generate a new meeting ID
    if (meetingEnded) {
      meetingId = `${meetingId}-${Date.now()}`;
      console.log('Generated new meeting ID after ended:', meetingId);

      // Update the class with new meeting ID
      await ModuleClass.findByIdAndUpdate(classId, {
        bbbMeetingId: meetingId
      });
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
        
        // Sort parameters for checksum (BBB requires alphabetical order)
        const sortedKeys = Object.keys(createParams).sort();
        
        // CRITICAL: Use URL-encoded values for checksum calculation (server-specific requirement)
        const paramsForChecksum = sortedKeys
          .map(key => `${key}=${encodeURIComponent(createParams[key as keyof typeof createParams])}`)
          .join('&');

        console.log('Create params for checksum (URL-encoded):', paramsForChecksum);
        console.log('Full checksum string:', `create${paramsForChecksum}${bbbApiSecret}`);

        // Generate checksum using URL-encoded parameter values
        const createChecksum = generateBBBChecksum('create', paramsForChecksum, bbbApiSecret);

        // The same encoded string is used for both checksum and URL
        const createUrl = `${apiUrl}/create?${paramsForChecksum}&checksum=${createChecksum}`;
        
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
    let finalJoinMeetingId = finalMeetingId;
    let joinUrl: string;

    // Helper function to create join URL
    const createJoinUrl = (meetingId: string): string => {
      const joinParams = {
        meetingID: meetingId,
        fullName: userName,
        password: password,
        redirect: 'true'
      };

      const sortedJoinKeys = Object.keys(joinParams).sort();
      
      // Use URL-encoded values for checksum
      const joinParamsForChecksum = sortedJoinKeys
        .map(key => `${key}=${encodeURIComponent(joinParams[key as keyof typeof joinParams])}`)
        .join('&');

      const joinChecksum = generateBBBChecksum('join', joinParamsForChecksum, bbbApiSecret);

      return `${apiUrl}/join?${joinParamsForChecksum}&checksum=${joinChecksum}`;
    };

    // First, verify the meeting exists and is not forcibly ended before attempting join
    let needsNewMeeting = false;

    // Also check if earlier logic detected meetingEnded (for live classes)
    if (meetingEnded) {
      console.log('Meeting was previously detected as ended, will create new meeting');
      needsNewMeeting = true;
    }

    // Additional verification check
    try {
      // Use URL-encoded meetingID for checksum
      const verifyMeetingParams = `meetingID=${encodeURIComponent(finalMeetingId)}`;
      const verifyMeetingChecksum = generateBBBChecksum('getMeetingInfo', verifyMeetingParams, bbbApiSecret);
      const verifyMeetingUrl = `${apiUrl}/getMeetingInfo?${verifyMeetingParams}&checksum=${verifyMeetingChecksum}`;

      const verifyResponse = await fetch(verifyMeetingUrl);
      const verifyXML = await verifyResponse.text();

      console.log('Verify meeting response:', verifyXML.substring(0, 500));

      // Check if meeting was forcibly ended
      if (verifyXML.includes('meetingForciblyEnded') ||
          verifyXML.includes('<ended>true</ended>') ||
          verifyXML.includes('forciblyEnded')) {
        console.log('Meeting was forcibly ended - will create new meeting');
        needsNewMeeting = true;
      } else if (verifyXML.includes('notFound') || verifyXML.includes('No such meeting')) {
        console.log('Meeting does not exist - will create new meeting');
        needsNewMeeting = true;
      }
    } catch (verifyError) {
      console.log('Error verifying meeting:', verifyError);
      // If we can't verify, try to create new meeting
      needsNewMeeting = true;
    }

    // If meeting was ended or doesn't exist, create a new one
    if (needsNewMeeting) {
      finalJoinMeetingId = `${meetingId}-${Date.now()}`;
      console.log('Creating new meeting with ID:', finalJoinMeetingId);

      // Create the new meeting
      const createParams = {
        meetingID: finalJoinMeetingId,
        name: moduleClass.moduleTitle,
        attendeePW: attendeePassword,
        moderatorPW: moderatorPassword,
        welcome: `Welcome to ${moduleClass.moduleTitle}!`,
        record: 'true',
        autoStartRecording: userType === 'trainer' || userType === 'moderator' ? 'true' : 'false',
        allowStartStopRecording: 'true',
        logoutURL: 'https://class.techpratham.org'
      };

      const sortedCreateKeys = Object.keys(createParams).sort();
      
      // Use URL-encoded values for checksum (server requirement)
      const createParamsForChecksum = sortedCreateKeys
        .map(key => `${key}=${encodeURIComponent(createParams[key as keyof typeof createParams])}`)
        .join('&');

      const createChecksum = generateBBBChecksum('create', createParamsForChecksum, bbbApiSecret);

      // Same encoded string for URL
      const createUrl = `${apiUrl}/create?${createParamsForChecksum}&checksum=${createChecksum}`;

      const createResponse = await fetch(createUrl);
      const createXML = await createResponse.text();

      if (createXML.includes('<returncode>SUCCESS</returncode>')) {
        console.log('New meeting created successfully:', finalJoinMeetingId);
        meetingCreated = true;
      } else if (createXML.includes('<messageKey>idNotUnique</messageKey>')) {
        // Meeting ID already exists, still use it
        console.log('Meeting ID already exists, using existing meeting');
      } else {
        console.log('Create response:', createXML);
      }

      // Update class with new meeting ID
      await ModuleClass.findByIdAndUpdate(classId, {
        bbbMeetingId: finalJoinMeetingId,
        status: 'live',
        isLive: true,
        bbbAttendeePassword: attendeePassword,
        bbbModeratorPassword: moderatorPassword
      });
    }

    joinUrl = createJoinUrl(finalJoinMeetingId);

    console.log('=== JOIN URL GENERATION DEBUG ===');
    console.log('Original Meeting ID:', meetingId);
    console.log('Final Meeting ID:', finalJoinMeetingId);
    console.log('User Name:', userName);
    console.log('User Type:', userType);
    console.log('Password:', password ? 'SET' : 'NOT SET');
    console.log('Final Join URL:', joinUrl);
    console.log('Meeting Exists:', meetingExists);
    console.log('Meeting Created:', meetingCreated);
    console.log('Needed New Meeting:', needsNewMeeting);
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
          // Use URL-encoded meetingID for checksum
          const infoParamsForChecksum = `meetingID=${encodeURIComponent(finalJoinMeetingId)}`;
          const infoChecksum = generateBBBChecksum('getMeetingInfo', infoParamsForChecksum, bbbApiSecret);
          return `${apiUrl}/getMeetingInfo?${infoParamsForChecksum}&checksum=${infoChecksum}`;
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
      meetingId: finalJoinMeetingId,
      originalMeetingId: meetingId,
      className: moduleClass.moduleTitle,
      userType: userType,
      meetingCreated: meetingCreated,
      meetingExists: meetingExists,
      fallbackUrls: fallbackUrls,
      message: 'Direct BBB API join (no authentication required)',
      debug: {
        classId: classId,
        meetingId: finalJoinMeetingId,
        originalMeetingId: meetingId,
        attendeePassword: attendeePassword,
        moderatorPassword: moderatorPassword,
        serverUrl: apiUrl,
        needsNewMeeting: needsNewMeeting,
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