import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

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
    console.log('📹 FETCHING ALL BBB RECORDINGS...');

    const bbbServerUrl = 'https://class.techpratham.org/bigbluebutton';
    const bbbApiSecret = '77NxbTZnnrkERic8MBiqK5yOsUdMtmFjdgSmqr4Nj4';

    // Get ALL recordings from BigBlueButton
    const getRecordingsParams = '';
    const getRecordingsChecksum = generateBBBChecksum('getRecordings', getRecordingsParams, bbbApiSecret);
    const getRecordingsUrl = `${bbbServerUrl}/api/getRecordings?checksum=${getRecordingsChecksum}`;

    console.log('BBB API URL:', getRecordingsUrl);

    const recordingsResponse = await fetch(getRecordingsUrl);
    const recordingsXML = await recordingsResponse.text();

    console.log('BBB Response length:', recordingsXML.length);

    if (!recordingsXML.includes('<returncode>SUCCESS</returncode>')) {
      return res.status(500).json({
        success: false,
        error: 'BBB API call failed',
        response: recordingsXML.substring(0, 500)
      });
    }

    const recordings: any[] = [];

    // Parse recordings from XML
    const recordingMatches = recordingsXML.match(/<recording>(.*?)<\/recording>/gs);
    
    if (recordingMatches) {
      for (const recordingMatch of recordingMatches) {
        try {
          // Parse recording data - handle both CDATA and regular tags
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
          const playbackMatches = recordingMatch.match(/<playback>(.*?)<\/playback>/s);
          let videoUrl = null;
          let previewUrl = null;

          if (playbackMatches) {
            const urlCDATA = playbackMatches[1].match(/<url><!\[CDATA\[(.*?)\]\]><\/url>/);
            const urlRegular = playbackMatches[1].match(/<url>(.*?)<\/url>/);
            videoUrl = urlCDATA?.[1] || urlRegular?.[1];

            // Look for preview images
            const previewMatches = playbackMatches[1].match(/<preview>(.*?)<\/preview>/s);
            if (previewMatches) {
              const previewImageMatch = previewMatches[1].match(/<images>(.*?)<\/images>/s);
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

          recordings.push({
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

    // Sort by date (newest first)
    recordings.sort((a, b) => {
      if (a.startTime && b.startTime) {
        return parseInt(b.startTime) - parseInt(a.startTime);
      }
      return 0;
    });

    console.log(`📹 Found ${recordings.length} recordings in BBB`);

    return res.status(200).json({
      success: true,
      message: `Found ${recordings.length} recordings on BigBlueButton server`,
      totalRecordings: recordings.length,
      readyRecordings: recordings.filter(r => r.canDownload).length,
      processingRecordings: recordings.filter(r => !r.canDownload).length,
      recordings: recordings,
      serverInfo: {
        url: bbbServerUrl,
        responseTime: Date.now(),
        apiWorking: true
      }
    });

  } catch (error: any) {
    console.error('❌ Error fetching BBB recordings:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      serverInfo: {
        url: 'https://class.techpratham.org/bigbluebutton',
        apiWorking: false
      }
    });
  }
}