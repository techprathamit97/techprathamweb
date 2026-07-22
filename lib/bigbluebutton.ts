/**
 * BigBlueButton API Integration
 *
 * This library provides functions to interact with BigBlueButton servers
 * for video conferencing, screen sharing, and live classes.
 *
 * Required environment variables:
 * - BIGBLUEBUTTON_SERVER_URL: Your BBB server URL (e.g., https://bbb.example.com)
 * - BIGBLUEBUTTON_API_SECRET: Your BBB API secret
 */

import crypto from 'crypto';
import { XMLParser } from 'fast-xml-parser';

const getConfig = () => ({
  serverUrl: process.env.BIGBLUEBUTTON_SERVER_URL,
  apiSecret: process.env.BIGBLUEBUTTON_API_SECRET,
});

/**
 * Generate checksum for BBB API calls
 * BBB expects: apiCall + params (sorted alphabetically) + secret
 * Params should NOT be URL encoded for checksum calculation
 */
function generateChecksum(apiCall: string, params: string, secret: string): string {
  // For checksum, we use the raw params (not URL encoded)
  const stringToHash = apiCall + params + secret;
  const checksum = crypto.createHash('sha1').update(stringToHash, 'utf8').digest('hex');
  
  console.log('[BBB CHECKSUM] Input string:', stringToHash);
  console.log('[BBB CHECKSUM] Generated:', checksum);
  
  return checksum;
}

/**
 * Make API call to BigBlueButton server
 */
