const RecordingTitle = require('@/models/RecordingTitle');

/**
 * Applies display titles to a batch's recordings.
 *
 * Rules:
 *  - Default title is auto-generated as "<batchName>-Class-N", where N is the
 *    chronological position (oldest = 1) among the recordings that currently
 *    exist for that batch. This means deleting one never leaves a gap — the
 *    remaining recordings simply renumber 1..N.
 *  - If a custom title has been saved (RecordingTitle for BBB recordings, or the
 *    ManualRecording.title for manual ones), it overrides the default.
 *
 * The recording objects are mutated in place: `name` is set to the final title,
 * and `autoTitle` carries the computed "<batchName>-Class-N" so the UI can show
 * a reset option if desired.
 */

export async function applyRecordingTitles(
  batchName: string,
  recordings: any[]
): Promise<any[]> {
  if (!recordings || recordings.length === 0) return recordings || [];

  const safeBatch = (batchName || 'Batch').trim();

  // 1. Chronological order (oldest first) → Class-N
  const chronological = [...recordings].sort((a, b) => {
    const ta = a?.startTime && /^\d+$/.test(a.startTime) ? parseInt(a.startTime) : 0;
    const tb = b?.startTime && /^\d+$/.test(b.startTime) ? parseInt(b.startTime) : 0;
    return ta - tb;
  });

  const autoTitleByRecordId = new Map<string, number>();
  chronological.forEach((rec, i) => {
    autoTitleByRecordId.set(String(rec.recordId), i + 1);
  });

  // 2. Load custom overrides for BBB recordings (manual ones already carry
  //    their custom title in `name`).
  const bbbRecordIds = recordings
    .filter((r) => !String(r.recordId).startsWith('manual-'))
    .map((r) => String(r.recordId));

  const overrides = new Map<string, string>();
  if (bbbRecordIds.length) {
    try {
      const docs = await RecordingTitle.find({ recordId: { $in: bbbRecordIds } })
        .select('recordId title')
        .lean();
      for (const d of docs as any[]) overrides.set(String(d.recordId), d.title);
    } catch {
      // if the lookup fails, fall back to auto titles
    }
  }

  // 3. Assign final titles
  for (const rec of recordings) {
    const id = String(rec.recordId);
    const n = autoTitleByRecordId.get(id) ?? 0;
    const autoTitle = `${safeBatch}-Class-${n}`;
    rec.autoTitle = autoTitle;

    if (id.startsWith('manual-')) {
      // Manual recording: `name` already holds the editable ManualRecording.title.
      // Only replace it with the auto title if it's empty.
      if (!rec.name || !String(rec.name).trim()) rec.name = autoTitle;
    } else {
      // BBB recording: use the custom override if present, else the auto title.
      rec.name = overrides.get(id) || autoTitle;
    }
  }

  return recordings;
}
