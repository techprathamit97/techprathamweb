import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectMongo } from "@/utils/mongodb";
import { extractPlaybackInfo } from "@/utils/bbbRecordings";
import { buildMeetingBatchIndex, groupRecordingsByBatch } from "@/utils/matchRecordingsToBatches";
import { getManualRecordingsByBatch, mergeAndSort } from "@/utils/manualRecordings";
import { applyRecordingTitles } from "@/utils/recordingTitles";
const Batch = require("@/models/Batch");
const ModuleClass = require("@/models/ModuleClass");
// Registered so .populate('courseId') / .populate('trainerId') work — Mongoose
// throws "Schema hasn't been registered for model Course" if these aren't loaded.
const Course = require("@/models/Course");
const Trainer = require("@/models/Trainer");
const Student = require("@/models/Student");

// Helper function to generate BBB API checksum (same as trainer API)
function generateBBBChecksum(apiCall: string, params: string, secret: string): string {
  const stringToHash = apiCall + params + secret;
  return crypto.createHash('sha1').update(stringToHash, 'utf8').digest('hex');
}

// Helper function to get detailed participant information for recordings
async function getRecordingParticipants(recordingMeetingId: string, batchId: string, recordId?: string) {
  try {
    
    // Method 1: Try to get participant data from BBB Learning Analytics Dashboard  
    if (recordId) {
      try {
        
        // First, get the internal meeting ID from BBB recordings API
        const bbbServerUrl = 'https://class.techpratham.com/bigbluebutton';
        const bbbApiSecret = 'FJxUf6Erzd1Gru9oPXVqpdaXAsP9s1vFKxPEjljXnE';
        
        // Ask BBB for just this recording instead of downloading the full list.
        const getRecordingsParams = `recordID=${encodeURIComponent(recordId)}`;
        const getRecordingsChecksum = generateBBBChecksum('getRecordings', getRecordingsParams, bbbApiSecret);
        const getRecordingsUrl = `${bbbServerUrl}/api/getRecordings?${getRecordingsParams}&checksum=${getRecordingsChecksum}`;

        const recordingsResponse = await fetch(getRecordingsUrl);
        const recordingsXML = await recordingsResponse.text();
        
        if (recordingsXML.includes('<returncode>SUCCESS</returncode>')) {
          const recordingMatches = recordingsXML.match(/<recording>([\s\S]*?)<\/recording>/g);
          
          if (recordingMatches) {
            for (const recordingMatch of recordingMatches) {
              const recordIdMatch = recordingMatch.match(/<recordID><!\[CDATA\[(.*?)\]\]><\/recordID>/) ||
                                   recordingMatch.match(/<recordID>(.*?)<\/recordID>/);
              const currentRecordId = recordIdMatch?.[1];
              
              if (currentRecordId === recordId) {
                
                // Extract internal meeting ID from the recording
                const internalMeetingIdMatch = recordingMatch.match(/<internalMeetingID>(.*?)<\/internalMeetingID>/);
                const internalMeetingId = internalMeetingIdMatch?.[1];
                
                if (internalMeetingId) {
                  
                  // Fetch learning analytics data
                  const analyticsUrl = `https://class.techpratham.com/learning-analytics-dashboard/${recordId}/${internalMeetingId}/learning_dashboard_data.json`;
                  
                  const analyticsResponse = await fetch(analyticsUrl);
                  
                  if (analyticsResponse.ok) {
                    const analyticsData = await analyticsResponse.json();
                    
                    // Extract participant data from analytics
                    if (analyticsData.users_data) {
                      
                      const participants = Object.entries(analyticsData.users_data).map(([userId, userData]: [string, any]) => {
                        
                        // Calculate session duration
                        let duration = 'N/A';
                        let joinTime = 'N/A';
                        let leftTime = 'N/A';
                        
                        if (userData.intIds && userData.intIds.length > 0) {
                          // Get the first session data
                          const sessionData = userData.intIds[0];
                          
                          if (sessionData.registeredOn && sessionData.leftOn) {
                            const joinedAt = new Date(sessionData.registeredOn);
                            const leftAt = new Date(sessionData.leftOn);
                            const durationMs = leftAt.getTime() - joinedAt.getTime();
                            const durationMin = Math.floor(durationMs / (1000 * 60));
                            
                            duration = `${durationMin} min`;
                            joinTime = joinedAt.toLocaleString('en-IN', {
                              timeZone: 'Asia/Kolkata',
                              year: 'numeric',
                              month: 'short', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            });
                            leftTime = leftAt.toLocaleString('en-IN', {
                              timeZone: 'Asia/Kolkata',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric', 
                              hour: '2-digit',
                              minute: '2-digit'
                            });
                          }
                        }
                        
                        // Extract base name without session token
                        const baseName = userData.name ? userData.name.replace(/-[a-z0-9]{8,}$/i, '') : 'Unknown';
                        
                        return {
                          name: baseName,
                          email: userData.role === 'moderator' ? 'Trainer/Admin' : 'Student email from LMS',
                          studentId: userId,
                          phone: 'N/A',
                          joinedAt: joinTime,
                          leftAt: leftTime,
                          duration: duration,
                          status: 'present',
                          role: userData.role || 'viewer',
                          isModerator: userData.role === 'moderator',
                          isFromBBBAnalytics: true,
                          totalOfMessages: userData.totalOfMessages || 0,
                          talks: userData.talks || []
                        };
                      });
                      
                      return participants;
                    }
                  }
                }
                break;
              }
            }
          }
        }
      } catch (analyticsError: any) {
        // BBB Learning Analytics fetch failed, continue to fallback
      }
    }
    
    // Method 2: Try to get current meeting participants from BBB if meeting is active
    try {
      const bbbServerUrl = 'https://class.techpratham.com/bigbluebutton';
      const bbbApiSecret = 'FJxUf6Erzd1Gru9oPXVqpdaXAsP9s1vFKxPEjljXnE';
      
      const getMeetingInfoParams = `meetingID=${encodeURIComponent(recordingMeetingId)}`;
      const getMeetingInfoChecksum = generateBBBChecksum('getMeetingInfo', getMeetingInfoParams, bbbApiSecret);
      const getMeetingInfoUrl = `${bbbServerUrl}/api/getMeetingInfo?${getMeetingInfoParams}&checksum=${getMeetingInfoChecksum}`;
      
      const meetingInfoResponse = await fetch(getMeetingInfoUrl);
      const meetingInfoXML = await meetingInfoResponse.text();
      
      if (meetingInfoXML.includes('<returncode>SUCCESS</returncode>') && meetingInfoXML.includes('<attendees>')) {
        
        const attendeeMatches = meetingInfoXML.match(/<attendee>([\s\S]*?)<\/attendee>/g);
        
        if (attendeeMatches && attendeeMatches.length > 0) {
          
          const liveParticipants = attendeeMatches.map((attendeeXML, index) => {
            // Extract participant data from BBB XML
            const userIdMatch = attendeeXML.match(/<userID><!\[CDATA\[(.*?)\]\]><\/userID>/) ||
                               attendeeXML.match(/<userID>(.*?)<\/userID>/);
            const fullNameMatch = attendeeXML.match(/<fullName><!\[CDATA\[(.*?)\]\]><\/fullName>/) || 
                                 attendeeXML.match(/<fullName>(.*?)<\/fullName>/);
            const roleMatch = attendeeXML.match(/<role>(.*?)<\/role>/);
            const isPresenterMatch = attendeeXML.match(/<isPresenter>(.*?)<\/isPresenter>/);
            const isListeningOnlyMatch = attendeeXML.match(/<isListeningOnly>(.*?)<\/isListeningOnly>/);
            const hasJoinedVoiceMatch = attendeeXML.match(/<hasJoinedVoice>(.*?)<\/hasJoinedVoice>/);
            
            const fullName = fullNameMatch?.[1] || `Participant ${index + 1}`;
            const userId = userIdMatch?.[1] || '';
            const role = roleMatch?.[1] || 'VIEWER';
            const isPresenter = isPresenterMatch?.[1] === 'true';
            const isListeningOnly = isListeningOnlyMatch?.[1] === 'true';
            const hasJoinedVoice = hasJoinedVoiceMatch?.[1] === 'true';
            
            // Extract base name without session token (format: Name-sessiontoken)
            const baseName = fullName.replace(/-[a-z0-9]{8,}$/i, '');
            
            return {
              name: baseName || fullName,
              email: role === 'MODERATOR' ? 'Trainer/Admin' : 'Student email not available in live session',
              studentId: userId || 'N/A',
              phone: 'N/A',
              joinedAt: 'Currently in session',
              leftAt: 'Still present',
              duration: 'Currently active',
              status: 'present',
              role: role,
              isPresenter: isPresenter,
              isListeningOnly: isListeningOnly,
              hasJoinedVoice: hasJoinedVoice,
              fullBBBName: fullName,
              isLiveData: true
            };
          });
          
          return liveParticipants;
        }
      }
    } catch (bbbError: any) {
      // BBB meeting check failed, continue to fallback
    }
    
    // Method 3: Look for ModuleClass records in this batch
    const allModuleClasses = await ModuleClass.find({ batchId: batchId })
      .select('bbbMeetingId attendees moduleTitle scheduledDate')
      .populate({
        path: 'attendees.studentId',
        model: 'Student',
        select: 'name email studentId phone'
      })
      .lean();

    // Only an exact meeting match is used: borrowing another class's attendees
    // (most attendees / most recent) attributed the wrong students.
    // Meeting IDs look like `class-<classId>` (optionally `-<timestamp>`).
    const embeddedClassId = recordingMeetingId.match(/^class-([a-f0-9]+?)(?:-\d{10,})?$/i)?.[1];
    const moduleClass = allModuleClasses.find((mc: any) =>
      mc.bbbMeetingId === recordingMeetingId ||
      (embeddedClassId && String(mc._id) === embeddedClassId)
    );

    if (!moduleClass || !moduleClass.attendees || moduleClass.attendees.length === 0) {
      return [];
    }

    // Format participant data from ModuleClass
    const participants = moduleClass.attendees
      .filter((attendee: any) => attendee.studentId && attendee.attendanceStatus !== 'absent')
      .map((attendee: any) => ({
        name: attendee.studentId?.name || 'Unknown',
        email: attendee.studentId?.email || 'N/A',
        studentId: attendee.studentId?.studentId || 'N/A',
        phone: attendee.studentId?.phone || 'N/A',
        joinedAt: attendee.joinedAt ? new Date(attendee.joinedAt).toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) : 'N/A',
        leftAt: attendee.leftAt ? new Date(attendee.leftAt).toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) : 'N/A',
        duration: attendee.duration ? `${attendee.duration} min` : 'N/A',
        status: attendee.attendanceStatus || 'present',
        isLiveData: false
      }));

    return participants;
  } catch (error: any) {
    return [];
  }
}

