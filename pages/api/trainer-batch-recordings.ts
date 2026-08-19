import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { connectMongo } from "@/utils/mongodb";
import { extractPlaybackInfo } from "@/utils/bbbRecordings";
import { buildMeetingBatchIndex, groupRecordingsByBatch } from "@/utils/matchRecordingsToBatches";
const Batch = require("@/models/Batch");
const Trainer = require("@/models/Trainer");
const Course = require("@/models/Course");
const ModuleClass = require("@/models/ModuleClass");

// Type definitions
interface BatchType {
  _id: any;
  batchName: string;
  batchCode: string;
  courseId?: {
    title: string;
  };
  studentIds?: any[];
  timing?: string;
  startDate?: string;
  endDate?: string;
}

interface ProcessedBatchType {
  _id: string;
  batchName: string;
  batchCode: string;
  courseName: string;
  studentCount: number;
  timing: string;
  startDate: string;
  endDate: string;
  recordings: any[];
}

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

    console.log('📹 TRAINER BATCH RECORDINGS API CALLED');
    console.log('Trainer ID:', trainerId);
    console.log('Batch ID:', batchId);

    if (!trainerId) {
      console.error('❌ No trainer ID provided');
      return res.status(400).json({ error: 'Trainer ID is required' });
    }

    console.log('📹 FETCHING BATCH-WISE RECORDINGS FOR TRAINER:', trainerId);

    await connectMongo();
    console.log('✅ Connected to MongoDB');

    // Handle trainer ID - it might be _id or need to find trainer by trainerId field
    let actualTrainerId = trainerId;
    
    // Check if it's a valid ObjectId
    const mongoose = require('mongoose');
    
    if (!mongoose.Types.ObjectId.isValid(trainerId)) {
      console.log('📍 Trainer ID is not a valid ObjectId, trying to find trainer by trainerId field');
      // Try to find trainer by trainerId field
      const trainer = await Trainer.findOne({ trainerId: trainerId }).lean();
      if (trainer) {
        actualTrainerId = trainer._id;
        console.log('✅ Found trainer by trainerId field:', actualTrainerId);
      } else {
        console.error('❌ No trainer found with trainerId:', trainerId);
        return res.status(404).json({ error: 'Trainer not found' });
      }
    }

    console.log('🎯 Using trainer ObjectId:', actualTrainerId);

    // Get trainer's batches
    const trainerBatches = await Batch.find({ trainerId: actualTrainerId })
      .populate('courseId')
      .sort({ createdAt: -1 })
      .lean();

    console.log(`✅ Found ${trainerBatches.length} batches for trainer ${actualTrainerId}`);

    if (trainerBatches.length === 0) {
      console.warn('⚠️ No batches found for this trainer');
      
      // Get trainer info for debug
      const trainerInfo = await Trainer.findById(actualTrainerId).lean();
      
      return res.status(200).json({
        success: true,
        message: 'No batches found for this trainer',
        totalBatches: 0,
        totalRecordings: 0,
        batches: [],
        unmatchedRecordings: [],
        hasMultipleBatches: false,
        trainer: trainerInfo ? {
          _id: trainerInfo._id,
          trainerId: trainerInfo.trainerId || trainerInfo._id,
          name: trainerInfo.name,
          email: trainerInfo.email
        } : null,
        debug: {
          originalRecordings: 0,
          matchedRecordings: 0,
          unmatchedCount: 0
        }
      });
    }

    // Get all ModuleClass records for trainer's batches to get BBB meeting IDs
    const moduleClasses = await ModuleClass.find({
      batchId: { $in: trainerBatches.map((batch: BatchType) => batch._id) }
    })
      .populate('courseId')
      .populate('batchId')
      .sort({ scheduledDate: -1 })
      .lean();

    console.log(`Found ${moduleClasses.length} module classes for trainer's batches`);
    
    // Debug: Log batch and module class information
    trainerBatches.forEach((batch: BatchType, index: number) => {
      const batchModules = moduleClasses.filter((mod: any) => mod.batchId._id.toString() === batch._id.toString());
      console.log(`Trainer Batch ${index + 1}: ${batch.batchName} (Code: ${batch.batchCode}) - Course: ${batch.courseId?.title} - ${batchModules.length} classes`);
    });

    // Get BBB recordings
    console.log('🔗 Connecting to BBB API...');
    const bbbServerUrl = 'https://class.techpratham.org/bigbluebutton';
    const bbbApiSecret = '6R9sIYi5RItE0xnuvXhWffyDHLqR5yzujOGLZfs8X0g';

    const getRecordingsParams = '';
    const getRecordingsChecksum = generateBBBChecksum('getRecordings', getRecordingsParams, bbbApiSecret);
    const getRecordingsUrl = `${bbbServerUrl}/api/getRecordings?checksum=${getRecordingsChecksum}`;

    console.log('📞 BBB API URL:', getRecordingsUrl);

    const recordingsResponse = await fetch(getRecordingsUrl);
    const recordingsXML = await recordingsResponse.text();

    console.log('📊 BBB API Response length:', recordingsXML.length);
    console.log('📊 BBB API Response preview:', recordingsXML.substring(0, 200));

    if (!recordingsXML.includes('<returncode>SUCCESS</returncode>')) {
      console.error('❌ BBB API call failed');
      console.log('Full BBB Response:', recordingsXML);
      return res.status(500).json({
        success: false,
        error: 'BBB API call failed',
        batches: trainerBatches.map((batch: BatchType) => ({
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

          // Playback URLs - newline/CDATA tolerant with a derived-URL fallback so
          // recordings created outside the LMS still expose Play/Download.
          const playback = extractPlaybackInfo(recordingMatch, {
            bbbServerUrl,
            recordId,
            published
          });

          const videoUrl = playback.videoUrl;
          const previewUrl = playback.previewUrl;

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
            canDownload: Boolean(published && state === 'published' && videoUrl),
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

    console.log(`✅ Found ${allRecordings.length} total BBB recordings`);
    
    if (allRecordings.length === 0) {
      console.warn('⚠️ No recordings found from BBB API');
    }
    
    // Debug: Log first few recording names and meeting IDs
    allRecordings.slice(0, 3).forEach((rec: any, index: number) => {
      console.log(`🎥 Recording ${index + 1}: "${rec.name}" (Meeting ID: ${rec.meetingId})`);
    });

    // Authoritative attribution: meeting ID -> class -> batch, with a strict
    // "<Batch Name> - ..." name convention fallback. Recordings that cannot be
    // tied to a batch (e.g. rooms created directly in Greenlight) stay unmatched
    // instead of being folded into a batch they do not belong to.
    const meetingIndex = buildMeetingBatchIndex(moduleClasses);
    console.log(
      `Built attribution index: ${meetingIndex.byMeetingId.size} meeting IDs, ` +
      `${meetingIndex.byClassId.size} class IDs`
    );

    const { byBatchId, unmatched } = groupRecordingsByBatch(
      allRecordings,
      trainerBatches as any[],
      meetingIndex
    );

    const batchesWithRecordings = trainerBatches.map((batch: BatchType) => ({
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

    // Debug: Log matching results
    batchesWithRecordings.forEach((batch: ProcessedBatchType) => {
      console.log(`Batch "${batch.batchName}" matched with ${batch.recordings.length} recordings`);
    });

    const totalMatchedRecordings = batchesWithRecordings.reduce(
      (sum: number, batch: ProcessedBatchType) => sum + batch.recordings.length,
      0
    );

    console.log(
      `Total recordings: ${allRecordings.length}, ` +
      `Matched: ${totalMatchedRecordings}, Unmatched: ${unmatched.length}`
    );

    // Unmatched recordings are intentionally NOT attributed to any batch. Doing
    // so previously dumped every foreign recording into the first batch.
    if (unmatched.length > 0) {
      console.log(
        `ℹ️ ${unmatched.length} recording(s) could not be tied to a batch and are excluded ` +
        `from batch views: ${unmatched.slice(0, 5).map((r: any) => r.name).join(', ')}`
      );
    }

    // If specific batch requested, return only that batch's recordings
    if (batchId) {
      const selectedBatch = batchesWithRecordings.find((batch: ProcessedBatchType) => batch._id === batchId);
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

    // Get trainer info for response
    const trainerInfo = await Trainer.findById(actualTrainerId).lean();

    return res.status(200).json({
      success: true,
      message: `Found ${totalMatchedRecordings} recordings across ${trainerBatches.length} batches`,
      totalBatches: trainerBatches.length,
      totalRecordings: totalMatchedRecordings,
      batches: batchesWithRecordings,
      // Reported for visibility only - never attributed to a batch
      unmatchedRecordings: unmatched,
      hasMultipleBatches: trainerBatches.length > 1,
      trainer: trainerInfo ? {
        _id: trainerInfo._id,
        trainerId: trainerInfo.trainerId || trainerInfo._id,
        name: trainerInfo.name,
        email: trainerInfo.email
      } : null,
      debug: {
        originalRecordings: allRecordings.length,
        matchedRecordings: totalMatchedRecordings,
        unmatchedCount: unmatched.length
      }
    });

  } catch (error: any) {
    console.error('❌ Error fetching batch recordings:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}