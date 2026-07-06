import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const serverUrl = process.env.BIGBLUEBUTTON_SERVER_URL;
    const apiSecret = process.env.BIGBLUEBUTTON_API_SECRET;

    console.log('=== BBB DEBUG INFO ===');
    
    return res.status(200).json({
      success: true,
      config: {
        serverUrl: serverUrl || 'NOT SET',
        apiSecretLength: apiSecret ? apiSecret.length : 0,
        apiSecretSet: !!apiSecret,
        envVarsFromProcess: {
          BIGBLUEBUTTON_SERVER_URL: process.env.BIGBLUEBUTTON_SERVER_URL ? 'SET' : 'NOT SET',
          BIGBLUEBUTTON_API_SECRET: process.env.BIGBLUEBUTTON_API_SECRET ? 'SET' : 'NOT SET'
        }
      },
      expectedFormat: {
        serverUrl: 'https://class.techpratham.org',
        apiSecret: 'Should be a long string from BBB server config'
      },
      checklistForFix: [
        '1. Check .env.local file exists in project root',
        '2. Verify BIGBLUEBUTTON_SERVER_URL=https://class.techpratham.org',
        '3. Verify BIGBLUEBUTTON_API_SECRET=your-actual-secret-from-server',
        '4. Restart development server after changing .env.local',
        '5. Check BBB server admin panel for correct API secret'
      ]
    });

  } catch (error: any) {
    console.error('BBB debug error:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}