// GET /api/lms/recordings - Get available recordings for LMS admin (using SAME logic as trainer API)
//
// Participant details are NOT included in the list (they cost several BBB
// round-trips per recording). Fetch them for one recording on demand with:
// GET /api/lms/recordings?participantsFor=<recordId>&batchId=<id>&meetingId=<id>
export async function GET(req: NextRequest) {
  try {

    await connectMongo();

    const { searchParams } = new URL(req.url);
    const participantsFor = searchParams.get('participantsFor');
    if (participantsFor) {
      const batchId = searchParams.get('batchId');
      const meetingId = searchParams.get('meetingId');
      if (!batchId || !meetingId) {
        return NextResponse.json(
          { success: false, error: 'batchId and meetingId are required', participants: [] },
          { status: 400 }
        );
      }
      const participants = await getRecordingParticipants(meetingId, batchId, participantsFor);
      return NextResponse.json({ success: true, participants });
    }

    // Get all batches in the system
    const allBatches: any[] = await Batch.find({})
      .populate('courseId')
      .populate('trainerId')
      .sort({ createdAt: -1 })
      .lean();

    if (allBatches.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No batches found in system',
        totalBatches: 0,
        totalRecordings: 0,
        batches: []
      });
    }

    // Get all ModuleClass records to get BBB meeting IDs (same as trainer API)
    // Only the fields buildMeetingBatchIndex needs - no populate.
    const moduleClasses: any[] = await ModuleClass.find({
      batchId: { $in: allBatches.map((batch: any) => batch._id) }
    })
      .select('_id batchId bbbMeetingId')
      .sort({ scheduledDate: -1 })
      .lean();

    // Get BBB recordings using EXACT same approach as trainer API
    const bbbServerUrl = 'https://class.techpratham.com/bigbluebutton';
    const bbbApiSecret = 'FJxUf6Erzd1Gru9oPXVqpdaXAsP9s1vFKxPEjljXnE';

    const getRecordingsParams = '';
    const getRecordingsChecksum = generateBBBChecksum('getRecordings', getRecordingsParams, bbbApiSecret);
    const getRecordingsUrl = `${bbbServerUrl}/api/getRecordings?checksum=${getRecordingsChecksum}`;

    const recordingsResponse = await fetch(getRecordingsUrl);
    const recordingsXML = await recordingsResponse.text();

    if (!recordingsXML.includes('<returncode>SUCCESS</returncode>')) {
      return NextResponse.json({
        success: false,
        error: 'BBB API call failed',
        batches: allBatches.map((batch: any) => ({
          _id: batch._id.toString(),
          batchName: batch.batchName,
          batchCode: batch.batchCode,
          courseName: batch.courseId?.title || 'N/A',
          studentCount: (batch.studentIds || []).length,
          recordings: []
        }))
      }, { status: 500 });
    }

    const allRecordings: any[] = [];

    // Parse recordings from XML (EXACT same parsing as trainer API)
    const recordingMatches = recordingsXML.match(/<recording>([\s\S]*?)<\/recording>/g);
    
    if (recordingMatches) {
      
      for (const recordingMatch of recordingMatches) {
        try {
          // Parse recording data (same as trainer API)
          const recordIdCDATA = recordingMatch.match(/<recordID><!\[CDATA\[(.*?)\]\]><\/recordID>/);
          const recordIdRegular = recordingMatch.match(/<recordID>(.*?)<\/recordID>/);
          const recordId = recordIdCDATA?.[1] || recordIdRegular?.[1];

          const meetingIdCDATA = recordingMatch.match(/<meetingID><!\[CDATA\[(.*?)\]\]><\/meetingID>/);
          const meetingIdRegular = recordingMatch.match(/<meetingID>(.*?)<\/meetingID>/);
          const meetingId = meetingIdCDATA?.[1] || meetingIdRegular?.[1];

          const nameCDATA = recordingMatch.match(/<name><!\[CDATA\[(.*?)\]\]><\/name>/);
          const nameRegular = recordingMatch.match(/<name>(.*?)<\/name>/);
          const name = nameCDATA?.[1] || nameRegular?.[1];

          const publishedMatch = recordingMatch.match(/<published>(.*?)<\/published>/);
          const stateMatch = recordingMatch.match(/<state>(.*?)<\/state>/);
          const startTimeMatch = recordingMatch.match(/<startTime>(.*?)<\/startTime>/);
          const endTimeMatch = recordingMatch.match(/<endTime>(.*?)<\/endTime>/);
          const participantsMatch = recordingMatch.match(/<participants>(.*?)<\/participants>/);
          const sizeMatch = recordingMatch.match(/<size>(.*?)<\/size>/);

          const published = publishedMatch?.[1] === 'true';
          const state = stateMatch?.[1];
          const startTime = startTimeMatch?.[1];
          const endTime = endTimeMatch?.[1];
          const participants = participantsMatch?.[1];
          const size = sizeMatch?.[1];
          // Playback URLs - newline/CDATA tolerant, handles multiple <format>
          // blocks, and derives a playback URL when the XML cannot be parsed.
          // Recordings created outside the LMS (Greenlight) previously fell
          // through this and lost their Play/Download buttons.
          const playback = extractPlaybackInfo(recordingMatch, {
            bbbServerUrl,
            recordId,
            published
          });

          const videoUrl = playback.videoUrl;
          const previewUrl = playback.previewUrl;

          if (playback.derived) {
            // Derived playback URL - no logging needed in production
          }

          // Calculate duration (same as trainer API)
          let duration = 0;
          let durationText = '0:00';
          if (startTime && endTime) {
            const durationMs = parseInt(endTime) - parseInt(startTime);
            duration = Math.floor(durationMs / 1000);
            const minutes = Math.floor(duration / 60);
            const seconds = duration % 60;
            durationText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
          }

          // Format date (same as trainer API)
          let dateText = 'Unknown';
          if (startTime) {
            const date = new Date(parseInt(startTime));
            dateText = date.toLocaleString('en-IN', { 
              timeZone: 'Asia/Kolkata',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
          }

          // Format size (same as trainer API)
          let sizeText = 'Unknown';
          if (size) {
            const sizeBytes = parseInt(size);
            if (sizeBytes > 1024 * 1024) {
              sizeText = `${Math.round(sizeBytes / 1024 / 1024)} MB`;
            } else if (sizeBytes > 1024) {
              sizeText = `${Math.round(sizeBytes / 1024)} KB`;
            } else {
              sizeText = `${sizeBytes} B`;
            }
          }

          allRecordings.push({
            recordId: recordId || 'Unknown',
            meetingId: meetingId || 'Unknown',
            name: name || 'Unnamed Recording',
            published: published,
            state: state || 'unknown',
            videoUrl: videoUrl,
            previewUrl: previewUrl,
            startTime: startTime,
            endTime: endTime,
            duration: duration,
            durationText: durationText,
            dateText: dateText,
            participants: participants || '0',
            participantDetails: [], // Will be populated later per batch
            size: size,
            sizeText: sizeText,
            // A recording is downloadable only when BBB has generated the
            // combined `video` playback format (video-0.m4v). Older recordings
            // that only have the `presentation` format cannot be downloaded, so
            // the button should not appear for them.
            canDownload: Boolean(
              published &&
              state === 'published' &&
              (playback.formats || []).some((f: any) => f.type === 'video')
            ),
            playbackFormats: playback.formats,
            playbackDerived: playback.derived,
            status: published && state === 'published' ? 
              (videoUrl ? 'Ready' : 'No Video') : 
              `Processing (${state})`
          });

        } catch (parseError: any) {
          console.error('Error parsing individual recording:', parseError);
        }
      }
    }
    
    // Log sample recordings for debugging
    if (allRecordings.length > 0) {
      // Sample recordings available
    }

    // Authoritative attribution: meeting ID -> class -> batch, with a strict
    // "<Batch Name> - ..." name convention fallback.
    const meetingIndex = buildMeetingBatchIndex(moduleClasses);

    const { byBatchId, unmatched } = groupRecordingsByBatch(
      allRecordings,
      allBatches as any[],
      meetingIndex
    );

    const batchesWithRecordings = allBatches.map((batch: any) => ({
      _id: batch._id.toString(),
      batchName: batch.batchName,
      batchCode: batch.batchCode,
      courseName: batch.courseId?.title || 'N/A',
      studentCount: (batch.studentIds || []).length,
      timing: batch.timing || '',
      startDate: batch.startDate,
      endDate: batch.endDate,
      recordings: byBatchId.get(batch._id.toString()) || []
    }));

    // Merge manually-uploaded (non-BBB) recordings into each batch. Admin sees
    // all of them (published or not); they sort by classDate into the series.
    try {
      const manualByBatch = await getManualRecordingsByBatch(
        allBatches.map((b: any) => b._id.toString())
      );
      for (const b of batchesWithRecordings) {
        const manual = manualByBatch.get(b._id) || [];
        if (manual.length) b.recordings = mergeAndSort(b.recordings, manual);
      }
    } catch (e) {
      console.warn('Failed to merge manual recordings (admin):', e);
    }

    // Apply display titles: "<batchName>-Class-N" default, overridden by any
    // saved custom title.
    await Promise.all(
      batchesWithRecordings.map(async (b: any) => {
        b.recordings = await applyRecordingTitles(b.batchName, b.recordings);
      })
    );

    const totalMatchedRecordings = batchesWithRecordings.reduce(
      (sum: number, batch: any) => sum + batch.recordings.length,
      0
    );

    // Unmatched recordings are returned in their own bucket. They used to be
    // appended to the first batch, which made recordings from unrelated rooms
    // look like that batch's content.
    return NextResponse.json({
      success: true,
      message: `Found ${totalMatchedRecordings} recordings across ${allBatches.length} batches`,
      totalBatches: allBatches.length,
      totalRecordings: totalMatchedRecordings,
      batches: batchesWithRecordings,
      unmatchedRecordings: unmatched,
      debug: {
        originalRecordings: allRecordings.length,
        matchedRecordings: totalMatchedRecordings,
        unmatchedCount: unmatched.length,
        batchesWithRecordings: batchesWithRecordings.filter((b: any) => b.recordings.length > 0).length
      }
    });

  } catch (error: any) {
    console.error('❌ Error fetching LMS recordings (SAME AS TRAINER):', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}