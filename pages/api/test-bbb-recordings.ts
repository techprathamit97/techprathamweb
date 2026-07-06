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
    // BBB API configuration
    const bbbServerUrl = 'https://class.techpratham.org/bigbluebutton';
    const bbbApiSecret = '77NxbTZnnrkERic8MBiqK5yOsUdMtmFjdgSmqr4Nj4';
    
    console.log('=== TESTING BBB RECORDINGS API ===');
    
    // Test 1: Get all recordings
    console.log('1. Testing getRecordings API (all recordings)...');
    const getAllRecordingsChecksum = generateBBBChecksum('getRecordings', '', bbbApiSecret);
    const getAllRecordingsUrl = `${bbbServerUrl}/api/getRecordings?checksum=${getAllRecordingsChecksum}`;
    
    console.log('Get all recordings URL:', getAllRecordingsUrl);
    
    const allRecordingsResponse = await fetch(getAllRecordingsUrl);
    const allRecordingsXML = await allRecordingsResponse.text();
    
    console.log('All recordings response (first 500 chars):', allRecordingsXML.substring(0, 500));
    
    // Parse total recordings count
    let totalRecordings = 0;
    const recordingMatches = allRecordingsXML.match(/<recording>/g);
    if (recordingMatches) {
      totalRecordings = recordingMatches.length;
    }
    
    // Test 2: Get recordings for a specific test meeting
    console.log('2. Testing getRecordings API for specific meeting...');
    const testMeetingId = 'class-test-12345';
    const getSpecificRecordingsParams = `meetingID=${testMeetingId}`;
    const getSpecificRecordingsChecksum = generateBBBChecksum('getRecordings', getSpecificRecordingsParams, bbbApiSecret);
    const getSpecificRecordingsUrl = `${bbbServerUrl}/api/getRecordings?${getSpecificRecordingsParams}&checksum=${getSpecificRecordingsChecksum}`;
    
    console.log('Get specific recordings URL:', getSpecificRecordingsUrl);
    
    const specificRecordingsResponse = await fetch(getSpecificRecordingsUrl);
    const specificRecordingsXML = await specificRecordingsResponse.text();
    
    console.log('Specific recordings response (first 300 chars):', specificRecordingsXML.substring(0, 300));
    
    // Test 3: Verify recording creation setup
    console.log('3. Testing recording-enabled meeting creation...');
    
    const createTestMeetingParams = {
      meetingID: `recording-test-${Date.now()}`,
      name: 'Recording Test Meeting',
      attendeePW: 'student123',
      moderatorPW: 'trainer123',
      record: 'true',
      autoStartRecording: 'true',
      allowStartStopRecording: 'true',
      welcome: 'This is a recording test meeting'
    };
    
    const createParamsString = Object.keys(createTestMeetingParams)
      .sort()
      .map(key => `${key}=${encodeURIComponent(createTestMeetingParams[key as keyof typeof createTestMeetingParams])}`)
      .join('&');
    
    const createChecksum = generateBBBChecksum('create', createParamsString, bbbApiSecret);
    const createUrl = `${bbbServerUrl}/api/create?${createParamsString}&checksum=${createChecksum}`;
    
    console.log('Create recording-enabled meeting URL:', createUrl);
    
    const createResponse = await fetch(createUrl);
    const createXML = await createResponse.text();
    
    console.log('Create meeting response:', createXML);
    
    const meetingCreated = createXML.includes('<returncode>SUCCESS</returncode>');
    
    // Extract sample recording data if available
    let sampleRecordings: any[] = [];
    if (recordingMatches && recordingMatches.length > 0) {
      const firstRecordingMatch = allRecordingsXML.match(/<recording>(.*?)<\/recording>/s);
      if (firstRecordingMatch) {
        const recordingData = firstRecordingMatch[1];
        
        const recordIdMatch = recordingData.match(/<recordID><!\[CDATA\[(.*?)\]\]><\/recordID>/);
        const meetingIdMatch = recordingData.match(/<meetingID><!\[CDATA\[(.*?)\]\]><\/meetingID>/);
        const nameMatch = recordingData.match(/<name><!\[CDATA\[(.*?)\]\]><\/name>/);
        const publishedMatch = recordingData.match(/<published>(.*?)<\/published>/);
        const stateMatch = recordingData.match(/<state>(.*?)<\/state>/);
        
        const playbackMatch = recordingData.match(/<playback>(.*?)<\/playback>/s);
        let videoUrl = null;
        if (playbackMatch) {
          const urlMatch = playbackMatch[1].match(/<url><!\[CDATA\[(.*?)\]\]><\/url>/);
          if (urlMatch) {
            videoUrl = urlMatch[1];
          }
        }
        
        sampleRecordings.push({
          recordId: recordIdMatch ? recordIdMatch[1] : null,
          meetingId: meetingIdMatch ? meetingIdMatch[1] : null,
          name: nameMatch ? nameMatch[1] : null,
          published: publishedMatch ? publishedMatch[1] === 'true' : false,
          state: stateMatch ? stateMatch[1] : null,
          videoUrl: videoUrl
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'BBB Recording API test completed',
      results: {
        serverUrl: bbbServerUrl,
        secretConfigured: !!bbbApiSecret,
        secretLength: bbbApiSecret ? bbbApiSecret.length : 0,
        
        allRecordings: {
          totalFound: totalRecordings,
          apiWorking: allRecordingsXML.includes('<returncode>SUCCESS</returncode>'),
          hasError: allRecordingsXML.includes('<returncode>FAILED</returncode>')
        },
        
        specificMeetingRecordings: {
          meetingId: testMeetingId,
          apiWorking: specificRecordingsXML.includes('<returncode>SUCCESS</returncode>'),
          hasError: specificRecordingsXML.includes('<returncode>FAILED</returncode>')
        },
        
        meetingCreation: {
          meetingId: createTestMeetingParams.meetingID,
          created: meetingCreated,
          recordingEnabled: createTestMeetingParams.record === 'true',
          autoStartRecording: createTestMeetingParams.autoStartRecording === 'true'
        },
        
        sampleRecordings: sampleRecordings
      },
      
      instructions: [
        '1. Check that BBB API is working (allRecordings.apiWorking should be true)',
        '2. Total recordings found: ' + totalRecordings,
        '3. Recording-enabled meeting creation: ' + (meetingCreated ? 'SUCCESS' : 'FAILED'),
        '4. If no recordings found, create a test class and record it first',
        '5. Use the process-bbb-recordings API after class ends to download recordings'
      ],
      
      nextSteps: {
        ifNoRecordings: 'Create a test class, join as trainer, record some content, then end the meeting',
        ifHasRecordings: 'Use POST /api/process-bbb-recordings with classId to download and save to S3',
        testProcessing: 'Use POST /api/bbb-recordings to manually process a specific recording'
      }
    });

  } catch (error: any) {
    console.error('BBB Recording test error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to test BBB recording functionality'
    });
  }
}