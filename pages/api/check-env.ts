import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return res.status(200).json({
    success: true,
    environment: {
      BIGBLUEBUTTON_SERVER_URL: process.env.BIGBLUEBUTTON_SERVER_URL || 'NOT SET',
      BIGBLUEBUTTON_API_SECRET: process.env.BIGBLUEBUTTON_API_SECRET || 'NOT SET',
      secretLength: process.env.BIGBLUEBUTTON_API_SECRET ? process.env.BIGBLUEBUTTON_API_SECRET.length : 0,
      nodeEnv: process.env.NODE_ENV,
      processEnvKeys: Object.keys(process.env).filter(key => key.includes('BIGBLUE')),
    },
    expectedValues: {
      BIGBLUEBUTTON_SERVER_URL: 'https://class.techpratham.org/bigbluebutton',
      BIGBLUEBUTTON_API_SECRET: '77NxbTZnnrkERic8MBiqK5yOsUdMtmFjdgSmqr4Nj4 (42 chars)'
    },
    instructions: [
      'If values show NOT SET, check .env.local file exists',
      'If values are wrong, update .env.local and restart server',
      'Make sure .env.local is in project root directory',
      'Restart dev server with npm run dev after changes'
    ]
  });
}