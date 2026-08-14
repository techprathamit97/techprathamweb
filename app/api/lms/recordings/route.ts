import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectMongo } from "@/utils/mongodb";
const Batch = require("@/models/Batch");
const ModuleClass = require("@/models/ModuleClass");

// Helper function to generate BBB API checksum (same as trainer API)
function generateBBBChecksum(apiCall: string, params: string, secret: string): string {
  const stringToHash = apiCall + params + secret;
  return crypto.createHash('sha1').update(stringToHash, 'utf8').digest('hex');
}

// GET /api/lms/recordings - Get available recordings for LMS admin (using SAME logic as trainer API)
export async function GET(req: NextRequest) {
  try {
    console.log('🎬 LMS ADMIN RECORDINGS API CALLED (SAME AS TRAINER APPROACH)');

    await connectMongo();
    console.log('✅ Connected to MongoDB');

    // Get all batches in the system
    const allBatches: any[] = await Batch.find({})
      .populate('courseId')
      .populate('trainerId')
      .sort({ createdAt: -1 })
      .lean();

    console.log(`✅ Found ${allBatches.length} total batches in system`);

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
    const moduleClasses: any[] = await ModuleClass.find({
      batchId: { $in: allBatches.map((batch: any) => batch._id) }
    })
      .populate('courseId')
      .populate('batchId')
      .sort({ scheduledDate: -1 })
      .lean();

    console.log(`Found ${moduleClasses.length} module classes across all batches`);

    // Get BBB recordings using EXACT same approach as trainer API
    console.log('🔗 Connecting to BBB API (SAME AS TRAINER)...');
    const bbbServerUrl = 'https://class.techpratham.org/bigbluebutton';
    const bbbApiSecret = '6R9sIYi5RItE0xnuvXhWffyDHLqR5yzujOGLZfs8X0g';

    const getRecordingsParams = '';
    const getRecordingsChecksum = generateBBBChecksum('getRecordings', getRecordingsParams, bbbApiSecret);
    const getRecordingsUrl = `${bbbServerUrl}/api/getRecordings?checksum=${getRecordingsChecksum}`;
    console.log('📞 BBB API URL (SAME AS TRAINER):', getRecordingsUrl);

    const recordingsResponse = await fetch(getRecordingsUrl);
    const recordingsXML = await recordingsResponse.text();

    console.log('📊 BBB API Response length:', recordingsXML.length);
    console.log('📊 BBB API Response preview:', recordingsXML.substring(0, 200));

    if (!recordingsXML.includes('<returncode>SUCCESS</returncode>')) {
      console.error('❌ BBB API call failed');
      console.log('Full BBB Response:', recordingsXML);
      return NextResponse.json({
        success: false,
        error: 'BBB API call failed',
        batches: allBatches.map(batch => ({
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
      console.log(`📊 Found ${recordingMatches.length} recording matches in XML`);
      
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
          // Get playback URLs (same as trainer API)
          const playbackMatches = recordingMatch.match(/<playback>([\s\S]*?)<\/playback>/);
          let videoUrl = null;
          let previewUrl = null;

          if (playbackMatches) {
            const urlCDATA = playbackMatches[1].match(/<url><!\[CDATA\[(.*?)\]\]><\/url>/);
            const urlRegular = playbackMatches[1].match(/<url>(.*?)<\/url>/);
            videoUrl = urlCDATA?.[1] || urlRegular?.[1];

            const previewMatches = playbackMatches[1].match(/<preview>([\s\S]*?)<\/preview>/);
            if (previewMatches) {
              const previewImageMatch = previewMatches[1].match(/<images>([\s\S]*?)<\/images>/);
              if (previewImageMatch) {
                const imageMatch = previewImageMatch[1].match(/<image[^>]*>(.*?)<\/image>/);
                previewUrl = imageMatch?.[1];
              }
            }
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
            size: size,
            sizeText: sizeText,
            canDownload: published && state === 'published' && videoUrl,
            status: published && state === 'published' ? 
              (videoUrl ? 'Ready' : 'No Video') : 
              `Processing (${state})`
          });

        } catch (parseError: any) {
          console.error('Error parsing individual recording:', parseError);
        }
      }
    }
    console.log(`✅ Found ${allRecordings.length} total BBB recordings`);
    
    // Log sample recordings for debugging
    if (allRecordings.length > 0) {
      console.log('📋 Sample recordings (first 3):');
      allRecordings.slice(0, 3).forEach((rec, index) => {
        console.log(`  ${index + 1}. "${rec.name}" (Meeting ID: ${rec.meetingId})`);
      });
    }

    // Create a map of BBB meeting IDs to batch/module info (same as trainer API)
    const meetingIdToBatch: Record<string, any> = {};
    moduleClasses.forEach((moduleClass: any) => {
      if (moduleClass.bbbMeetingId) {
        meetingIdToBatch[moduleClass.bbbMeetingId] = {
          batchId: moduleClass.batchId._id.toString(),
          batchName: moduleClass.batchId.batchName,
          batchCode: moduleClass.batchId.batchCode,
          courseName: moduleClass.courseId?.title || 'N/A',
          moduleTitle: moduleClass.moduleTitle,
          moduleIndex: moduleClass.moduleIndex,
          scheduledDate: moduleClass.scheduledDate
        };
      }
    });

    console.log(`Created mapping for ${Object.keys(meetingIdToBatch).length} BBB meeting IDs`);

    // Match recordings with batches (SAME logic as trainer API)
    const batchesWithRecordings = allBatches.map((batch: any) => {
      const batchRecordings = allRecordings.filter((recording: any) => {
        // First, try exact BBB meeting ID match
        if (recording.meetingId && meetingIdToBatch[recording.meetingId]) {
          const meetingInfo = meetingIdToBatch[recording.meetingId];
          const isMatch = meetingInfo.batchId === batch._id.toString();
          
          if (isMatch) {
            console.log(`✅ Recording "${recording.name}" matched to batch "${batch.batchName}" via BBB meeting ID: ${recording.meetingId}`);
          }
          
          return isMatch;
        }

        // Fallback: try name-based matching (same as trainer API)
        const searchTerms = [
          batch.batchCode?.toLowerCase(),
          batch.batchName?.toLowerCase(),
          batch.courseId?.title?.toLowerCase(),
        ].filter(Boolean);
        
        const recordingName = recording.name?.toLowerCase() || '';
        const meetingId = recording.meetingId?.toLowerCase() || '';
        
        const isMatched = searchTerms.some((term: string | undefined) => {
          if (!term) return false;
          return recordingName.includes(term) || meetingId.includes(term);
        });

        if (isMatched) {
          console.log(`⚠️ Recording "${recording.name}" matched to batch "${batch.batchName}" via fallback name matching`);
        }

        return isMatched;
      });

      return {
        _id: batch._id.toString(),
        batchName: batch.batchName,
        batchCode: batch.batchCode,
        courseName: batch.courseId?.title || 'N/A',
        studentCount: (batch.studentIds || []).length,
        timing: batch.timing || '',
        startDate: batch.startDate,
        endDate: batch.endDate,
        recordings: batchRecordings.sort((a: any, b: any) => {
          if (a.startTime && b.startTime) {
            return parseInt(b.startTime) - parseInt(a.startTime);
          }
          return 0;
        })
      };
    });
    // Calculate total matched recordings
    const totalMatchedRecordings = batchesWithRecordings.reduce((sum: number, batch: any) => sum + batch.recordings.length, 0);
    const unmatchedRecordings = allRecordings.filter((recording: any) => {
      return !batchesWithRecordings.some((batch: any) => 
        batch.recordings.some((batchRec: any) => batchRec.recordId === recording.recordId)
      );
    });

    console.log(`📊 MATCHING RESULTS:`);
    console.log(`- Total recordings from BBB: ${allRecordings.length}`);
    console.log(`- Matched to batches: ${totalMatchedRecordings}`);
    console.log(`- Unmatched: ${unmatchedRecordings.length}`);

    // If we have many unmatched recordings, distribute them among batches (same as trainer API)
    if (unmatchedRecordings.length > 0 && batchesWithRecordings.length > 0) {
      console.log(`⚠️ Distributing ${unmatchedRecordings.length} unmatched recordings to first batch`);
      
      // Add unmatched recordings to the first batch
      batchesWithRecordings[0].recordings = [
        ...batchesWithRecordings[0].recordings,
        ...unmatchedRecordings.sort((a: any, b: any) => {
          if (a.startTime && b.startTime) {
            return parseInt(b.startTime) - parseInt(a.startTime);
          }
          return 0;
        })
      ];
      
      console.log(`First batch now has ${batchesWithRecordings[0].recordings.length} recordings`);
    }

    const finalTotalRecordings = batchesWithRecordings.reduce((sum: number, batch: any) => sum + batch.recordings.length, 0);

    console.log(`📊 FINAL RESULTS (SAME AS TRAINER):`);
    console.log(`- Total batches: ${allBatches.length}`);
    console.log(`- Total recordings: ${finalTotalRecordings}`);
    console.log(`- Batches with recordings: ${batchesWithRecordings.filter(b => b.recordings.length > 0).length}`);

    return NextResponse.json({
      success: true,
      message: `Found ${finalTotalRecordings} recordings across ${allBatches.length} batches`,
      totalBatches: allBatches.length,
      totalRecordings: finalTotalRecordings,
      batches: batchesWithRecordings,
      debug: {
        originalRecordings: allRecordings.length,
        matchedRecordings: finalTotalRecordings,
        unmatchedCount: unmatchedRecordings.length,
        batchesWithRecordings: batchesWithRecordings.filter(b => b.recordings.length > 0).length
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