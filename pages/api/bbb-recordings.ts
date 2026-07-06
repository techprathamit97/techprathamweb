import { NextApiRequest, NextApiResponse } from 'next';
import { connectMongo } from '@/utils/mongodb';
import crypto from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
const ModuleClass = require('@/models/ModuleClass');

// Helper function to generate BBB API checksum
function generateBBBChecksum(apiCall: string, params: string, secret: string): string {
  const stringToHash = apiCall + params + secret;
  return crypto.createHash('sha1').update(stringToHash, 'utf8').digest('hex');
}

// AWS S3 Client
const s3Client = new S3Client({
  region: process.env.REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.BUCKET_NAME || '';

async function downloadAndUploadToS3(videoUrl: string, meetingId: string, recordId: string): Promise<string> {
  try {
    console.log('Downloading BBB recording from:', videoUrl);
    
    // Download the video from BBB
    const response = await fetch(videoUrl);
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.status} ${response.statusText}`);
    }
    
    const buffer = await response.arrayBuffer();
    const videoBuffer = Buffer.from(buffer);
    
    console.log('Downloaded video size:', videoBuffer.length, 'bytes');
    
    // Generate S3 key
    const timestamp = Date.now();
    const s3Key = `bbb_recordings/${meetingId}_${recordId}_${timestamp}.mp4`;
    
    // Upload to S3
    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: videoBuffer,
      ContentType: 'video/mp4',
    });
    
    await s3Client.send(uploadCommand);
    
    const s3Url = `https://${BUCKET_NAME}.s3.${process.env.REGION || 'ap-south-1'}.amazonaws.com/${s3Key}`;
    console.log('Video uploaded to S3:', s3Url);
    
    return s3Url;
  } catch (error: any) {
    console.error('Error downloading and uploading video:', error);
    throw error;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Get recordings for a meeting
    try {
      const { meetingId, classId } = req.query;

      if (!meetingId && !classId) {
        return res.status(400).json({
          success: false,
          error: 'meetingId or classId is required'
        });
      }

      // BBB API configuration
      const bbbServerUrl = 'https://class.techpratham.org/bigbluebutton';
      const bbbApiSecret = '77NxbTZnnrkERic8MBiqK5yOsUdMtmFjdgSmqr4Nj4';

      let searchMeetingId = meetingId as string;
      
      // If classId provided, construct meeting ID
      if (classId && !meetingId) {
        searchMeetingId = `class-${classId}`;
      }

      console.log('=== BBB RECORDINGS RETRIEVAL ===');
      console.log('Meeting ID:', searchMeetingId);

      // Get recordings from BBB
      const getRecordingsParams = searchMeetingId ? `meetingID=${searchMeetingId}` : '';
      const getRecordingsChecksum = generateBBBChecksum('getRecordings', getRecordingsParams, bbbApiSecret);
      const getRecordingsUrl = `${bbbServerUrl}/api/getRecordings?${getRecordingsParams}&checksum=${getRecordingsChecksum}`;

      console.log('BBB getRecordings URL:', getRecordingsUrl);

      const recordingsResponse = await fetch(getRecordingsUrl);
      const recordingsXML = await recordingsResponse.text();

      console.log('BBB recordings response:', recordingsXML);

      // Parse recordings from XML
      const recordings: any[] = [];
      
      if (recordingsXML.includes('<returncode>SUCCESS</returncode>')) {
        // Extract recordings using regex patterns
        const recordingMatches = recordingsXML.match(/<recording>(.*?)<\/recording>/gs);
        
        if (recordingMatches) {
          for (const recordingMatch of recordingMatches) {
            try {
              const recordIdMatch = recordingMatch.match(/<recordID><!\[CDATA\[(.*?)\]\]><\/recordID>/);
              const meetingIdMatch = recordingMatch.match(/<meetingID><!\[CDATA\[(.*?)\]\]><\/meetingID>/);
              const nameMatch = recordingMatch.match(/<name><!\[CDATA\[(.*?)\]\]><\/name>/);
              const publishedMatch = recordingMatch.match(/<published>(.*?)<\/published>/);
              const stateMatch = recordingMatch.match(/<state>(.*?)<\/state>/);
              const startTimeMatch = recordingMatch.match(/<startTime>(.*?)<\/startTime>/);
              const endTimeMatch = recordingMatch.match(/<endTime>(.*?)<\/endTime>/);
              
              // Extract playback URLs
              const playbackMatches = recordingMatch.match(/<playback>(.*?)<\/playback>/s);
              let videoUrl = null;
              
              if (playbackMatches) {
                const urlMatch = playbackMatches[1].match(/<url><!\[CDATA\[(.*?)\]\]><\/url>/);
                if (urlMatch) {
                  videoUrl = urlMatch[1];
                }
              }
              
              const recording = {
                recordId: recordIdMatch ? recordIdMatch[1] : null,
                meetingId: meetingIdMatch ? meetingIdMatch[1] : null,
                name: nameMatch ? nameMatch[1] : 'Recording',
                published: publishedMatch ? publishedMatch[1] === 'true' : false,
                state: stateMatch ? stateMatch[1] : 'processing',
                startTime: startTimeMatch ? parseInt(startTimeMatch[1]) : null,
                endTime: endTimeMatch ? parseInt(endTimeMatch[1]) : null,
                videoUrl: videoUrl,
                duration: null as number | null
              };
              
              // Calculate duration
              if (recording.startTime && recording.endTime) {
                recording.duration = Math.floor((recording.endTime - recording.startTime) / 1000 / 60); // in minutes
              }
              
              recordings.push(recording);
            } catch (parseError) {
              console.error('Error parsing individual recording:', parseError);
            }
          }
        }
      } else {
        console.log('No recordings found or BBB API error');
      }

      return res.status(200).json({
        success: true,
        meetingId: searchMeetingId,
        recordings: recordings,
        totalRecordings: recordings.length,
        message: recordings.length > 0 ? 'Recordings found' : 'No recordings found for this meeting'
      });

    } catch (error: any) {
      console.error('Error fetching BBB recordings:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch recordings: ' + error.message
      });
    }
  }

  if (req.method === 'POST') {
    // Download and save BBB recording to S3 and database
    try {
      const { recordId, meetingId, classId, videoUrl, name } = req.body;

      if (!recordId || !videoUrl || !classId) {
        return res.status(400).json({
          success: false,
          error: 'recordId, videoUrl, and classId are required'
        });
      }

      console.log('=== PROCESSING BBB RECORDING ===');
      console.log('Record ID:', recordId);
      console.log('Meeting ID:', meetingId);
      console.log('Class ID:', classId);
      console.log('Video URL:', videoUrl);

      // Download video and upload to S3
      const s3Url = await downloadAndUploadToS3(videoUrl, meetingId || 'unknown', recordId);

      // Save to database
      await connectMongo();
      
      const moduleClass = await ModuleClass.findById(classId);
      if (!moduleClass) {
        return res.status(404).json({
          success: false,
          error: 'Class not found'
        });
      }

      // Add recording to module class
      const newRecording = {
        url: s3Url,
        title: name || `BBB Recording - ${new Date().toLocaleDateString()}`,
        description: `BigBlueButton recording from ${moduleClass.moduleTitle}`,
        duration: 0, // We'll update this later if needed
        fileSize: 0, // We'll update this later if needed
        fileType: 'video/mp4',
        uploadedAt: new Date(),
        uploadedBy: 'BigBlueButton Auto-Upload',
        partNumber: (moduleClass.recordings?.length || 0) + 1,
        bbbRecordId: recordId,
        bbbMeetingId: meetingId
      };

      if (!moduleClass.recordings) {
        moduleClass.recordings = [];
      }
      moduleClass.recordings.push(newRecording);

      // Update BBB recording ID in class
      moduleClass.bbbRecordingId = recordId;

      await moduleClass.save();

      console.log('BBB recording saved to database and S3');

      return res.status(200).json({
        success: true,
        message: 'Recording processed and saved successfully',
        s3Url: s3Url,
        recordingId: newRecording._id,
        classId: classId
      });

    } catch (error: any) {
      console.error('Error processing BBB recording:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to process recording: ' + error.message
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}