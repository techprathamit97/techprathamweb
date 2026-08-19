import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { connectMongo } from "@/utils/mongodb";
import { extractPlaybackInfo } from "@/utils/bbbRecordings";
import { buildMeetingBatchIndex, groupRecordingsByBatch } from "@/utils/matchRecordingsToBatches";
const Batch = require("@/models/Batch");
const Student = require("@/models/Student");
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
    const { studentId } = req.query;

    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required' });
    }

    console.log('📹 FETCHING BATCH-WISE RECORDINGS FOR STUDENT:', studentId);

    await connectMongo();

    // Find student
    const mongoose = require('mongoose');
    const isValidObjectId = mongoose.Types.ObjectId.isValid(studentId);

    let student;
    if (isValidObjectId) {
      student = await Student.findById(studentId).lean();
    } else {
      student = await Student.findOne({ studentId: studentId }).lean();
    }

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Get batches where this student is enrolled
    const studentBatches = await Batch.find({
      studentIds: student._id
    })
      .populate('courseId')
      .sort({ createdAt: -1 })
      .lean();

    console.log(`Found ${studentBatches.length} batches for student`);

    // Get all ModuleClass records for student's batches to get BBB meeting IDs
    const moduleClasses = await ModuleClass.find({
      batchId: { $in: studentBatches.map((batch: BatchType) => batch._id) }
    })
      .populate('courseId')
      .populate('batchId')
      .sort({ scheduledDate: -1 })
      .lean();

    console.log(`Found ${moduleClasses.length} module classes for student's batches`);
    
    // Debug: Log batch and module class information
    studentBatches.forEach((batch: BatchType, index: number) => {
      const batchModules = moduleClasses.filter((mod: any) => mod.batchId._id.toString() === batch._id.toString());
      console.log(`Student Batch ${index + 1}: ${batch.batchName} (Code: ${batch.batchCode}) - Course: ${batch.courseId?.title} - ${batchModules.length} classes`);
    });

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
        batches: studentBatches.map((batch: BatchType) => ({
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
          // Parse recording data (same logic as trainer API)
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

          // Only include published recordings for students
          if (!published || state !== 'published') {
            continue;
          }

          // Playback URLs - newline/CDATA tolerant with a derived-URL fallback.
          // The previous regex returned null for recordings created outside the
          // LMS, and the skip below then dropped them from the student view
          // entirely even though they were published and playable.
          const playback = extractPlaybackInfo(recordingMatch, {
            bbbServerUrl,
            recordId,
            published
          });

          const videoUrl = playback.videoUrl;
          const previewUrl = playback.previewUrl;

          // Skip recordings without any resolvable playback URL
          if (!videoUrl) {
            console.warn(`⚠️ Skipping recording "${name}" - no playback URL could be resolved`);
            continue;
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

    console.log(`Found ${allRecordings.length} total published BBB recordings`);
    
    // Debug: Log first few recording names and meeting IDs
    allRecordings.slice(0, 5).forEach((rec: any, index: number) => {
      console.log(`Recording ${index + 1}: "${rec.name}" (Meeting ID: ${rec.meetingId})`);
    });

    // Create a map of BBB meeting IDs to batch/module info for efficient matching
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

    // Authoritative attribution: meeting ID -> class -> batch, with a strict
    // "<Batch Name> - ..." name convention fallback. Recordings from rooms that
    // are not tied to one of the student's classes are never shown to them.
    const meetingIndex = buildMeetingBatchIndex(moduleClasses);
    console.log(
      `Built attribution index: ${meetingIndex.byMeetingId.size} meeting IDs, ` +
      `${meetingIndex.byClassId.size} class IDs`
    );

    const { byBatchId, unmatched } = groupRecordingsByBatch(
      allRecordings,
      studentBatches as any[],
      meetingIndex
    );

    const batchesWithRecordings = studentBatches.map((batch: BatchType) => ({
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
      console.log(`Student batch "${batch.batchName}" matched with ${batch.recordings.length} recordings`);
    });

    const totalMatchedRecordings = batchesWithRecordings.reduce(
      (sum: number, batch: ProcessedBatchType) => sum + batch.recordings.length,
      0
    );

    console.log(
      `Total recordings: ${allRecordings.length}, ` +
      `Matched to student batches: ${totalMatchedRecordings}, Unmatched: ${unmatched.length}`
    );

    // Students only ever see recordings tied to their own classes. Unmatched
    // recordings are never attributed to a batch.
    if (unmatched.length > 0) {
      console.log(`ℹ️ ${unmatched.length} recording(s) not tied to this student's batches (expected)`);
    }

    // If specific batch requested, return only that batch's recordings
    const { batchId } = req.query;
    if (batchId) {
      const selectedBatch = batchesWithRecordings.find((batch: ProcessedBatchType) => batch._id === batchId);
      if (!selectedBatch) {
        return res.status(404).json({ error: 'Batch not found or student not enrolled' });
      }
      
      return res.status(200).json({
        success: true,
        selectedBatch,
        recordings: selectedBatch.recordings,
        totalRecordings: selectedBatch.recordings.length
      });
    }

    return res.status(200).json({
      success: true,
      message: `Found ${totalMatchedRecordings} recordings across ${studentBatches.length} enrolled batches`,
      totalBatches: studentBatches.length,
      totalRecordings: totalMatchedRecordings,
      batches: batchesWithRecordings,
      // Never shown as batch content - reported for debugging only
      unmatchedRecordings: [],
      hasMultipleBatches: studentBatches.length > 1,
      student: {
        _id: student._id,
        studentId: student.studentId || student._id,
        name: student.name,
        email: student.email
      },
      debug: {
        originalRecordings: allRecordings.length,
        matchedRecordings: totalMatchedRecordings,
        unmatchedCount: unmatched.length,
        enrolledBatches: studentBatches.length
      }
    });

  } catch (error: any) {
    console.error('❌ Error fetching student batch recordings:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}