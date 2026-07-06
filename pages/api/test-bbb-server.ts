import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const serverUrl = process.env.BIGBLUEBUTTON_SERVER_URL;
    const apiSecret = process.env.BIGBLUEBUTTON_API_SECRET;

    console.log('=== BBB CONFIGURATION TEST ===');
    console.log('Server URL:', serverUrl);
    console.log('API Secret length:', apiSecret ? apiSecret.length : 0);

    if (!serverUrl) {
      return res.status(500).json({
        success: false,
        error: 'BigBlueButton server URL not configured',
        config: { serverUrl: 'missing', apiSecret: apiSecret ? 'set' : 'missing' }
      });
    }

    if (!apiSecret) {
      return res.status(500).json({
        success: false,
        error: 'BigBlueButton API secret not configured',
        config: { serverUrl: serverUrl, apiSecret: 'missing' }
      });
    }

    // Test basic server connectivity
    let serverConnectivity = 'unknown';
    try {
      const response = await fetch(serverUrl, { 
        method: 'GET', 
        timeout: 10000,
        headers: { 'User-Agent': 'LMS-BBB-Test/1.0' }
      });
      serverConnectivity = `${response.status} ${response.statusText}`;
    } catch (connectError: any) {
      serverConnectivity = `Error: ${connectError.message}`;
    }

    // Test BBB API with a simple call
    let apiTest = 'not tested';
    try {
      const { getApiVersion } = require('@/lib/bigbluebutton');
      const apiVersion = await getApiVersion();
      apiTest = `Success - API Version: ${apiVersion}`;
    } catch (apiError: any) {
      apiTest = `Failed: ${apiError.message}`;
    }

    return res.status(200).json({
      success: true,
      config: {
        serverUrl: serverUrl,
        apiSecret: apiSecret ? `Set (${apiSecret.length} chars)` : 'Missing',
      },
      tests: {
        serverConnectivity,
        apiTest
      },
      recommendations: [
        'Verify BIGBLUEBUTTON_SERVER_URL is correct (e.g., https://class.techpratham.org)',
        'Verify BIGBLUEBUTTON_API_SECRET matches your BBB server configuration',
        'Check that BBB server is accessible from your network',
        'Ensure BBB server supports API version 2.0+'
      ]
    });

  } catch (error: any) {
    console.error('BBB configuration test error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to test BigBlueButton configuration: ' + error.message,
      troubleshooting: [
        'Check .env.local file for BIGBLUEBUTTON_SERVER_URL and BIGBLUEBUTTON_API_SECRET',
        'Verify environment variables are properly set',
        'Test server accessibility manually in browser',
        'Check BBB server logs for API call issues'
      ]
    });
  }
}