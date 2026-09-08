import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

/**
 * publish-pending-recordings
 *
 * Some BBB recordings finish PROCESSING but never flip to PUBLISHED
 * (visible in `bbb-record --list` as a filled "Processed" column but a blank
 * "Published" column). Students/trainers then can't see them.
 *
 * This endpoint scans every recording via getRecordings and, for any that are
 * processed but unpublished, calls publishRecordings to force-publish them.
 *
 * Safe to run on a schedule (e.g. every 10 min via cron) or manually.
 */

const BBB_SERVER_URL = 'https://class.techpratham.com/bigbluebutton';
const BBB_API_SECRET = 'FJxUf6Erzd1Gru9oPXVqpdaXAsP9s1vFKxPEjljXnE';

function checksum(apiCall: string, params: string, secret: string): string {
  return crypto.createHash('sha1').update(apiCall + params + secret, 'utf8').digest('hex');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Fetch all recordings
    const getParams = '';
    const getChecksum = checksum('getRecordings', getParams, BBB_API_SECRET);
    const getUrl = `${BBB_SERVER_URL}/api/getRecordings?checksum=${getChecksum}`;

    const recResp = await fetch(getUrl);
    const xml = await recResp.text();

    if (!xml.includes('<returncode>SUCCESS</returncode>')) {
      return res.status(500).json({ success: false, error: 'BBB getRecordings failed' });
    }

    const recordingBlocks = xml.match(/<recording>([\s\S]*?)<\/recording>/g) || [];

    const pending: string[] = [];
    const alreadyPublished: string[] = [];

    for (const block of recordingBlocks) {
      const recordId =
        block.match(/<recordID><!\[CDATA\[(.*?)\]\]><\/recordID>/)?.[1] ||
        block.match(/<recordID>(.*?)<\/recordID>/)?.[1];

      const published = block.match(/<published>(.*?)<\/published>/)?.[1] === 'true';
      const state = block.match(/<state>(.*?)<\/state>/)?.[1];

      if (!recordId) continue;

      // A recording that has finished processing (state 'published' or
      // 'unpublished') but is not flagged published is our target. State
      // 'processing'/'processed' means BBB is still working — leave it alone.
      const doneProcessing = state === 'published' || state === 'unpublished';

      if (doneProcessing && !published) {
        pending.push(recordId);
      } else if (published) {
        alreadyPublished.push(recordId);
      }
    }

    // 2. Publish each pending recording
    const results: Array<{ recordId: string; ok: boolean; message?: string }> = [];

    for (const recordId of pending) {
      const params = `publish=true&recordID=${encodeURIComponent(recordId)}`;
      const pubChecksum = checksum('publishRecordings', params, BBB_API_SECRET);
      const pubUrl = `${BBB_SERVER_URL}/api/publishRecordings?${params}&checksum=${pubChecksum}`;

      try {
        const r = await fetch(pubUrl);
        const t = await r.text();
        const ok = t.includes('<returncode>SUCCESS</returncode>') && t.includes('<published>true</published>');
        results.push({ recordId, ok, message: ok ? 'published' : 'publish call did not confirm' });
        console.log(`📼 publishRecordings ${recordId}: ${ok ? 'OK' : 'FAILED'}`);
      } catch (err: any) {
        results.push({ recordId, ok: false, message: err.message });
        console.error(`❌ publishRecordings ${recordId} error:`, err.message);
      }
    }

    return res.status(200).json({
      success: true,
      totalRecordings: recordingBlocks.length,
      alreadyPublished: alreadyPublished.length,
      pendingFound: pending.length,
      publishedNow: results.filter(r => r.ok).length,
      failed: results.filter(r => !r.ok),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('publish-pending-recordings error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
