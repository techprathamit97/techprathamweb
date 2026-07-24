import { NextApiRequest, NextApiResponse } from 'next';
import { connectMongo } from '@/utils/mongodb';
import crypto from 'crypto';
import ModuleClass from '@/models/ModuleClass';

// Simple in-memory rate limiting to prevent rapid multiple clicks
const joinAttempts = new Map<string, number>();
const RATE_LIMIT_WINDOW = 10000; // 10 seconds
const MAX_ATTEMPTS = 2; // Max 2 join attempts per 10 seconds per user+class

function isRateLimited(userId: string, classId: string): boolean {
  const key = `${userId}-${classId}`;
  const now = Date.now();
  
  const lastAttempt = joinAttempts.get(key) || 0;
  if (now - lastAttempt < RATE_LIMIT_WINDOW) {
    return true; // Rate limited
  }
  
  joinAttempts.set(key, now);
  
  // Clean up old entries periodically
  if (joinAttempts.size > 1000) {
    for (const [k, timestamp] of joinAttempts.entries()) {
      if (now - timestamp > RATE_LIMIT_WINDOW * 2) {
        joinAttempts.delete(k);
      }
    }
  }
  
  return false;
}

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
    const { classId, userName, userType, sessionToken: incomingSessionToken, studentId } = req.body;
    let sessionToken = incomingSessionToken;

    console.log('=== DIRECT BBB API JOIN ===');
    console.log('Class ID:', classId);
    console.log('User Name:', userName);
    console.log('User Type:', userType);
    console.log('Session Token:', sessionToken);

    if (!classId || !userName || !userType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: classId, userName, userType'
      });
    }

    // Rate limiting check to prevent rapid multiple joins
    const userId = studentId || userName;
    if (isRateLimited(userId, classId)) {
      console.log('🚫 RATE LIMITED: Too many join attempts');
      return res.status(429).json({
        success: false,
        error: 'Please wait 10 seconds before trying to join again. This prevents duplicate joins.',
        rateLimited: true,
        message: 'Rate limit exceeded - please wait before retrying'
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

    // Check if there's a stored meeting in the database
    const storedMeetingId = moduleClass.bbbMeetingId;

    // PREVENT DUPLICATE JOINS - Check if user is already in meeting
    // Use sessionToken to track if user has already joined this specific class
    try {
      const bbbServerUrl = process.env.BIGBLUEBUTTON_SERVER_URL;
      const bbbApiSecret = process.env.BIGBLUEBUTTON_API_SECRET;

      if (bbbServerUrl && bbbApiSecret) {
        const normalizedServerUrl = bbbServerUrl.replace(/\/$/, '');
        const apiUrl = normalizedServerUrl.endsWith('/api') ? normalizedServerUrl : `${normalizedServerUrl}/api`;

        // Enforce session token consistency - always use the token from database if it exists
        const moduleClass = await ModuleClass.findById(classId);
        if (moduleClass && studentId) {
          console.log('Checking for existing session token mapping...');
          console.log('Incoming sessionToken:', sessionToken);
          console.log('Student ID:', studentId);
          
          // Find existing token mapping for this student
          if (moduleClass.studentSessionTokens && moduleClass.studentSessionTokens.length > 0) {
            const mapping = moduleClass.studentSessionTokens.find(m => 
              m.studentId && String(m.studentId) === String(studentId)
            );
            
            if (mapping && mapping.sessionToken) {
              // STRICT ENFORCEMENT: Always use the database token for consistency
              if (sessionToken && sessionToken !== mapping.sessionToken) {
                console.log(`⚠️ ENFORCING DATABASE TOKEN! Client: ${sessionToken}, Database: ${mapping.sessionToken}`);
                console.log('Client must use the authoritative database token');
                return res.status(400).json({
                  success: false,
                  error: `Session token mismatch. You must use the assigned token: ${mapping.sessionToken}`,
                  correctSessionToken: mapping.sessionToken,
                  clientProvidedToken: sessionToken,
                  enforcedToken: true,
                  message: 'Please refresh the page and try again with the correct session token'
                });
              }
              sessionToken = mapping.sessionToken;
              console.log('✅ Using existing session token from database:', sessionToken);
            } else {
              console.log('No existing token mapping found for student:', studentId);
            }
          } else {
            console.log('No studentSessionTokens found in moduleClass');
          }
          
          // CRITICAL CHECK: If sessionToken is in joinedSessionTokens, this student has already joined
          if (sessionToken && moduleClass.joinedSessionTokens && moduleClass.joinedSessionTokens.includes(sessionToken)) {
            console.log('🚫 BLOCKED: Session token already in joinedSessionTokens');
            return res.status(400).json({
              success: false,
              error: `Your session token "${sessionToken}" has already joined this meeting. You cannot join multiple times.`,
              alreadyJoined: true,
              duplicateType: 'session_already_joined',
              sessionToken: sessionToken,
              message: 'Session token already used for this meeting'
            });
          }
        }

        // Check BBB meeting participants to prevent duplicates
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

          // STRICT DUPLICATE PREVENTION: Check if this exact session token is already in the meeting
          if (sessionToken) {
            const expectedUserName = `${userName}-${sessionToken}`.toLowerCase();
            const hasExactMatch = existingNames.some(name => name === expectedUserName);

            if (hasExactMatch) {
              console.log('🚫 BLOCKED: User with exact same session token already in meeting');
              return res.status(400).json({
                success: false,
                error: `You are already in this meeting! A user with the same session token "${sessionToken}" is already connected.`,
                alreadyJoined: true,
                duplicateType: 'exact_token_match',
                meetingId: meetingId,
                message: 'Duplicate join blocked - same session token already active in meeting'
              });
            }

            // Also check for any participant with the same session token (regardless of name prefix)
            const hasTokenMatch = existingNames.some(name => {
              const nameTokenMatch = name.match(/-([a-z0-9]+)$/);
              return nameTokenMatch && nameTokenMatch[1] === sessionToken;
            });

            if (hasTokenMatch) {
              console.log('🚫 BLOCKED: Session token already in use in meeting');
              return res.status(400).json({
                success: false,
                error: `Your session token "${sessionToken}" is already being used in this meeting. Please wait for your existing session to end or contact support.`,
                alreadyJoined: true,
                duplicateType: 'token_in_use',
                meetingId: meetingId,
                sessionToken: sessionToken,
                message: 'Duplicate join blocked - session token already in use'
              });
            }
          }

          console.log(`✅ Duplicate check passed. User "${userName}" can join meeting with ${existingNames.length} existing participants.`);
        }
      }
    } catch (duplicateCheckError) {
      console.log('Duplicate check failed, proceeding with join:', duplicateCheckError);
      // Continue with join if duplicate check fails
    }

    // If class is not live, check if there's still an active BBB meeting before clearing
    const isClassLive = moduleClass.status === 'live' && moduleClass.isLive === true;
    let currentMeetingId = moduleClass.bbbMeetingId || '';

    if (!isClassLive && moduleClass.bbbMeetingId) {
      // Before clearing, verify if the meeting is actually still running on BBB
      const bbbServerUrl = process.env.BIGBLUEBUTTON_SERVER_URL;
      const bbbApiSecret = process.env.BIGBLUEBUTTON_API_SECRET;

      if (bbbServerUrl && bbbApiSecret) {
        const normalizedServerUrl = bbbServerUrl.replace(/\/$/, '');
        const apiUrl = normalizedServerUrl.endsWith('/api') ? normalizedServerUrl : `${normalizedServerUrl}/api`;

        try {
          const getMeetingInfoParams = `meetingID=${encodeURIComponent(moduleClass.bbbMeetingId)}`;
          const getMeetingInfoChecksum = generateBBBChecksum('getMeetingInfo', getMeetingInfoParams, bbbApiSecret);
          const getMeetingInfoUrl = `${apiUrl}/getMeetingInfo?${getMeetingInfoParams}&checksum=${getMeetingInfoChecksum}`;

          const infoResponse = await fetch(getMeetingInfoUrl);
          const infoXML = await infoResponse.text();

          // Check if meeting is still running
          if (infoXML.includes('<returncode>SUCCESS</returncode>') &&
              !infoXML.includes('<ended>true</ended>') &&
              !infoXML.includes('meetingForciblyEnded')) {
            // Meeting is still active on BBB - DON'T clear the meeting ID
            console.log('✅ Meeting is still active on BBB, keeping existing meeting ID:', moduleClass.bbbMeetingId);
            currentMeetingId = moduleClass.bbbMeetingId;
          } else {
            // Meeting has ended - clear and create new one
            console.log('Meeting has ended on BBB - will create new meeting ID');
            await ModuleClass.findByIdAndUpdate(classId, {
              bbbMeetingId: null,
              status: 'scheduled',
              isLive: false
            });
            currentMeetingId = '';
            console.log('Cleared old meeting ID, will create new one');
          }
        } catch (error) {
          console.log('Error checking meeting status, proceeding with caution:', error);
          // If we can't verify, keep the existing meeting ID to allow rejoin
          currentMeetingId = moduleClass.bbbMeetingId;
        }
      } else {
        // No BBB config, clear the meeting ID
        await ModuleClass.findByIdAndUpdate(classId, {
          bbbMeetingId: null,
          status: 'scheduled',
          isLive: false
        });
        currentMeetingId = '';
      }
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
          // Meeting exists and is active - REUSE the existing meeting!
          const meetingIdMatch = infoXML.match(/<meetingID><!\[CDATA\[(.*?)\]\]><\/meetingID>/);
          actualMeetingId = meetingIdMatch ? meetingIdMatch[1] : meetingId;
          meetingExists = true;
          meetingCreated = false;
          console.log(`Reusing existing meeting with ID: ${actualMeetingId}`);

          // Keep using the stored meeting ID (don't generate new one)
          meetingId = storedMeetingId || meetingId;
        }
      } else if (infoXML.includes('notFound') || infoXML.includes('No such meeting')) {
        console.log('Meeting not found in BBB - will create new meeting');
        // Only create new if no stored meeting ID exists
        if (storedMeetingId) {
          meetingId = storedMeetingId;
          console.log('Using stored meeting ID:', meetingId);
        }
        meetingExists = false;
      } else {
        console.log('Meeting does not exist yet');
        // Use stored meeting ID if available
        if (storedMeetingId) {
          meetingId = storedMeetingId;
        }
      }
    } catch (error) {
      console.log('Error checking meeting info:', error);
    }

    // If meeting was ended, generate a new meeting ID ONLY if we don't have a valid stored one
    if (meetingEnded) {
      // Check if we should reuse stored meeting ID (for trainer rejoining)
      if (storedMeetingId && !storedMeetingId.includes('-ended')) {
        // Reuse stored meeting ID - it will auto-create on BBB when someone joins
        meetingId = storedMeetingId;
        console.log('Reusing stored meeting ID after end:', meetingId);

        // Update database to clear ended status
        await ModuleClass.findByIdAndUpdate(classId, {
          bbbMeetingId: meetingId,
          status: 'live',
          isLive: true
        });
      } else {
        meetingId = `class-${classId}-${Date.now()}`;
        console.log('Generated new meeting ID after ended:', meetingId);

        // Update the class with new meeting ID
        await ModuleClass.findByIdAndUpdate(classId, {
          bbbMeetingId: meetingId
        });
      }
    }

    // Only create meeting if it doesn't exist
    if (!meetingExists) {
      // IMPORTANT: For students, don't create meetings - they should only join existing ones
      if (userType === 'student') {
        console.log('🚫 Student trying to join non-existent meeting - blocking');
        return res.status(400).json({
          success: false,
          error: 'The class meeting has not been started yet. Please wait for your instructor to start the class before joining.',
          meetingNotStarted: true,
          userType: 'student',
          message: 'Students can only join meetings that have been started by the trainer'
        });
      }
      
      try {
        console.log('Creating new meeting for trainer/moderator');
        
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

    // Determine the final session token and full name to use for join
    // If userName contains a token suffix, extract base name
    let baseName = userName;
    const userNameTokenMatch = userName ? userName.match(/(.+?)-([a-z0-9]+)$/i) : null;
    if (userNameTokenMatch) {
      baseName = userNameTokenMatch[1];
    }

    // Ensure we have a sessionToken value (may have been set earlier from mapping)
    if (!sessionToken || typeof sessionToken !== 'string') {
      sessionToken = Math.random().toString(36).substring(2, 10);
      console.log('Generated fallback session token:', sessionToken);
    }

    // Final full name used for the meeting join (ensures server and BBB use same token)
    const finalFullName = `${baseName}-${sessionToken}`;

    // Helper function to create join URL
    const createJoinUrl = (meetingId: string): string => {
      const joinParams = {
        meetingID: meetingId,
        fullName: finalFullName,
        password: password,
        redirect: 'true'
      };

      console.log('=== JOIN URL GENERATION ===');
      console.log('Meeting ID:', meetingId);
      console.log('Full Name:', finalFullName);
      console.log('Password:', password);
      console.log('User Type:', userType);

      const sortedJoinKeys = Object.keys(joinParams).sort();
      
      // Use URL-encoded values for checksum
      const joinParamsForChecksum = sortedJoinKeys
        .map(key => `${key}=${encodeURIComponent(joinParams[key as keyof typeof joinParams])}`)
        .join('&');

      console.log('Join params for checksum:', joinParamsForChecksum);

      const joinChecksum = generateBBBChecksum('join', joinParamsForChecksum, bbbApiSecret);
      
      console.log('Generated join checksum:', joinChecksum);

      const joinUrl = `${apiUrl}/join?${joinParamsForChecksum}&checksum=${joinChecksum}`;
      
      console.log('Final join URL:', joinUrl);
      console.log('=== END JOIN URL GENERATION ===');

      return joinUrl;
    };

    // First, verify the meeting exists and is not forcibly ended before attempting join
    let needsNewMeeting = false;

    // Also check if earlier logic detected meetingEnded (for live classes)
    if (meetingEnded && !storedMeetingId) {
      console.log('Meeting was previously detected as ended with no stored ID, will create new meeting');
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

    // If meeting was ended or doesn't exist, create a new one BUT reuse stored meeting ID if available
    if (needsNewMeeting) {
      // Use stored meeting ID if available (for rejoin scenarios)
      if (storedMeetingId) {
        finalJoinMeetingId = storedMeetingId;
        console.log('Reusing stored meeting ID for rejoin:', finalJoinMeetingId);
      } else {
        finalJoinMeetingId = `${meetingId}-${Date.now()}`;
        console.log('Creating new meeting with ID:', finalJoinMeetingId);
      }

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

    // Track session token in database to prevent duplicates and enable rejoining
    if (sessionToken && userType === 'student') {
      try {
        // Add to set of tokens
        await ModuleClass.findByIdAndUpdate(classId, {
          $addToSet: { joinedSessionTokens: sessionToken }
        });

        // Also store mapping studentId -> sessionToken so the same student reuses token later
        if (studentId) {
          try {
            // Try to update existing mapping atomically
            const updateResult = await ModuleClass.findOneAndUpdate(
              { _id: classId, 'studentSessionTokens.studentId': studentId },
              { $set: { 'studentSessionTokens.$.sessionToken': sessionToken } },
              { new: true }
            );

            if (!updateResult) {
              // No existing mapping found, push a new one
              await ModuleClass.findByIdAndUpdate(classId, { $push: { studentSessionTokens: { studentId: studentId, sessionToken: sessionToken } } });
            }

            console.log('Upserted student->sessionToken mapping for student:', studentId, sessionToken);
          } catch (mapErr) {
            console.log('Failed to upsert studentSessionTokens mapping:', mapErr);
          }
        } else {
          console.log('No studentId provided; skipping studentSessionTokens mapping');
        }

        console.log('Tracked session token in database:', sessionToken);
      } catch (tokenError) {
        console.log('Failed to track session token:', tokenError);
        // Don't fail the join if token tracking fails
      }
    }

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
      sessionToken: sessionToken,
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