async function bbbApiCall(
  apiCall: string,
  params: Record<string, string> = {}
): Promise<any> {
  const { serverUrl, apiSecret } = getConfig();

  if (!serverUrl || !apiSecret) {
    throw new Error('BigBlueButton is not configured. Please set BIGBLUEBUTTON_SERVER_URL and BIGBLUEBUTTON_API_SECRET in .env.local');
  }

  console.log(`[BBB API] Making ${apiCall} call with params:`, params);
  console.log(`[BBB API] Server URL: ${serverUrl}`);
  console.log(`[BBB API] API Secret length: ${apiSecret.length}`);
  console.log(`[BBB API] API Secret (first 10): ${apiSecret.substring(0, 10)}...`);

  // Sort params alphabetically - BBB requires specific ordering
  const sortedKeys = Object.keys(params).sort();
  console.log(`[BBB API] Sorted param keys:`, sortedKeys);

  // Build params string for checksum (raw values, not URL encoded)
  const paramsForChecksum = sortedKeys
    .map(key => `${key}=${params[key]}`)
    .join('&');

  console.log(`[BBB API] Params for checksum: "${paramsForChecksum}"`);
  console.log(`[BBB API] Checksum input string: "${apiCall}${paramsForChecksum}${apiSecret}"`);

  // Generate checksum using raw params
  const checksum = generateChecksum(apiCall, paramsForChecksum, apiSecret);

  // Build params string for URL (URL encoded)
  const paramsForUrl = sortedKeys
    .map(key => `${key}=${encodeURIComponent(params[key])}`)
    .join('&');

  // Build final URL - BBB expects /api/ at the end
  const apiUrl = serverUrl.endsWith('/api') ? serverUrl : `${serverUrl}/api`;
  const finalParams = paramsForUrl ? `${paramsForUrl}&checksum=${checksum}` : `checksum=${checksum}`;
  const url = `${apiUrl}/${apiCall}?${finalParams}`;

  console.log(`[BBB API] Final URL:`, url);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'LMS-BBB-Integration/1.0'
      }
    });

    const text = await response.text();
    console.log(`[BBB API] Response status:`, response.status, response.statusText);
    console.log(`[BBB API] Response body:`, text.substring(0, 500));

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText} - ${text}`);
    }

    // Parse XML response using fast-xml-parser
    const parser = new XMLParser({
      ignoreAttributes: false,
      parseAttributeValue: true,
      parseTagValue: true,
      trimValues: true
    });
    
    let xml;
    try {
      xml = parser.parse(text);
    } catch (parseError: any) {
      console.error('[BBB API] XML Parse Error:', parseError);
      console.error('[BBB API] Raw response:', text);
      throw new Error(`Invalid XML response from BigBlueButton server: ${parseError.message}`);
    }

    const responseNode = xml.response;

    if (!responseNode) {
      console.error('[BBB API] No response node found in XML:', xml);
      throw new Error('Invalid response from BigBlueButton server - no response node');
    }

    // Helper to get text content from a node
    const getText = (node: any, tag: string): string => {
      if (!node || !node[tag]) return '';
      const child = node[tag];
      if (typeof child === 'string') return child;
      if (typeof child === 'object') {
        return child['#text'] || child.toString() || '';
      }
      return child.toString() || '';
    };

    const returncode = getText(responseNode, 'returncode');
    const result: any = {
      returncode,
      message: getText(responseNode, 'message'),
      messageKey: getText(responseNode, 'messageKey'),
    };

    console.log(`[BBB API] Parsed result:`, result);

    // Add additional response data based on API call
    if (apiCall === 'create') {
      result.meetingID = getText(responseNode, 'meetingID');
      result.internalMeetingID = getText(responseNode, 'internalMeetingID');
      result.attendeePassword = getText(responseNode, 'attendeePW');
      result.moderatorPassword = getText(responseNode, 'moderatorPW');
      result.createTime = getText(responseNode, 'createTime');
      result.voiceBridge = getText(responseNode, 'voiceBridge');
    } else if (apiCall === 'join') {
      result.url = getText(responseNode, 'url');
    } else if (apiCall === 'getMeetingInfo' || apiCall === 'isMeetingRunning') {
      result.meetingID = getText(responseNode, 'meetingID');
      result.running = getText(responseNode, 'running');
      result.participantCount = getText(responseNode, 'participantCount');
      result.duration = getText(responseNode, 'duration');
    }

    if (returncode !== 'SUCCESS') {
      console.error('[BBB API] Error response:', result);
      throw new Error(result.message || `BBB API call failed: ${result.messageKey || 'Unknown error'}`);
    }

    return result;
  } catch (error: any) {
    console.error('[BBB API] Request failed:', error);
    throw error;
  }
}

/**
 * Create a new BigBlueButton meeting
 */
export async function createMeeting(
  meetingId: string,
  meetingName: string,
  options: {
    attendeePW?: string;
    moderatorPW?: string;
    welcome?: string;
    duration?: number;
    record?: boolean;
    recordVideo?: boolean;
    autoStartRecording?: boolean;
    allowStartStopRecording?: boolean;
    moderatorOnlyMessage?: string;
    logoutURL?: string;
  } = {}
): Promise<{
  success: boolean;
  meetingId: string;
  internalMeetingId: string;
  attendeePassword: string;
  moderatorPassword: string;
  createTime: string;
  joinUrl?: string;
  moderatorJoinUrl?: string;
}> {
  console.log('[BBB CREATE] Starting meeting creation...');
  console.log('[BBB CREATE] Meeting ID:', meetingId);
  console.log('[BBB CREATE] Meeting Name:', meetingName);
  console.log('[BBB CREATE] Options:', options);

  const params: Record<string, string> = {
    meetingID: meetingId,
    name: meetingName,
  };

  // Only add parameters that have values
  if (options.welcome) params.welcome = options.welcome;
  if (options.attendeePW) params.attendeePW = options.attendeePW;
  if (options.moderatorPW) params.moderatorPW = options.moderatorPW;
  if (options.duration) params.duration = options.duration.toString();
  if (options.record) params.record = 'true';
  if (options.recordVideo) params.recordVideo = 'true';
  if (options.autoStartRecording) params.autoStartRecording = 'true';
  if (options.allowStartStopRecording) params.allowStartStopRecording = 'true';
  if (options.moderatorOnlyMessage) params.moderatorOnlyMessage = options.moderatorOnlyMessage;
  if (options.logoutURL) params.logoutURL = options.logoutURL;

  console.log('[BBB CREATE] Final params:', params);

  try {
    const result = await bbbApiCall('create', params);
    console.log('[BBB CREATE] API call result:', result);

    if (result.returncode === 'SUCCESS') {
      // Generate join URLs using the API (which includes proper checksum)
      const attendeePassword = result.attendeePassword || result.attendeePW;
      const moderatorPassword = result.moderatorPassword || result.moderatorPW;
      const actualMeetingId = result.meetingID;

      console.log('[BBB CREATE] Meeting created successfully:', {
        inputMeetingId: meetingId,
        actualMeetingId: actualMeetingId,
        attendeePassword: attendeePassword ? 'set' : 'missing',
        moderatorPassword: moderatorPassword ? 'set' : 'missing'
      });

      // Generate join URLs with proper checksums via BBB API
      const joinResult = await getJoinUrl(actualMeetingId, 'Student', attendeePassword, 'attendee');
      const moderatorJoinResult = await getJoinUrl(actualMeetingId, 'Trainer', moderatorPassword, 'moderator');

      return {
        success: true,
        meetingId: actualMeetingId,
        internalMeetingId: result.internalMeetingID,
        attendeePassword,
        moderatorPassword,
        createTime: result.createTime,
        joinUrl: joinResult.joinUrl,
        moderatorJoinUrl: moderatorJoinResult.joinUrl,
      };
    } else {
      console.error('[BBB CREATE] Meeting creation failed:', result);
      throw new Error(result.message || 'Failed to create meeting');
    }
  } catch (error: any) {
    console.error('[BBB CREATE] Error during meeting creation:', error);
    throw error;
  }
}

/**
 * Generate a join URL for a participant
 */
export async function getJoinUrl(
  meetingId: string,
  userName: string,
  password: string,
  role: 'moderator' | 'attendee' = 'attendee'
): Promise<{ success: boolean; joinUrl: string }> {
  console.log('[BBB JOIN] Generating join URL...');
  console.log('[BBB JOIN] Meeting ID:', meetingId);
  console.log('[BBB JOIN] User Name:', userName);
  console.log('[BBB JOIN] Role:', role);

  const params: Record<string, string> = {
    meetingID: meetingId,
    password,
    fullName: userName,
    redirect: 'true'
  };

  if (role === 'moderator') {
    params.role = 'moderator';
  }

  console.log('[BBB JOIN] Join params:', params);

  try {
    const result = await bbbApiCall('join', params);
    console.log('[BBB JOIN] API call result:', result);

    if (result.returncode === 'SUCCESS' && result.url) {
      return {
        success: true,
        joinUrl: result.url,
      };
    }

    throw new Error(result.message || 'Failed to get join URL');
  } catch (error: any) {
    console.error('[BBB JOIN] Error during join URL generation:', error);
    throw error;
  }
}

/**
 * Check if a meeting is running
 */
export async function isMeetingRunning(meetingId: string): Promise<boolean> {
  const result = await bbbApiCall('isMeetingRunning', { meetingID: meetingId });
  return result.running === 'true';
}

/**
 * Get meeting information
 */
export async function getMeetingInfo(
  meetingId: string
): Promise<{
  success: boolean;
  meetingId: string;
  running: boolean;
  participantCount: number;
  duration: number;
  startTime?: string;
  endTime?: string;
}> {
  const result = await bbbApiCall('getMeetingInfo', { meetingID: meetingId });

  if (result.returncode === 'SUCCESS') {
    return {
      success: true,
      meetingId: result.meetingID,
      running: result.running === 'true',
      participantCount: parseInt(result.participantCount || '0'),
      duration: parseInt(result.duration || '0'),
      startTime: result.startTime,
      endTime: result.endTime,
    };
  }

  throw new Error(result.message || 'Failed to get meeting info');
}

/**
 * End a meeting
 */
export async function endMeeting(
  meetingId: string,
  password: string
): Promise<{ success: boolean }> {
  const result = await bbbApiCall('endMeeting', {
    meetingID: meetingId,
    password,
  });

  if (result.returncode === 'SUCCESS') {
    return { success: true };
  }

  throw new Error(result.message || 'Failed to end meeting');
}

/**
 * Get recordings for a meeting
 */
export async function getRecordings(
  meetingId?: string
): Promise<{ success: boolean; recordings: any[] }> {
  const params: Record<string, string> = {};
  if (meetingId) {
    params.meetingID = meetingId;
  }

  const result = await bbbApiCall('getRecordings', params);

  if (result.returncode === 'SUCCESS') {
    return {
      success: true,
      recordings: result.recordings || [],
    };
  }

  throw new Error(result.message || 'Failed to get recordings');
}

/**
 * Publish/unpublish a recording
 */
export async function publishRecording(
  recordId: string,
  publish: boolean
): Promise<{ success: boolean }> {
  const result = await bbbApiCall('publishRecordings', {
    recordID: recordId,
    publish: publish ? 'true' : 'false',
  });

  if (result.returncode === 'SUCCESS') {
    return { success: true };
  }

  throw new Error(result.message || 'Failed to publish recording');
}

/**
 * Delete a recording
 */
export async function deleteRecording(
  recordId: string
): Promise<{ success: boolean }> {
  const result = await bbbApiCall('deleteRecordings', {
    recordID: recordId,
  });

  if (result.returncode === 'SUCCESS') {
    return { success: true };
  }

  throw new Error(result.message || 'Failed to delete recording');
}

/**
 * Get API version
 */
export async function getApiVersion(): Promise<string> {
  const { serverUrl } = getConfig();

  if (!serverUrl) {
    throw new Error('BigBlueButton is not configured');
  }

  const response = await fetch(`${serverUrl}/bigbluebutton/api`);
  const text = await response.text();
  const parser = new XMLParser();
  const xml = parser.parse(text);

  return xml.response?.['apis version']?.['#text'] || xml.response?.['apis version'] || 'unknown';
}

export default {
  createMeeting,
  getJoinUrl,
  isMeetingRunning,
  getMeetingInfo,
  endMeeting,
  getRecordings,
  publishRecording,
  deleteRecording,
  getApiVersion,
};