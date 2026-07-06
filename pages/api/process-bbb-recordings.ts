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

async function downloadAndUploadToS3(videoUrl: string, meetingId: string, recordId: string): Promise<{s3Url: string, fileSize: number}> {
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
    
    return { s3Url, fileSize: videoBuffer.length };
  } catch (error: any) {
    console.error('Error downloading and uploading video:', error);
    throw error;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { classId, meetingId } = req.body;

    if (!classId) {
      return res.status(400).json({
        success: false,
        error: 'classId is required'
      });
    }

    console.log('=== PROCESSING BBB RECORDINGS FOR CLASS ===');
    console.log('Class ID:', classId);
    console.log('Meeting ID:', meetingId);

    await connectMongo();

    // Get class details
    const moduleClass = await ModuleClass.findById(classId);
    if (!moduleClass) {
      return res.status(404).json({
        success: false,
        error: 'Class not found'
      });
    }

    // BBB API configuration
    const bbbServerUrl = 'https://class.techpratham.org/bigbluebutton';
    const bbbApiSecret = '77NxbTZnnrkERic8MBiqK5yOsUdMtmFjdgSmqr4Nj4';

    const searchMeetingId = meetingId || `class-${classId}`;
    
    console.log('Searching for recordings with meeting ID:', searchMeetingId);

    // Get recordings from BBB
    const getRecordingsParams = `meetingID=${searchMeetingId}`;
    const getRecordingsChecksum = generateBBBChecksum('getRecordings', getRecordingsParams, bbbApiSecret);
    const getRecordingsUrl = `${bbbServerUrl}/api/getRecordings?${getRecordingsParams}&checksum=${getRecordingsChecksum}`;

    console.log('BBB getRecordings URL:', getRecordingsUrl);

    const recordingsResponse = await fetch(getRecordingsUrl);
    const recordingsXML = await recordingsResponse.text();

    console.log('BBB recordings response:', recordingsXML);

    const processedRecordings: any[] = [];
    let skippedRecordings = 0;

    if (recordingsXML.includes('<returncode>SUCCESS</returncode>')) {
      // Extract recordings using regex patterns
      const recordingMatches = recordingsXML.match(/<recording>(.*?)<\/recording>/gs);
      
      if (recordingMatches && recordingMatches.length > 0) {
        console.log(`Found ${recordingMatches.length} recording(s) in BBB`);
        
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
            
            const recordId = recordIdMatch ? recordIdMatch[1] : null;
            const published = publishedMatch ? publishedMatch[1] === 'true' : false;
            const state = stateMatch ? stateMatch[1] : 'processing';
            
            console.log(`Processing recording: ${recordId}, published: ${published}, state: ${state}`);
            
            // Only process published recordings that are available
            if (recordId && videoUrl && published && state === 'published') {
              // Check if this recording is already processed
              const existingRecording = moduleClass.recordings?.find((rec: any) => 
                rec.bbbRecordId === recordId
              );
              
              if (existingRecording) {
                console.log(`Recording ${recordId} already exists in database, skipping`);
                skippedRecordings++;
                continue;
              }
              
              // Calculate duration
              let duration = 0;
              if (startTimeMatch && endTimeMatch) {
                const startTime = parseInt(startTimeMatch[1]);
                const endTime = parseInt(endTimeMatch[1]);
                duration = Math.floor((endTime - startTime) / 1000 / 60); // in minutes
              }
              
              console.log(`Downloading and uploading recording ${recordId} to S3...`);
              
              // Download video and upload to S3
              const { s3Url, fileSize } = await downloadAndUploadToS3(
                videoUrl, 
                searchMeetingId, 
                recordId
              );
              
              // Add recording to module class
              const newRecording = {
                url: s3Url,
                title: nameMatch ? nameMatch[1] : `${moduleClass.moduleTitle} Recording`,
                description: `BigBlueButton recording automatically uploaded from class session`,
                duration: duration * 60, // Convert to seconds for consistency
                fileSize: fileSize,
                fileType: 'video/mp4',
                uploadedAt: new Date(),
                uploadedBy: 'BBB Auto-Upload System',
                partNumber: (moduleClass.recordings?.length || 0) + 1,
                bbbRecordId: recordId,
                bbbMeetingId: searchMeetingId
              };

              if (!moduleClass.recordings) {
                moduleClass.recordings = [];
              }
              moduleClass.recordings.push(newRecording);
              
              processedRecordings.push({
                recordId: recordId,
                s3Url: s3Url,
                title: newRecording.title,
                duration: duration,
                fileSize: fileSize
              });
              
              console.log(`Successfully processed recording ${recordId}`);
              
            } else {
              console.log(`Skipping recording ${recordId}: published=${published}, state=${state}, hasVideoUrl=${!!videoUrl}`);
              skippedRecordings++;
            }
            
          } catch (recordingError: any) {
            console.error('Error processing individual recording:', recordingError);
            skippedRecordings++;
          }
        }
        
        if (processedRecordings.length > 0) {
          // Update BBB recording ID in class (use the first recording's ID)
          moduleClass.bbbRecordingId = processedRecordings[0].recordId;
          
          // Update class status to completed if it was live
          if (moduleClass.status === 'live') {
            moduleClass.status = 'completed';
            moduleClass.isLive = false;
            moduleClass.actualEndTime = new Date();
          }
          
          await moduleClass.save();
          console.log(`Updated module class with ${processedRecordings.length} new recording(s)`);
        }
        
      } else {
        console.log('No recording elements found in XML response');
      }
    } else {
      console.log('BBB API returned error or no recordings found');
    }

    return res.status(200).json({
      success: true,
      message: `Processing completed. ${processedRecordings.length} recordings processed, ${skippedRecordings} skipped.`,
      classId: classId,
      meetingId: searchMeetingId,
      processedRecordings: processedRecordings,
      totalProcessed: processedRecordings.length,
      totalSkipped: skippedRecordings,
      recordingsInClass: moduleClass.recordings?.length || 0
    });

  } catch (error: any) {
    console.error('Error processing BBB recordings:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process BBB recordings: ' + error.message
    });
  }
}