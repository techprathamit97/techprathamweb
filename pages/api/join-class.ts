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

// Helper function to cleanup stale "live" classes and detect ended sessions
async function cleanupStaleClasses() {
  console.log('🧹 CLEANUP: Checking for stale live classes and ended sessions');
  
  try {
    const bbbServerUrl = process.env.BIGBLUEBUTTON_SERVER_URL;
    const bbbApiSecret = process.env.BIGBLUEBUTTON_API_SECRET;
    
    if (!bbbServerUrl || !bbbApiSecret) {
      console.log('🧹 CLEANUP: BBB config not available, skipping cleanup');
      return;
    }
    
    // Find all classes marked as live
    const liveClasses = await ModuleClass.find({
      status: 'live',
      isLive: true,
      bbbMeetingId: { $exists: true, $ne: null }
    });
    
    console.log(`🧹 CLEANUP: Found ${liveClasses.length} classes marked as live`);
    
    if (liveClasses.length === 0) return;
    
    const normalizedServerUrl = bbbServerUrl.replace(/\/$/, '');
    const apiUrl = normalizedServerUrl.endsWith('/api') ? normalizedServerUrl : `${normalizedServerUrl}/api`;
    
    let cleanedUp = 0;
    
    for (const cls of liveClasses) {
      try {
        // Check if meeting is still active on BBB
        const getMeetingInfoParams = `meetingID=${encodeURIComponent(cls.bbbMeetingId)}`;
        const getMeetingInfoChecksum = generateBBBChecksum('getMeetingInfo', getMeetingInfoParams, bbbApiSecret);
        const getMeetingInfoUrl = `${apiUrl}/getMeetingInfo?${getMeetingInfoParams}&checksum=${getMeetingInfoChecksum}`;
        
        const response = await fetch(getMeetingInfoUrl);
        const xml = await response.text();
        
        console.log(`🧹 CLEANUP: Checking meeting ${cls.bbbMeetingId} - Status: ${response.status}`);
        
        // If meeting doesn't exist, has ended, or was forcibly ended, mark class as completed
        if (xml.includes('notFound') || xml.includes('No such meeting') || 
            xml.includes('<ended>true</ended>') || xml.includes('meetingForciblyEnded') ||
            xml.includes('hasBeenForciblyEnded>true') || xml.includes('forciblyEnded')) {
          
          console.log(`🧹 CLEANUP: Meeting ${cls.bbbMeetingId} ended (forcibly or naturally), marking class as completed`);
          
          // Mark class as completed and clear live flags
          await ModuleClass.findByIdAndUpdate(cls._id, {
            status: 'completed',
            isLive: false,
            actualEndTime: new Date(),
            // Clear session tokens to prevent join issues
            $unset: { 
              joinedSessionTokens: 1,
              studentSessionTokens: 1 
            }
          });
          
          console.log(`✅ CLEANUP: Class ${cls.moduleTitle} marked as completed`);
          cleanedUp++;
        } else if (xml.includes('<returncode>SUCCESS</returncode>')) {
          // Meeting exists and is active - check if it actually has participants
          const participantCount = xml.match(/<participantCount>(\d+)<\/participantCount>/);
          const moderatorCount = xml.match(/<moderatorCount>(\d+)<\/moderatorCount>/);
          
          const participants = participantCount ? parseInt(participantCount[1]) : 0;
          const moderators = moderatorCount ? parseInt(moderatorCount[1]) : 0;
          
          console.log(`🧹 CLEANUP: Meeting ${cls.bbbMeetingId} active with ${participants} participants, ${moderators} moderators`);
          
          // If no moderators (trainers) left in meeting, mark as completed
          if (moderators === 0 && participants === 0) {
            console.log(`🧹 CLEANUP: Meeting ${cls.bbbMeetingId} has no participants, marking as completed`);
            
            await ModuleClass.findByIdAndUpdate(cls._id, {
              status: 'completed',
              isLive: false,
              actualEndTime: new Date(),
              $unset: { 
                joinedSessionTokens: 1,
                studentSessionTokens: 1 
              }
            });
            
            cleanedUp++;
          }
        }
      } catch (error) {
        console.log(`🧹 CLEANUP: Error checking meeting ${cls.bbbMeetingId}:`, error);
      }
    }
    
    if (cleanedUp > 0) {
      console.log(`🧹 CLEANUP: Cleaned up ${cleanedUp} ended/stale live classes`);
    }
  } catch (error) {
    console.error('🧹 CLEANUP: Error during cleanup:', error);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectMongo();
    
    // Run comprehensive cleanup before processing any join request
    await cleanupStaleClasses();

    let { classId, userName, userType, sessionToken: incomingSessionToken, studentId, forceRejoin } = req.body;
    let sessionToken = incomingSessionToken;

    console.log('=== DIRECT BBB API JOIN ===');
    console.log('Class ID:', classId);
    console.log('User Name:', userName);
    console.log('User Type:', userType);
    console.log('Session Token:', sessionToken);
    console.log('Force Rejoin:', forceRejoin);

    if (!classId || !userName || !userType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: classId, userName, userType'
      });
    }

    // Rate limiting check to prevent rapid multiple joins
    // Skip rate limiting for forceRejoin requests to allow immediate rejoining
    const userId = studentId || userName;
    if (!forceRejoin && isRateLimited(userId, classId)) {
      console.log('🚫 RATE LIMITED: Too many join attempts');
      return res.status(429).json({
        success: false,
        error: 'Please wait 10 seconds before trying to join again. This prevents duplicate joins.',
        rateLimited: true,
        message: 'Rate limit exceeded - please wait before retrying'
      });
    } else if (forceRejoin) {
      console.log('✅ FORCE REJOIN: Skipping rate limit check for rejoin request');
    }

    await connectMongo();
    
    // Clean up stale "live" classes before processing join request
    await cleanupStaleClasses();

    // Check if this is a timing-based class (virtual class)
    if (classId.startsWith('timing-')) {
      console.log('🎯 TIMING-BASED CLASS DETECTED');
      
      // Extract batch ID and date from timing-based class ID
      // Format: timing-{batchId}-{dateISO}
      const timingMatch = classId.match(/^timing-([a-f0-9]{24})-(.+)$/);
      if (!timingMatch) {
        return res.status(400).json({
          success: false,
          error: 'Invalid timing-based class ID format'
        });
      }
      
      const [, batchId, dateISO] = timingMatch;
      console.log('Extracted batch ID:', batchId);
      console.log('Extracted date:', dateISO);
      
      // Parse the date to get scheduledDate and scheduledTime
      const classDateTime = new Date(dateISO);
      const scheduledDate = classDateTime.toISOString().split('T')[0];
      const scheduledTime = `${classDateTime.getHours().toString().padStart(2, '0')}:${classDateTime.getMinutes().toString().padStart(2, '0')}`;
      
      console.log('Parsed scheduledDate:', scheduledDate);
      console.log('Parsed scheduledTime:', scheduledTime);
      
      // Check if a real class already exists for this batch and time
      const existingClass = await ModuleClass.findOne({
        batchId: batchId,
        scheduledDate: scheduledDate,
        scheduledTime: scheduledTime
      });
      
      if (existingClass) {
        console.log('✅ Found existing real class:', existingClass._id);
        // Use the existing class ID and continue with normal flow
        req.body.classId = existingClass._id.toString();
        classId = existingClass._id.toString();
      } else {
        console.log('🚫 No real class exists for this timing-based class');
        
        // Students CANNOT create classes - only trainers can
        if (userType === 'student') {
          console.log('🚫 Student trying to join non-existent timing-based class - BLOCKED');
          return res.status(400).json({
            success: false,
            error: 'The class meeting has not been started yet. Please wait for your trainer to start the class before joining.',
            meetingNotStarted: true,
            userType: 'student',
            timingBased: true,
            message: 'Students can only join meetings that have been started by the trainer'
          });
        }
        
        // Only trainers can create real classes from timing-based ones
        console.log('🆕 Trainer creating new real class from timing-based class');
        
        // Get batch information to determine course details
        const Batch = require('@/models/Batch');
        const batch = await Batch.findById(batchId).populate('trainerId').lean();
        if (!batch) {
          return res.status(404).json({
            success: false,
            error: 'Batch not found for timing-based class'
          });
        }
        
        console.log('Found batch:', batch.batchName);
        
        // Create a new real class in the database
        // Generate proper class sequence number by counting existing classes
        const existingClassCount = await ModuleClass.countDocuments({
          batchId: batchId,
          status: { $ne: 'cancelled' } // Don't count cancelled classes
        });
        
        const classNumber = existingClassCount + 1;
        const batchDisplayName = batch.batchName || batch.courseTitle || 'Class';
        
        const newClass = new ModuleClass({
          courseId: batchId, // Use batch ID as course reference for simplicity
          batchId: batchId,
          trainerId: batch.trainerId?._id || batch.trainerId,
          moduleTitle: `${batchDisplayName} - Class ${classNumber}`,
          moduleIndex: classNumber,
          scheduledDate: scheduledDate,
          scheduledTime: scheduledTime,
          duration: 60,
          status: 'scheduled',
          createdAt: new Date(),
          updatedAt: new Date(),
          timingBased: true // Mark as created from timing
        });
        
        await newClass.save();
        console.log('✅ Created new real class:', newClass._id);
        
        // Update the classId to use the new real class
        req.body.classId = newClass._id.toString();
        classId = newClass._id.toString();
      }
    }

    // Get class details (now guaranteed to be a real class)
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

    // If class is completed, clear old session tokens to allow rejoining
    if (moduleClass.status === 'completed') {
      console.log('🧹 Class is completed - clearing old session tokens');
      await ModuleClass.findByIdAndUpdate(classId, {
        $unset: { 
          joinedSessionTokens: 1,
          studentSessionTokens: 1 
        }
      });
      console.log('✅ Cleared session tokens for completed class');
      
      // Refresh the moduleClass object
      const refreshedClass = await ModuleClass.findById(classId);
      if (refreshedClass) {
        Object.assign(moduleClass, refreshedClass.toObject());
      }
    }

    // Generate meeting ID early to check for duplicates
    let meetingId = moduleClass.bbbMeetingId || `class-${classId}`;
    let meetingExists = false;
    let meetingEnded = false;
    let actualMeetingId: string | null = null;

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
          console.log('Force Rejoin:', forceRejoin);
          
          // Find existing token mapping for this student
          if (moduleClass.studentSessionTokens && moduleClass.studentSessionTokens.length > 0) {
            const mapping = moduleClass.studentSessionTokens.find(m => 
              m.studentId && String(m.studentId) === String(studentId)
            );
            
            if (mapping && mapping.sessionToken) {
              // If forceRejoin is true, generate a NEW session token instead of reusing the old one
              if (forceRejoin) {
                console.log('🔄 FORCE REJOIN: Generating new session token instead of reusing database token');
                const newSessionToken = Math.random().toString(36).substring(2, 10);
                console.log('Generated new session token for rejoin:', newSessionToken);
                
                // Update the student's token mapping with the new token
                await ModuleClass.findOneAndUpdate(
                  { _id: classId, 'studentSessionTokens.studentId': studentId },
                  { $set: { 'studentSessionTokens.$.sessionToken': newSessionToken } }
                );
                
                sessionToken = newSessionToken;
                console.log('✅ Updated student session token mapping for rejoin:', sessionToken);
              } else {
                // Normal flow - check for token mismatch and use existing token
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
              }
            } else {
              console.log('No existing token mapping found for student:', studentId);
            }
          } else {
            console.log('No studentSessionTokens found in moduleClass');
          }
          
          // CRITICAL CHECK: If sessionToken is in joinedSessionTokens, this student has already joined
          // Skip this check if forceRejoin is true since we already generated a new token
          if (!forceRejoin && sessionToken && moduleClass.joinedSessionTokens && moduleClass.joinedSessionTokens.includes(sessionToken)) {
            console.log('🚫 BLOCKED: Session token already in joinedSessionTokens');
            
            // Before showing duplicate error, check if meeting still exists on BBB server
            // This prevents showing "already joined" when trainer has actually left
            try {
              const bbbServerUrl = process.env.BIGBLUEBUTTON_SERVER_URL;
              const bbbApiSecret = process.env.BIGBLUEBUTTON_API_SECRET;
              
              if (bbbServerUrl && bbbApiSecret && moduleClass.bbbMeetingId) {
                const normalizedServerUrl = bbbServerUrl.replace(/\/$/, '');
                const apiUrl = normalizedServerUrl.endsWith('/api') ? normalizedServerUrl : `${normalizedServerUrl}/api`;
                
                const getMeetingInfoParams = `meetingID=${encodeURIComponent(moduleClass.bbbMeetingId)}`;
                const getMeetingInfoChecksum = generateBBBChecksum('getMeetingInfo', getMeetingInfoParams, bbbApiSecret);
                const getMeetingInfoUrl = `${apiUrl}/getMeetingInfo?${getMeetingInfoParams}&checksum=${getMeetingInfoChecksum}`;
                
                const meetingCheckResponse = await fetch(getMeetingInfoUrl);
                const meetingCheckXML = await meetingCheckResponse.text();
                
                if (meetingCheckXML.includes('notFound') || meetingCheckXML.includes('No such meeting')) {
                  console.log('🎯 Meeting no longer exists - trainer has left');
                  return res.status(400).json({
                    success: false,
                    error: 'The trainer has left the meeting or it has ended. Please wait for your trainer to start a new class session.',
                    meetingNotStarted: true,
                    userType: 'student',
                    trainerLeft: true,
                    meetingEnded: true,
                    message: 'Meeting no longer exists - trainer must restart'
                  });
                }
              }
            } catch (meetingCheckError) {
              console.log('Error checking meeting existence:', meetingCheckError);
            }
            
            return res.status(400).json({
              success: false,
              error: `Your session token "${sessionToken}" has already joined this meeting. You cannot join multiple times.`,
              alreadyJoined: true,
              duplicateType: 'session_already_joined',
              sessionToken: sessionToken,
              message: 'Session token already used for this meeting'
            });
          } else if (forceRejoin) {
            console.log('✅ FORCE REJOIN: Skipping duplicate check due to new session token');
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
      
      // CRITICAL: Before creating/updating class, ensure only ONE live class per batch
      console.log('🎯 TRAINER JOIN: Ensuring single live class per batch');
      
      try {
        // Find any OTHER live classes for this batch and mark them as completed
        const otherLiveClasses = await ModuleClass.find({
          batchId: moduleClass.batchId,
          status: 'live',
          isLive: true,
          _id: { $ne: classId } // Exclude current class
        });
        
        console.log(`🎯 Found ${otherLiveClasses.length} other live classes for batch ${moduleClass.batchId}`);
        
        if (otherLiveClasses.length > 0) {
          for (const otherClass of otherLiveClasses) {
            console.log(`🔄 Marking previous live class as completed: ${otherClass.moduleTitle}`);
            
            await ModuleClass.findByIdAndUpdate(otherClass._id, {
              status: 'completed',
              isLive: false,
              actualEndTime: new Date(),
              // Clear session tokens to prevent join issues
              $unset: { 
                joinedSessionTokens: 1,
                studentSessionTokens: 1 
              }
            });
          }
          
          console.log(`✅ Cleaned up ${otherLiveClasses.length} previous live classes`);
        }
        
        // ADDITIONAL: Check if current class is ALREADY live - if so, don't create new meeting
        if (moduleClass.status === 'live' && moduleClass.isLive && moduleClass.bbbMeetingId) {
          console.log('🎯 TRAINER REJOIN: Current class is already live, reusing existing meeting');
          meetingId = moduleClass.bbbMeetingId;
          
          // Verify the existing meeting is still active on BBB
          try {
            const getMeetingInfoParams = `meetingID=${encodeURIComponent(meetingId)}`;
            const getMeetingInfoChecksum = generateBBBChecksum('getMeetingInfo', getMeetingInfoParams, bbbApiSecret);
            const getMeetingInfoUrl = `${apiUrl}/getMeetingInfo?${getMeetingInfoParams}&checksum=${getMeetingInfoChecksum}`;
            
            const verifyResponse = await fetch(getMeetingInfoUrl);
            const verifyXML = await verifyResponse.text();
            
            if (verifyXML.includes('<returncode>SUCCESS</returncode>') && 
                !verifyXML.includes('<ended>true</ended>') &&
                !verifyXML.includes('meetingForciblyEnded')) {
              
              console.log('✅ TRAINER REJOIN: Existing meeting is still active, allowing rejoin');
              meetingExists = true;
              
              // Skip the normal meeting creation flow - just prepare join URL
              // Continue to join URL generation at the end
            } else {
              console.log('⚠️ TRAINER REJOIN: Existing meeting has ended, will create new one');
              meetingExists = false;
              // Clear the ended meeting ID
              await ModuleClass.findByIdAndUpdate(classId, {
                bbbMeetingId: null
              });
              meetingId = `class-${classId}`;
            }
          } catch (verifyError) {
            console.log('⚠️ Error verifying existing meeting, will create new one:', verifyError);
            meetingExists = false;
            meetingId = `class-${classId}`;
          }
        } else {
          // Update current class as the ONLY live class for this batch
          await ModuleClass.findByIdAndUpdate(classId, {
            status: 'live',
            isLive: true,
            actualStartTime: new Date(),
            bbbMeetingId: meetingId,
            bbbAttendeePassword: attendeePassword,
            bbbModeratorPassword: moderatorPassword
          });
          console.log('✅ Updated current class as the single live class for batch');
        }
      } catch (cleanupError) {
        console.log('⚠️ Error cleaning up previous live classes:', cleanupError);
        
        // Continue with normal flow even if cleanup fails
        await ModuleClass.findByIdAndUpdate(classId, {
          status: 'live',
          isLive: true,
          actualStartTime: new Date(),
          bbbMeetingId: meetingId,
          bbbAttendeePassword: attendeePassword,
          bbbModeratorPassword: moderatorPassword
        });
      }
    }

    // Initialize meeting creation flag
    let meetingCreated = false;

    // Enhanced meeting existence check - get meeting info to verify it's the same meeting

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
        
        // ENHANCED: Check if trainer might be in a different meeting by scanning all active meetings
        let trainerFound = false;
        let activeMeetingId = null;
        
        try {
          console.log('🔍 Checking if trainer is in any other active meeting...');
          
          // Get all meetings on the BBB server to see if trainer is in a different one
          const getMeetingsParams = '';
          const getMeetingsChecksum = generateBBBChecksum('getMeetings', getMeetingsParams, bbbApiSecret);
          const getMeetingsUrl = `${apiUrl}/getMeetings?checksum=${getMeetingsChecksum}`;
          
          console.log('🔍 Calling getMeetings API:', getMeetingsUrl);
          
          const meetingsResponse = await fetch(getMeetingsUrl);
          const meetingsXML = await meetingsResponse.text();
          
          console.log('🔍 Active meetings response status:', meetingsResponse.status);
          console.log('🔍 Active meetings XML (first 1000 chars):', meetingsXML.substring(0, 1000));
          
          if (meetingsXML.includes('<returncode>SUCCESS</returncode>') && meetingsXML.includes('<meetings>')) {
            console.log('✅ Got successful meetings response');
            
            // Extract all meeting IDs and their participants
            const meetingMatches = meetingsXML.match(/<meeting>(.*?)<\/meeting>/gs) || [];
            console.log(`🔍 Found ${meetingMatches.length} active meetings`);
            
            // Get the batch information for the class student is trying to join
            const studentBatchId = moduleClass.batchId;
            console.log('🔍 Student trying to join batch:', studentBatchId);
            
            for (let i = 0; i < meetingMatches.length; i++) {
              const meetingMatch = meetingMatches[i];
              console.log(`🔍 Checking meeting ${i + 1}:`, meetingMatch.substring(0, 300));
              
              // Check if this meeting has moderators (trainers)
              if (meetingMatch.includes('<role>MODERATOR</role>')) {
                console.log(`✅ Meeting ${i + 1} has moderators`);
                
                // Extract meeting ID
                const meetingIdMatch = meetingMatch.match(/<meetingID><!\[CDATA\[(.*?)\]\]><\/meetingID>/);
                if (meetingIdMatch) {
                  const foundMeetingId = meetingIdMatch[1];
                  console.log(`🔍 Found meeting ID: ${foundMeetingId}`);
                  
                  // Try to find the class in database that corresponds to this meeting
                  try {
                    console.log('🔍 Looking for database class with meeting ID:', foundMeetingId);
                    const foundClass = await ModuleClass.findOne({ bbbMeetingId: foundMeetingId }).lean();
                    
                    if (foundClass) {
                      console.log('🔍 Found database class:', {
                        classId: foundClass._id,
                        batchId: foundClass.batchId,
                        moduleTitle: foundClass.moduleTitle,
                        meetingId: foundClass.bbbMeetingId
                      });
                      
                      // Check if this class belongs to the same batch as student's class
                      if (String(foundClass.batchId) === String(studentBatchId)) {
                        activeMeetingId = foundMeetingId;
                        trainerFound = true;
                        console.log('🎯 Found trainer in same batch meeting:', activeMeetingId);
                        console.log('🎯 Batch match confirmed:', { 
                          studentBatch: studentBatchId, 
                          trainerBatch: foundClass.batchId 
                        });
                        break;
                      } else {
                        console.log('❌ Different batch - Student:', studentBatchId, 'Trainer:', foundClass.batchId);
                      }
                    } else {
                      console.log('❌ No database class found for meeting:', foundMeetingId);
                      
                      // FALLBACK: If no database record found, try to match by meeting name pattern
                      const meetingNameMatch = meetingMatch.match(/<meetingName><!\[CDATA\[(.*?)\]\]><\/meetingName>/);
                      const meetingName = meetingNameMatch ? meetingNameMatch[1] : '';
                      console.log('🔍 Fallback: Checking meeting name for batch match:', meetingName);
                      
                      // Get the batch information from database to compare
                      const Batch = require('@/models/Batch');
                      const studentBatch = await Batch.findById(studentBatchId).lean();
                      
                      if (studentBatch) {
                        console.log('🔍 Student batch info:', {
                          id: studentBatch._id,
                          name: studentBatch.batchName,
                          course: studentBatch.course_title || studentBatch.courseTitle
                        });
                        
                        // Check if meeting name contains batch name or course title
                        const batchName = studentBatch.batchName || '';
                        const courseTitle = studentBatch.course_title || studentBatch.courseTitle || '';
                        
                        const nameMatchesBatch = meetingName.toLowerCase().includes(batchName.toLowerCase()) ||
                                               meetingName.toLowerCase().includes(courseTitle.toLowerCase()) ||
                                               (batchName.toLowerCase().includes('ayansh') && meetingName.toLowerCase().includes('ayansh')) ||
                                               (batchName.toLowerCase().includes('test') && meetingName.toLowerCase().includes('test'));
                        
                        console.log('🔍 Name matching results:', {
                          meetingName,
                          batchName,
                          courseTitle,
                          nameMatchesBatch
                        });
                        
                        if (nameMatchesBatch) {
                          activeMeetingId = foundMeetingId;
                          trainerFound = true;
                          console.log('🎯 Found trainer via name matching in batch meeting:', activeMeetingId);
                          break;
                        }
                      }
                    }
                  } catch (dbError) {
                    console.log('❌ Database lookup error for meeting:', foundMeetingId, dbError);
                  }
                }
              } else {
                console.log(`❌ Meeting ${i + 1} has no moderators`);
              }
            }
            
            console.log('🔍 Final scan results:', { trainerFound, activeMeetingId });
          } else {
            console.log('❌ Failed to get meetings or no meetings found');
            console.log('Response includes SUCCESS?', meetingsXML.includes('<returncode>SUCCESS</returncode>'));
            console.log('Response includes meetings?', meetingsXML.includes('<meetings>'));
          }
        } catch (scanError) {
          console.log('Error scanning for trainer in other meetings:', scanError);
        }
        
        // ADDITIONAL FALLBACK: If no match found via database, try direct batch check
        if (!trainerFound) {
          console.log('🔍 No database match found, trying direct batch comparison...');
          
          try {
            // Get all classes for the student's batch
            const allBatchClasses = await ModuleClass.find({ batchId: moduleClass.batchId }).lean();
            console.log(`🔍 Found ${allBatchClasses.length} classes in student's batch`);
            
            // Check if any of these classes match active meeting IDs
            const meetingsResponse = await fetch(`${apiUrl}/getMeetings?checksum=${generateBBBChecksum('getMeetings', '', bbbApiSecret)}`);
            if (meetingsResponse.ok) {
              const meetingsXML = await meetingsResponse.text();
              const activeMeetingIds: string[] = [];
              
              const meetingMatches = meetingsXML.match(/<meetingID><!\[CDATA\[(.*?)\]\]><\/meetingID>/g) || [];
              meetingMatches.forEach(match => {
                const meetingId = match.replace(/<meetingID><!\[CDATA\[/, '').replace(/\]\]><\/meetingID>/, '');
                activeMeetingIds.push(meetingId);
              });
              
              console.log('🔍 Active meeting IDs from BBB:', activeMeetingIds);
              
              // Check if any batch classes have active meeting IDs
              for (const batchClass of allBatchClasses) {
                if (batchClass.bbbMeetingId && activeMeetingIds.includes(batchClass.bbbMeetingId)) {
                  activeMeetingId = batchClass.bbbMeetingId;
                  trainerFound = true;
                  console.log('🎯 Found active meeting via batch class lookup:', activeMeetingId);
                  break;
                }
              }
            }
          } catch (fallbackError) {
            console.log('❌ Fallback batch check error:', fallbackError);
          }
        }
        
        // If we found trainer in a related meeting, update our class record and allow join
        if (trainerFound && activeMeetingId) {
          console.log(`🔄 Updating class meeting ID from ${meetingId} to ${activeMeetingId}`);
          
          try {
            // Update the class with the correct meeting ID
            await ModuleClass.findByIdAndUpdate(classId, {
              bbbMeetingId: activeMeetingId,
              status: 'live',
              isLive: true
            });
            
            // Use the correct meeting ID for the join
            meetingId = activeMeetingId;
            meetingExists = true;
            
            console.log('✅ Updated class meeting ID - continuing with join process');
            
            // Don't return here - let the function continue with the corrected meeting ID
          } catch (updateError) {
            console.log('Failed to update meeting ID:', updateError);
          }
        } else {
          // ENHANCED: If no trainer found via database, try a simpler approach
          // Check if there are ANY meetings with moderators for this batch
          console.log('🔍 Trying simpler batch matching approach...');
          
          try {
            // Get all meetings and find any with the same batch pattern
            const meetingsResponse = await fetch(`${apiUrl}/getMeetings?checksum=${generateBBBChecksum('getMeetings', '', bbbApiSecret)}`);
            if (meetingsResponse.ok) {
              const meetingsXML = await meetingsResponse.text();
              
              // Look for any meeting that has moderators and might be for this batch
              const meetingMatches = meetingsXML.match(/<meeting>(.*?)<\/meeting>/gs) || [];
              
              for (const meetingMatch of meetingMatches) {
                // Check if meeting has moderators (trainers)
                if (meetingMatch.includes('<role>MODERATOR</role>')) {
                  const meetingIdMatch = meetingMatch.match(/<meetingID><!\[CDATA\[(.*?)\]\]><\/meetingID>/);
                  const meetingNameMatch = meetingMatch.match(/<meetingName><!\[CDATA\[(.*?)\]\]><\/meetingName>/);
                  
                  if (meetingIdMatch) {
                    const foundMeetingId = meetingIdMatch[1];
                    const meetingName = meetingNameMatch ? meetingNameMatch[1] : '';
                    
                    console.log('🔍 Found meeting with moderator:', { meetingId: foundMeetingId, name: meetingName });
                    
                    // For timing-based classes, be more flexible - any active meeting with trainer might work
                    if (classId.startsWith('timing-')) {
                      console.log('🎯 Timing-based class - allowing join to any active meeting with trainer');
                      
                      // Update our class to use this active meeting
                      await ModuleClass.findByIdAndUpdate(classId, {
                        bbbMeetingId: foundMeetingId,
                        status: 'live',
                        isLive: true
                      });
                      
                      meetingId = foundMeetingId;
                      meetingExists = true;
                      trainerFound = true;
                      
                      console.log('✅ Updated timing-based class to use active meeting:', foundMeetingId);
                      break;
                    }
                  }
                }
              }
            }
          } catch (simpleError) {
            console.log('❌ Simple batch check failed:', simpleError);
          }
        }
        
        // If we still don't have a valid meeting after all checks, block student join
        if (!trainerFound || !activeMeetingId) {
          // Check if this is a forceRejoin scenario - provide better error message
          if (forceRejoin) {
            return res.status(400).json({
              success: false,
              error: 'The trainer has left the meeting or it has ended. Please wait for your trainer to start a new class session.',
              meetingNotStarted: true,
              userType: 'student',
              classId: classId,
              meetingId: meetingId,
              trainerLeft: true,
              meetingEnded: true,
              message: 'Meeting no longer active - trainer must restart'
            });
          } else {
            return res.status(400).json({
              success: false,
              error: 'The class meeting has not been started yet. Please wait for your trainer to start the class before joining.',
              meetingNotStarted: true,
              userType: 'student',
              classId: classId,
              meetingId: meetingId,
              trainerNotInMeeting: true,
              message: 'Students can only join meetings that have been started by the trainer'
            });
          }
        }
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
    // For trainers, check if they have a saved sessionToken from previous join
    if (!sessionToken || typeof sessionToken !== 'string') {
      // Check if trainer has a saved sessionToken for rejoin
      if (userType === 'trainer' || userType === 'moderator') {
        const existingClass = await ModuleClass.findById(classId) as any;
        if (existingClass && existingClass.trainerSessionToken && !forceRejoin) {
          sessionToken = existingClass.trainerSessionToken;
          console.log('Reusing saved trainer sessionToken for rejoin:', sessionToken);
        } else {
          sessionToken = Math.random().toString(36).substring(2, 10);
          console.log('Generated new session token for trainer:', sessionToken);
        }
      } else {
        sessionToken = Math.random().toString(36).substring(2, 10);
        console.log('Generated fallback session token:', sessionToken);
      }
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

    // Save the trainer's sessionToken for rejoin capability
    // Save the HTML5 client redirect URL format for easy rejoin
    if ((userType === 'trainer' || userType === 'moderator') && sessionToken) {
      try {
        // Create HTML5 client redirect URL format
        const html5ClientUrl = `https://class.techpratham.org/html5client/?sessionToken=${sessionToken}`;

        await ModuleClass.findByIdAndUpdate(classId, {
          bbbModeratorJoinUrl: html5ClientUrl,
          trainerSessionToken: sessionToken // Save trainer's token for reuse
        });
        console.log('Saved trainer sessionToken for rejoin:', sessionToken);
      } catch (saveError) {
        console.log('Failed to save sessionToken:', saveError);
        // Don't fail the join if saving fails
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