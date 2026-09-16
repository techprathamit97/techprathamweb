import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
const ManualRecording = require('@/models/ManualRecording');

/**
 * Fetches manually-uploaded (non-BBB) recordings for a set of batches and
 * normalizes them into the same shape the recording UIs expect for BBB
 * recordings, so they display and sort seamlessly in each batch's day-wise
 * series.
 *
 * `startTime` is set from `classDate` (epoch ms as a string) so the existing
 * newest-first sort interleaves manual and BBB recordings by date.
 */

const S3_BUCKET = process.env.LMS_VIDEO_S3_BUCKET || '';
const S3_REGION = process.env.LMS_VIDEO_S3_REGION || 'ap-south-1';

const s3Client = new S3Client({
  region: S3_REGION,
  credentials: {
    accessKeyId: process.env.LMS_VIDEO_S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.LMS_VIDEO_S3_SECRET_ACCESS_KEY || '',
  },
});

function formatSize(bytes: number): string {
  if (!bytes) return 'Unknown';
  if (bytes > 1024 * 1024) return `${Math.round(bytes / 1024 / 1024)} MB`;
  if (bytes > 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function formatDuration(sec: number): string {
  if (!sec) return '0:00';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

async function presignGet(s3Key: string): Promise<string | null> {
  if (!S3_BUCKET || !s3Key) return null;
  try {
    const cmd = new GetObjectCommand({ Bucket: S3_BUCKET, Key: s3Key });
    return await getSignedUrl(s3Client, cmd, { expiresIn: 60 * 60 }); // 1h
  } catch {
    return null;
  }
}

/**
 * Returns a map of batchId -> normalized manual recordings for the given batch
 * ids. Set `publishedOnly` for the student view.
 */
export async function getManualRecordingsByBatch(
  batchIds: string[],
  opts: { publishedOnly?: boolean } = {}
): Promise<Map<string, any[]>> {
  const map = new Map<string, any[]>();
  if (!batchIds.length) return map;

  const query: any = { batchId: { $in: batchIds } };
  if (opts.publishedOnly) query.isPublished = true;

  const docs = await ManualRecording.find(query).sort({ classDate: -1 }).lean();

  for (const doc of docs as any[]) {
    const videoUrl = await presignGet(doc.s3Key);
    if (!videoUrl) continue;

    const startTime = String(new Date(doc.classDate).getTime());
    const dateText = new Date(doc.classDate).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const normalized = {
      recordId: `manual-${doc._id}`,
      meetingId: 'manual',
      name: doc.title,
      published: true,
      state: 'published',
      videoUrl,
      previewUrl: null,
      startTime,
      endTime: startTime,
      duration: doc.durationSec || 0,
      durationText: formatDuration(doc.durationSec || 0),
      dateText,
      participants: '0',
      size: String(doc.fileSize || 0),
      sizeText: formatSize(doc.fileSize || 0),
      canDownload: true,
      status: 'Ready',
      source: 'manual' as const, // marker so the UI can badge it if desired
    };

    const key = String(doc.batchId);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(normalized);
  }

  return map;
}

/**
 * Merges manual recordings into an existing array of BBB recordings for a batch
 * and re-sorts newest-first by startTime.
 */
export function mergeAndSort(bbbRecordings: any[], manualRecordings: any[]): any[] {
  const combined = [...(bbbRecordings || []), ...(manualRecordings || [])];
  combined.sort((a, b) => {
    const ta = parseInt(a.startTime || '0');
    const tb = parseInt(b.startTime || '0');
    return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
  });
  return combined;
}
