import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Health check for BBB env configuration.
 *
 * SECURITY: This endpoint must NEVER return secret values. It only reports
 * whether the required variables are present, and only in non-production so it
 * can't be used to probe a live deployment. Previously it leaked the full
 * BIGBLUEBUTTON_API_SECRET to any unauthenticated caller.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Do not expose configuration details on production.
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  return res.status(200).json({
    success: true,
    environment: {
      // Booleans only — never the values.
      BIGBLUEBUTTON_SERVER_URL: Boolean(process.env.BIGBLUEBUTTON_SERVER_URL),
      BIGBLUEBUTTON_API_SECRET: Boolean(process.env.BIGBLUEBUTTON_API_SECRET),
      secretLength: process.env.BIGBLUEBUTTON_API_SECRET
        ? process.env.BIGBLUEBUTTON_API_SECRET.length
        : 0,
      nodeEnv: process.env.NODE_ENV,
    },
    instructions: [
      'If a value shows false, add it to .env.local (local) or the host env (deployed)',
      'Restart the server after changing environment variables',
    ],
  });
}
