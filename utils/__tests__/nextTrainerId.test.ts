import { describe, it, expect } from 'vitest';
import { nextTrainerId, parseTrainerIdNumber, formatTrainerId } from '../nextTrainerId';

describe('parseTrainerIdNumber', () => {
  it('parses a padded id', () => {
    expect(parseTrainerIdNumber('TRN0007')).toBe(7);
  });

  it('parses an id beyond the padding width', () => {
    expect(parseTrainerIdNumber('TRN10000')).toBe(10000);
  });

  it('rejects malformed and missing ids', () => {
    expect(parseTrainerIdNumber('T-0001')).toBeNull();
    expect(parseTrainerIdNumber('TRNABC')).toBeNull();
    expect(parseTrainerIdNumber(undefined)).toBeNull();
    expect(parseTrainerIdNumber(null)).toBeNull();
    expect(parseTrainerIdNumber(42)).toBeNull();
  });
});

describe('formatTrainerId', () => {
  it('zero pads to four digits', () => {
    expect(formatTrainerId(1)).toBe('TRN0001');
    expect(formatTrainerId(250)).toBe('TRN0250');
  });

  it('does not truncate larger numbers', () => {
    expect(formatTrainerId(12345)).toBe('TRN12345');
  });
});

describe('nextTrainerId', () => {
  it('starts at TRN0001 for an empty collection', () => {
    expect(nextTrainerId([])).toBe('TRN0001');
  });

  it('continues from the highest existing id', () => {
    expect(nextTrainerId(['TRN0001', 'TRN0002', 'TRN0003'])).toBe('TRN0004');
  });

  it('does not reuse an id after a deletion - the reported 500', () => {
    // TRN0003 was deleted. A count-based id would produce TRN0005, which is
    // already taken, and the unique index would reject the insert.
    const remaining = ['TRN0001', 'TRN0002', 'TRN0004', 'TRN0005'];

    expect(nextTrainerId(remaining)).toBe('TRN0006');
    expect(remaining).not.toContain(nextTrainerId(remaining));
  });

  it('handles many deletions without colliding', () => {
    const remaining = ['TRN0009'];
    expect(nextTrainerId(remaining)).toBe('TRN0010');
  });

  it('ignores trainers with no id', () => {
    expect(nextTrainerId([null, undefined, 'TRN0002', ''])).toBe('TRN0003');
  });

  it('ignores ids that do not follow the convention', () => {
    expect(nextTrainerId(['LEGACY-1', 'TRN0002', 'abc'])).toBe('TRN0003');
  });

  it('orders numerically, not lexicographically', () => {
    // A string sort would pick TRN9999 as the maximum
    expect(nextTrainerId(['TRN9999', 'TRN10000'])).toBe('TRN10001');
  });

  it('is stable when every id is malformed', () => {
    expect(nextTrainerId(['x', 'y', null])).toBe('TRN0001');
  });
});
