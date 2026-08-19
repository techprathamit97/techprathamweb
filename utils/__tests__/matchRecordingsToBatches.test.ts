import { describe, it, expect } from 'vitest';
import {
  buildMeetingBatchIndex,
  resolveRecordingBatchId,
  groupRecordingsByBatch
} from '../matchRecordingsToBatches';

const BATCH_A = '6a7f2ff3ed84e0a72a743001';
const BATCH_B = '6a7f2ff3ed84e0a72a743002';
const CLASS_A = '6a7f2ff3ed84e0a72a743298';

const batches = [
  { _id: BATCH_A, batchName: 'Ayansh_test2' },
  { _id: BATCH_B, batchName: 'Ayansh_testing_Batch' }
];

const moduleClasses = [
  { _id: CLASS_A, batchId: { _id: BATCH_A }, bbbMeetingId: `class-${CLASS_A}` },
  { _id: '6a7f2ff3ed84e0a72a743299', batchId: { _id: BATCH_B }, bbbMeetingId: null }
];

const index = buildMeetingBatchIndex(moduleClasses);

// Recordings taken from the reported screenshot
const lmsRecording = {
  recordId: 'r1',
  meetingId: `class-${CLASS_A}`,
  name: 'Ayansh_test2 - Class 21',
  startTime: '300'
};

const greenlightRecordingA = {
  recordId: 'r2',
  meetingId: '8az6qfcg89e2tjkmnnuumuxe36f4o9cl2vmotbww',
  name: "shubham sharma's Room",
  startTime: '200'
};

const greenlightRecordingB = {
  recordId: 'r3',
  meetingId: 'lxxmodauwxmrnplczip4skl2ctwhd9huhsjlgq7r',
  name: "Test_Ayansh's Room",
  startTime: '100'
};

describe('resolveRecordingBatchId', () => {
  it('attributes a recording via its exact BBB meeting ID', () => {
    expect(resolveRecordingBatchId(lmsRecording, index, batches)).toBe(BATCH_A);
  });

  it('derives the batch from a class-<id> meeting ID with no stored bbbMeetingId', () => {
    const recording = { meetingId: 'class-6a7f2ff3ed84e0a72a743299', name: 'Untitled' };
    expect(resolveRecordingBatchId(recording, index, batches)).toBe(BATCH_B);
  });

  it('does NOT attribute Greenlight rooms to any batch', () => {
    expect(resolveRecordingBatchId(greenlightRecordingA, index, batches)).toBeNull();
    expect(resolveRecordingBatchId(greenlightRecordingB, index, batches)).toBeNull();
  });

  it('accepts the exact "<Batch Name> - ..." naming convention', () => {
    const recording = { meetingId: 'unknown-meeting', name: 'Ayansh_testing_Batch - Class 4' };
    expect(resolveRecordingBatchId(recording, index, batches)).toBe(BATCH_B);
  });

  it('rejects a batch name that merely appears somewhere in the title', () => {
    // The old fuzzy matcher attributed this to Ayansh_test2 via includes()
    const recording = { meetingId: 'unknown-meeting', name: "Guest room for Ayansh_test2 folks" };
    expect(resolveRecordingBatchId(recording, index, batches)).toBeNull();
  });

  it('returns null when there is no meeting id or name', () => {
    expect(resolveRecordingBatchId({}, index, batches)).toBeNull();
  });
});

describe('groupRecordingsByBatch', () => {
  const recordings = [lmsRecording, greenlightRecordingA, greenlightRecordingB];

  it('keeps foreign recordings out of every batch', () => {
    const { byBatchId, unmatched } = groupRecordingsByBatch(recordings, batches, index);

    expect(byBatchId.get(BATCH_A)).toHaveLength(1);
    expect(byBatchId.get(BATCH_A)![0].recordId).toBe('r1');

    // The old behaviour appended both Greenlight rooms to the first batch
    expect(byBatchId.get(BATCH_B)).toHaveLength(0);
    expect(unmatched.map(r => r.recordId)).toEqual(['r2', 'r3']);
  });

  it('never attributes unmatched recordings to the first batch', () => {
    const { byBatchId } = groupRecordingsByBatch(
      [greenlightRecordingA, greenlightRecordingB],
      batches,
      index
    );

    expect(byBatchId.get(BATCH_A)).toHaveLength(0);
    expect(byBatchId.get(BATCH_B)).toHaveLength(0);
  });

  it('sorts each batch newest first', () => {
    const older = { recordId: 'old', meetingId: `class-${CLASS_A}`, name: 'x', startTime: '100' };
    const newer = { recordId: 'new', meetingId: `class-${CLASS_A}`, name: 'x', startTime: '900' };

    const { byBatchId } = groupRecordingsByBatch([older, newer], batches, index);

    expect(byBatchId.get(BATCH_A)!.map(r => r.recordId)).toEqual(['new', 'old']);
  });

  it('handles batchId stored as a plain id rather than a populated object', () => {
    const flatIndex = buildMeetingBatchIndex([
      { _id: CLASS_A, batchId: BATCH_A, bbbMeetingId: 'meeting-xyz' }
    ]);

    expect(resolveRecordingBatchId({ meetingId: 'meeting-xyz' }, flatIndex)).toBe(BATCH_A);
  });
});
