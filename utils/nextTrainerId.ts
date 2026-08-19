/**
 * Allocates the next sequential trainerId (TRN0001, TRN0002, ...).
 *
 * trainerId is a unique index, so this must never return an ID that is already
 * taken. Deriving it from a document count did exactly that: once any trainer was
 * deleted the count fell behind the highest ID and regenerated an existing one,
 * which failed with a duplicate-key error.
 *
 * The maximum is computed numerically rather than by string comparison, because a
 * lexicographic sort orders "TRN9999" above "TRN10000".
 */

const TRAINER_ID_PATTERN = /^TRN(\d+)$/;

/** Extracts the numeric portion of a trainerId, or null if it does not match. */
export function parseTrainerIdNumber(trainerId: unknown): number | null {
  if (typeof trainerId !== 'string') return null;

  const match = trainerId.match(TRAINER_ID_PATTERN);
  if (!match) return null;

  const parsed = parseInt(match[1], 10);
  return Number.isNaN(parsed) ? null : parsed;
}

/** Formats a number as a trainerId, keeping the 4-digit zero padding. */
export function formatTrainerId(value: number): string {
  return `TRN${String(value).padStart(4, '0')}`;
}

/**
 * Returns the next free trainerId given every existing ID.
 * Ignores malformed and missing IDs.
 */
export function nextTrainerId(existingIds: unknown[]): string {
  let highest = 0;

  for (const id of existingIds || []) {
    const value = parseTrainerIdNumber(id);
    if (value !== null && value > highest) highest = value;
  }

  return formatTrainerId(highest + 1);
}
