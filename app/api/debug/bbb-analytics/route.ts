import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Helper function to generate BBB API checksum
function generateBBBChecksum(apiCall: string, params: string, secret: string): string {
  const stringToHash = apiCall + params + secret;
  return crypto.createHash('sha1').update(stringToHash, 'utf8').digest('hex');
}

// GET /api/debug/bbb-analytics?recordId=X
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const recordId = searchParams.get('recordId');

    if (!recordId) {
      return NextResponse.json({
        success: false,
        error: 'Recording ID is required',
        example: '/api/debug/bbb-analytics?recordId=837e699dba1a1d42cd62e9189c39b6f974e6d802-1791809925594'
      }, { status: 400 });
    }

    console.log('🔍 Debug BBB Learning Analytics for recordId:', recordId);
    
    const bbbServerUrl = process.env.BIGBLUEBUTTON_SERVER_URL?.replace('/bigbluebutton/', '') || 'https://class.techpratham.com';
    const bbbApiSecret = process.env.BIGBLUEBUTTON_API_SECRET || '';
    
    const debug = {
      recordId,
      bbbServerUrl,
      bbbApiSecretPresent: !!bbbApiSecret,
      steps: [] as string[]
    };

    // Step 1: Try BBB getRecordings API
    debug.steps.push('1. Calling BBB getRecordings API...');
    const getRecordingsParams = '';
    const getRecordingsChecksum = generateBBBChecksum('getRecordings', getRecordingsParams, bbbApiSecret);
    const getRecordingsUrl = `${bbbServerUrl}/bigbluebutton/api/getRecordings?checksum=${getRecordingsChecksum}`;
    
    debug.steps.push(`BBB API URL: ${getRecordingsUrl}`);
    
    const recordingsResponse = await fetch(getRecordingsUrl);
    debug.steps.push(`BBB API Response Status: ${recordingsResponse.status}`);
    
    if (!recordingsResponse.ok) {
      return NextResponse.json({
        success: false,
        error: `BBB API call failed: ${recordingsResponse.status}`,
        debug
      }, { status: 500 });
    }

    const recordingsXML = await recordingsResponse.text();
    debug.steps.push(`BBB API Response Length: ${recordingsXML.length} characters`);
    
    if (!recordingsXML.includes('<returncode>SUCCESS</returncode>')) {
      debug.steps.push('❌ BBB API returned error');
      return NextResponse.json({
        success: false,
        error: 'BBB API call failed',
        debug,
        xmlPreview: recordingsXML.substring(0, 500)
      }, { status: 500 });
    }

    debug.steps.push('✅ BBB API call successful');

    // Step 2: Find the specific recording
    const recordingMatches = recordingsXML.match(/<recording>([\s\S]*?)<\/recording>/g);
    
    if (!recordingMatches) {
      debug.steps.push('❌ No recordings found in BBB response');
      return NextResponse.json({
        success: false,
        error: 'No recordings found',
        debug
      });
    }

    debug.steps.push(`Found ${recordingMatches.length} recordings in BBB response`);

    let foundRecording = false;
    let internalMeetingId = null;
    let recordingData = null;

    for (const recordingMatch of recordingMatches) {
      const recordIdCDATA = recordingMatch.match(/<recordID><!\[CDATA\[(.*?)\]\]><\/recordID>/);
      const recordIdRegular = recordingMatch.match(/<recordID>(.*?)<\/recordID>/);
      const currentRecordId = recordIdCDATA?.[1] || recordIdRegular?.[1];
      
      if (currentRecordId === recordId) {
        foundRecording = true;
        debug.steps.push(`✅ Found matching recording: ${currentRecordId}`);
        
        // Extract internal meeting ID
        const internalMeetingIdMatch = recordingMatch.match(/<internalMeetingID>(.*?)<\/internalMeetingID>/);
        internalMeetingId = internalMeetingIdMatch?.[1];
        
        // Extract other useful data
        const nameMatch = recordingMatch.match(/<name><!\[CDATA\[(.*?)\]\]><\/name>/) || 
                         recordingMatch.match(/<name>(.*?)<\/name>/);
        const meetingIdMatch = recordingMatch.match(/<meetingID><!\[CDATA\[(.*?)\]\]><\/meetingID>/) ||
                              recordingMatch.match(/<meetingID>(.*?)<\/meetingID>/);
        
        recordingData = {
          recordId: currentRecordId,
          name: nameMatch?.[1] || 'Unknown',
          meetingId: meetingIdMatch?.[1] || 'Unknown',
          internalMeetingId
        };
        
        debug.steps.push(`Recording Name: ${recordingData.name}`);
        debug.steps.push(`Meeting ID: ${recordingData.meetingId}`);
        debug.steps.push(`Internal Meeting ID: ${internalMeetingId}`);
        break;
      }
    }

    if (!foundRecording) {
      debug.steps.push(`❌ Recording ${recordId} not found in BBB response`);
      return NextResponse.json({
        success: false,
        error: `Recording ${recordId} not found`,
        debug,
        availableRecordings: recordingMatches.map(match => {
          const recordIdCDATA = match.match(/<recordID><!\[CDATA\[(.*?)\]\]><\/recordID>/);
          const recordIdRegular = match.match(/<recordID>(.*?)<\/recordID>/);
          return recordIdCDATA?.[1] || recordIdRegular?.[1];
        }).slice(0, 5) // Show first 5 for debugging
      });
    }

    if (!internalMeetingId) {
      debug.steps.push('❌ Internal meeting ID not found in recording data');
      return NextResponse.json({
        success: false,
        error: 'Internal meeting ID not found',
        debug,
        recordingData
      });
    }

    // Step 3: Try to fetch learning analytics data
    debug.steps.push('3. Attempting to fetch BBB Learning Analytics...');
    const analyticsUrl = `${bbbServerUrl}/learning-analytics-dashboard/${recordId}/${internalMeetingId}/learning_dashboard_data.json`;
    debug.steps.push(`Analytics URL: ${analyticsUrl}`);
    
    const analyticsResponse = await fetch(analyticsUrl);
    debug.steps.push(`Analytics Response Status: ${analyticsResponse.status}`);
    debug.steps.push(`Analytics Response Headers: ${JSON.stringify(Object.fromEntries(analyticsResponse.headers))}`);
    
    if (!analyticsResponse.ok) {
      debug.steps.push(`❌ Analytics fetch failed: ${analyticsResponse.status} ${analyticsResponse.statusText}`);
      
      // Try to get the error response
      let errorText = '';
      try {
        errorText = await analyticsResponse.text();
        debug.steps.push(`Error Response: ${errorText.substring(0, 500)}`);
      } catch (e) {
        debug.steps.push('Could not read error response');
      }
      
      return NextResponse.json({
        success: false,
        error: `Analytics data not accessible: ${analyticsResponse.status}`,
        debug,
        recordingData,
        analyticsUrl,
        errorResponse: errorText.substring(0, 500)
      });
    }

    debug.steps.push('✅ Analytics data fetched successfully');
    
    // Step 4: Parse analytics data
    const analyticsData = await analyticsResponse.json();
    debug.steps.push(`Analytics data keys: ${Object.keys(analyticsData).join(', ')}`);
    
    if (analyticsData.users_data) {
      const userCount = Object.keys(analyticsData.users_data).length;
      debug.steps.push(`Found ${userCount} users in analytics data`);
      
      const participants = Object.entries(analyticsData.users_data).map(([userId, userData]: [string, any]) => {
        const baseName = userData.name ? userData.name.replace(/-[a-z0-9]{8,}$/i, '') : 'Unknown';
        
        return {
          userId,
          name: baseName,
          fullName: userData.name,
          role: userData.role || 'viewer',
          totalOfMessages: userData.totalOfMessages || 0,
          sessionCount: userData.intIds?.length || 0
        };
      });
      
      debug.steps.push('✅ Participants extracted successfully');
      
      return NextResponse.json({
        success: true,
        message: `Found ${participants.length} participants in BBB Learning Analytics`,
        debug,
        recordingData,
        analyticsUrl,
        participants,
        analyticsDataKeys: Object.keys(analyticsData)
      });
    } else {
      debug.steps.push('❌ No users_data found in analytics response');
      return NextResponse.json({
        success: false,
        error: 'No user data found in analytics',
        debug,
        recordingData,
        analyticsData: Object.keys(analyticsData)
      });
    }

  } catch (error: any) {
    console.error('❌ Debug BBB Analytics error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}