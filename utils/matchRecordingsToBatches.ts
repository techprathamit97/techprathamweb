/**
 * Attributes BigBlueButton recordings to batches.
 *
 * The previous per-API logic had two problems that made unrelated recordings
 * (for example rooms created directly in Greenlight) show up inside a batch:
 *
 *  1. A fuzzy fallback matched a recording to a batch when the batch name, code
 *     or course title appeared *anywhere* in the recording name or meeting ID.
 *     Short or common terms matched far too much.
 *  2. Any recording that still matched nothing was appended to the FIRST batch,
 *     so every foreign recording was silently attributed to one batch.
 *
 * Attribution here is authoritative: a recording belongs to a batch only when we
 * can tie its BBB meeting back to a ModuleClass row, or when its name follows the
 * exact "<Batch Name> - ..." convention our own meetings are created with.
 * Anything else is reported as unmatched rather than guessed.
 */

export interface MeetingBatchIndex {
  /** bbbMeetingId -> batchId */
  byMeetingId: Map<string, string>;
  /** ModuleClass _id -> batchId, for `class-<classId>` style meeting IDs */
  byClassId: Map<string, string>;
}

/**
 * Meeting IDs created by our join flow look like `class-<classId>` and may have a
 * `-<timestamp>` suffix appended when a fresh meeting is created for a rejoin
 * (e.g. `class-6aa00c7a...-1788872722974`).
 *
 * The class id itself is not always a 24-char Mongo ObjectId — some deployments
 * use longer hex identifiers — so we capture everything after `class-` up to an
 * optional trailing `-<digits>` timestamp rather than assuming a fixed length.
 */
const LMS_MEETING_ID = /^class-([a-f0-9]+?)(?:-\d{10,})?$/i;

export function buildMeetingBatchIndex(moduleClasses: any[]): MeetingBatchIndex {
  const byMeetingId = new Map<string, string>();
  const byClassId = new Map<string, string>();

  for (const cls of moduleClasses || []) {
    const batchId = cls?.batchId?._id
      ? String(cls.batchId._id)
      : cls?.batchId
        ? String(cls.batchId)
        : null;

    if (!batchId) continue;

    if (cls.bbbMeetingId) {
      const stored = String(cls.bbbMeetingId);
      byMeetingId.set(stored, batchId);
      // Also index the timestamp-stripped form so a recording whose meeting ID
      // lacks (or adds) the `-<timestamp>` suffix still resolves.
      const strippedStored = stored.replace(/-\d{10,}$/, '');
      if (strippedStored !== stored) {
        byMeetingId.set(strippedStored, batchId);
      }
    }

    if (cls._id) {
      byClassId.set(String(cls._id), batchId);
      byClassId.set(String(cls._id).toLowerCase(), batchId);
    }
  }

  return { byMeetingId, byClassId };
}

/**
 * Resolves the batch a recording belongs to, or null when it cannot be
 * attributed with confidence.
 *
 * `batches` is only used for the strict name-convention check and may be omitted.
 */
export function resolveRecordingBatchId(
  recording: { meetingId?: string | null; name?: string | null },
  index: MeetingBatchIndex,
  batches?: Array<{ _id: any; batchName?: string }>
): string | null {
  const meetingId = recording?.meetingId ? String(recording.meetingId) : '';

  // 1. Exact meeting ID recorded against a class - the strongest signal.
  if (meetingId && index.byMeetingId.has(meetingId)) {
    return index.byMeetingId.get(meetingId)!;
  }

  // 1b. The stored bbbMeetingId may carry a `-<timestamp>` suffix that the
  //     recording's meeting ID does not (or vice versa). Compare with the
  //     timestamp stripped so a rejoin-created meeting still matches its class.
  if (meetingId) {
    const withoutTimestamp = meetingId.replace(/-\d{10,}$/, '');
    if (withoutTimestamp !== meetingId && index.byMeetingId.has(withoutTimestamp)) {
      return index.byMeetingId.get(withoutTimestamp)!;
    }
    // Also try matching against any stored id whose timestamp-stripped form equals ours
    for (const [storedId, batchId] of index.byMeetingId) {
      if (storedId.replace(/-\d{10,}$/, '') === withoutTimestamp) {
        return batchId;
      }
    }
  }

  // 2. Our own meeting IDs embed the class id, so the batch is derivable even if
  //    bbbMeetingId was never persisted on the class row. Handles both
  //    `class-<id>` and `class-<id>-<timestamp>`, and ids of any hex length.
  const embedded = meetingId.match(LMS_MEETING_ID);
  if (embedded) {
    const classId = embedded[1];
    const batchId =
      index.byClassId.get(classId) ||
      index.byClassId.get(classId.toLowerCase());
    if (batchId) return batchId;
  }

  // 3. Strict name convention. Our meetings are titled "<Batch Name> - Class N",
  //    so require that exact prefix. A substring match is not enough: it is what
  //    previously pulled in unrelated rooms.
  if (recording?.name && batches?.length) {
    const name = String(recording.name).trim().toLowerCase();

    for (const batch of batches) {
      const batchName = batch.batchName?.trim().toLowerCase();
      if (!batchName) continue;

      if (name === batchName || name.startsWith(`${batchName} - `)) {
        return String(batch._id);
      }
    }
  }

  return null;
}

/**
 * Groups recordings by batch, returning the unattributed ones separately so
 * callers can surface them deliberately instead of folding them into a batch.
 */
export function groupRecordingsByBatch<T extends { meetingId?: string | null; name?: string | null; startTime?: string | null }>(
  recordings: T[],
  batches: Array<{ _id: any; batchName?: string }>,
  index: MeetingBatchIndex
): { byBatchId: Map<string, T[]>; unmatched: T[] } {
  const byBatchId = new Map<string, T[]>();
  const unmatched: T[] = [];

  for (const batch of batches) {
    byBatchId.set(String(batch._id), []);
  }

  for (const recording of recordings || []) {
    const batchId = resolveRecordingBatchId(recording, index, batches);

    if (batchId && byBatchId.has(batchId)) {
      byBatchId.get(batchId)!.push(recording);
    } else {
      unmatched.push(recording);
    }
  }

  // Newest first within each batch
  const newestFirst = (a: T, b: T) => {
    if (a.startTime && b.startTime) return parseInt(b.startTime) - parseInt(a.startTime);
    return 0;
  };

  for (const list of byBatchId.values()) {
    list.sort(newestFirst);
  }
  unmatched.sort(newestFirst);

  return { byBatchId, unmatched };
}
