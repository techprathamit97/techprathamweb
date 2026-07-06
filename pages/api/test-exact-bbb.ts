import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('=== EXACT BBB TEST ===');
    
    const serverUrl = process.env.BIGBLUEBUTTON_SERVER_URL;
    const apiSecret = process.env.BIGBLUEBUTTON_API_SECRET;
    
    console.log('Server URL:', serverUrl);
    console.log('API Secret:', apiSecret);
    
    if (!serverUrl || !apiSecret) {
      return res.status(500).json({
        success: false,
        error: 'BBB configuration missing'
      });
    }

    // Replicate the EXACT working example from API-Mate
    const meetingId = `test-${Date.now()}`;
    
    // Use the same parameters as the working API-Mate example
    const params = {
      allowStartStopRecording: 'true',
      attendeePW: 'ap',
      autoStartRecording: 'false',
      meetingID: meetingId,
      moderatorPW: 'mp', 
      name: meetingId,
      record: 'false',
      voiceBridge: '75796',
      welcome: 'Welcome to the test meeting!'
    };

    console.log('Test params:', params);

    // Sort parameters alphabetically (BBB requirement)
    const sortedKeys = Object.keys(params).sort();
    console.log('Sorted keys:', sortedKeys);

    // Build query string for checksum (no encoding)
    const queryForChecksum = sortedKeys
      .map(key => `${key}=${params[key as keyof typeof params]}`)
      .join('&');
    
    console.log('Query for checksum:', queryForChecksum);

    // Build checksum input: apiCall + queryString + secret
    const checksumInput = `create${queryForChecksum}${apiSecret}`;
    console.log('Checksum input:', checksumInput);

    // Generate SHA1 checksum
    const checksum = crypto.createHash('sha1').update(checksumInput, 'utf8').digest('hex');
    console.log('Generated checksum:', checksum);

    // Build query string for URL (with encoding)
    const queryForUrl = sortedKeys
      .map(key => `${key}=${encodeURIComponent(params[key as keyof typeof params])}`)
      .join('&');

    // Build final URL
    const apiUrl = serverUrl.endsWith('/api') ? serverUrl : `${serverUrl}/api`;
    const finalUrl = `${apiUrl}/create?${queryForUrl}&checksum=${checksum}`;
    
    console.log('Final URL:', finalUrl);

    // Make the API call
    const response = await fetch(finalUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'LMS-BBB-Test/1.0'
      }
    });

    const responseText = await response.text();
    console.log('Response status:', response.status);
    console.log('Response text:', responseText);

    if (response.ok) {
      // Parse XML response to check if successful
      if (responseText.includes('<returncode>SUCCESS</returncode>')) {
        return res.status(200).json({
          success: true,
          message: 'BBB API call successful!',
          meetingId: meetingId,
          checksum: checksum,
          url: finalUrl,
          response: responseText.substring(0, 500) // First 500 chars
        });
      } else {
        return res.status(500).json({
          success: false,
          error: 'BBB returned non-SUCCESS response',
          response: responseText,
          url: finalUrl,
          checksum: checksum
        });
      }
    } else {
      return res.status(500).json({
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        response: responseText,
        url: finalUrl,
        checksum: checksum
      });
    }

  } catch (error: any) {
    console.error('Exact BBB test error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to test BBB: ' + error.message,
      stack: error.stack
    });
  }
}