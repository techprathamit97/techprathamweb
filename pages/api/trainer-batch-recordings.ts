import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { connectMongo } from "@/utils/mongodb";
const Batch = require("@/models/Batch");
const Trainer = require("@/models/Trainer");

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
    const { trainerId, batchId } = req.query;

    if (!trainerId) {
      return res.status(400).json({ error: 'Trainer ID is required' });
    }

    console.log('📹 FETCHING BATCH-WISE RECORDINGS FOR TRAINER:', trainerId);

    await connectMongo();

    // Get trainer's batches
    const trainerBatches = await Batch.find({ trainerId })
      .populate('courseId')
      .sort({ createdAt: -1 })
      .lean();

    console.log(`Found ${trainerBatches.length} batches for trainer`);

    // Get BBB recordings
    const bbbServerUrl = 'https://class.techpratham.org/bigbluebutton';
    const bbbApiSecret = '6R9sIYi5RItE0xnuvXhWffyDHLqR5yzujOGLZfs8X0g';

    const getRecordingsParams = '';
    const getRecordingsChecksum = generateBBBChecksum('getRecordings', getRecordingsParams, bbbApiSecret);
    const getRecordingsUrl = `${bbbServerUrl}/api/getRecordings?checksum=${getRecordingsChecksum}`;

    const recordingsResponse = await fetch(getRecordingsUrl);
    const recordingsXML = await recordingsResponse.text();

    if (!recordingsXML.includes('<returncode>SUCCESS</returncode>')) {
      return res.status(500).json({
        success: false,
        error: 'BBB API call failed',
        batches: trainerBatches.map(batch => ({
          _id: batch._id.toString(),
          batchName: batch.batchName,
          batchCode: batch.batchCode,
          courseName: batch.courseId?.title || 'N/A',
          studentCount: (batch.studentIds || []).length,
          recordings: []
        }))
      });
    }

    const allRecordings: any[] = [];

    // Parse recordings from XML
    const recordingMatches = recordingsXML.match(/<recording>([\s\S]*?)<\/recording>/g);
    
    if (recordingMatches) {
      for (const recordingMatch of recordingMatches) {
        try {
          // Parse recording data
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

          // Get playback URLs
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

          // Calculate duration
          let duration = 0;
          let durationText = '0:00';
          if (startTime && endTime) {
            const durationMs = parseInt(endTime) - parseInt(startTime);
            duration = Math.floor(durationMs / 1000);
            const minutes = Math.floor(duration / 60);
            const seconds = duration % 60;
            durationText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
          }

          // Format date
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

          // Format size
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

    // Match recordings with batches (by batch name or code in meeting name/ID)
    const batchesWithRecordings = trainerBatches.map(batch => {
      const batchRecordings = allRecordings.filter(recording => {
        // Try to match by batch code, batch name, or course name in the recording name or meeting ID
        const searchTerms = [
          batch.batchCode?.toLowerCase(),
          batch.batchName?.toLowerCase(),
          batch.courseId?.title?.toLowerCase(),
        ].filter(Boolean);
        
        const recordingName = recording.name?.toLowerCase() || '';
        const meetingId = recording.meetingId?.toLowerCase() || '';
        
        return searchTerms.some(term => 
          recordingName.includes(term) || meetingId.includes(term)
        );
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
        recordings: batchRecordings.sort((a, b) => {
          if (a.startTime && b.startTime) {
            return parseInt(b.startTime) - parseInt(a.startTime);
          }
          return 0;
        })
      };
    });

    // If specific batch requested, return only that batch's recordings
    if (batchId) {
      const selectedBatch = batchesWithRecordings.find(batch => batch._id === batchId);
      if (!selectedBatch) {
        return res.status(404).json({ error: 'Batch not found' });
      }
      
      return res.status(200).json({
        success: true,
        selectedBatch,
        recordings: selectedBatch.recordings,
        totalRecordings: selectedBatch.recordings.length
      });
    }

    // Return all batches with their recordings
    const totalRecordings = batchesWithRecordings.reduce((sum, batch) => sum + batch.recordings.length, 0);
    const unmatchedRecordings = allRecordings.filter(recording => {
      return !batchesWithRecordings.some(batch => 
        batch.recordings.some(batchRec => batchRec.recordId === recording.recordId)
      );
    });

    return res.status(200).json({
      success: true,
      message: `Found ${totalRecordings} recordings across ${trainerBatches.length} batches`,
      totalBatches: trainerBatches.length,
      totalRecordings: totalRecordings,
      batches: batchesWithRecordings,
      unmatchedRecordings: unmatchedRecordings, // Recordings that couldn't be matched to any batch
      hasMultipleBatches: trainerBatches.length > 2
    });

  } catch (error: any) {
    console.error('❌ Error fetching batch recordings:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}