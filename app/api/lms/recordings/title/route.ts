import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const RecordingTitle = require('@/models/RecordingTitle');
const ManualRecording = require('@/models/ManualRecording');

/**
 * Renames a recording (admin/trainer).
 *
 * Body: { recordId, title, batchId? }
 *
 *  - Manual recordings (recordId "manual-<id>"): update the ManualRecording.title.
 *  - BBB recordings: upsert a RecordingTitle override keyed by recordId, since
 *    BBB recordings are not stored in our DB.
 */
export async function PUT(req: NextRequest) {
  try {
    await connectMongo();
    const { recordId, title, batchId } = await req.json();

    if (!recordId || !title || !String(title).trim()) {
      return NextResponse.json(
        { success: false, error: 'recordId and title are required' },
        { status: 400 }
      );
    }

    const cleanTitle = String(title).trim();

    if (String(recordId).startsWith('manual-')) {
      const manualId = String(recordId).replace(/^manual-/, '');
      const updated = await ManualRecording.findByIdAndUpdate(
        manualId,
        { title: cleanTitle },
        { new: true }
      );
      if (!updated) {
        return NextResponse.json({ success: false, error: 'Recording not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, title: cleanTitle });
    }

    // BBB recording → upsert an override.
    await RecordingTitle.findOneAndUpdate(
      { recordId },
      { recordId, title: cleanTitle, batchId: batchId || undefined },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ success: true, title: cleanTitle });
  } catch (error: any) {
    console.error('Rename recording error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to rename recording', message: error?.message },
      { status: 500 }
    );
  }
}
