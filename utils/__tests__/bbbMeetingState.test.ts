import { describe, it, expect } from 'vitest';
import {
  classifyMeetingState,
  meetingIsOver,
  readCount,
  isSuccessResponse
} from '../bbbMeetingState';

const runningWithTrainer = `<response>
  <returncode>SUCCESS</returncode>
  <meetingID>class-abc</meetingID>
  <running>true</running>
  <participantCount>4</participantCount>
  <moderatorCount>1</moderatorCount>
</response>`;

const runningNoTrainer = `<response>
  <returncode>SUCCESS</returncode>
  <meetingID>class-abc</meetingID>
  <running>true</running>
  <participantCount>3</participantCount>
  <moderatorCount>0</moderatorCount>
</response>`;

const notFound = `<response>
  <returncode>FAILED</returncode>
  <messageKey>notFound</messageKey>
  <message>We could not find a meeting with that meeting ID</message>
</response>`;

const endedNaturally = `<response>
  <returncode>SUCCESS</returncode>
  <meetingID>class-abc</meetingID>
  <ended>true</ended>
</response>`;

const forciblyEnded = `<response>
  <returncode>SUCCESS</returncode>
  <meetingID>class-abc</meetingID>
  <messageKey>meetingForciblyEnded</messageKey>
</response>`;

describe('readCount', () => {
  it('reads a counter', () => {
    expect(readCount(runningWithTrainer, 'participantCount')).toBe(4);
    expect(readCount(runningWithTrainer, 'moderatorCount')).toBe(1);
  });

  it('returns 0 for a missing counter', () => {
    expect(readCount('<response></response>', 'moderatorCount')).toBe(0);
  });

  it('tolerates whitespace', () => {
    expect(readCount('<moderatorCount> 2 </moderatorCount>', 'moderatorCount')).toBe(2);
  });
});

describe('meetingIsOver', () => {
  it('detects a missing meeting', () => {
    expect(meetingIsOver(notFound)).toBe(true);
  });

  it('detects a naturally ended meeting', () => {
    expect(meetingIsOver(endedNaturally)).toBe(true);
  });

  it('detects "End session for all"', () => {
    expect(meetingIsOver(forciblyEnded)).toBe(true);
  });

  it('does not flag a running meeting', () => {
    expect(meetingIsOver(runningWithTrainer)).toBe(false);
    expect(meetingIsOver(runningNoTrainer)).toBe(false);
  });

  it('treats an empty response as over', () => {
    expect(meetingIsOver('')).toBe(true);
  });
});

describe('isSuccessResponse', () => {
  it('recognises success', () => {
    expect(isSuccessResponse(runningWithTrainer)).toBe(true);
  });

  it('rejects a failure', () => {
    expect(isSuccessResponse(notFound)).toBe(false);
  });
});

describe('classifyMeetingState', () => {
  it('reports trainer-present only when a moderator is in the room', () => {
    const result = classifyMeetingState(runningWithTrainer);
    expect(result.state).toBe('trainer-present');
    expect(result.moderatorCount).toBe(1);
    expect(result.participantCount).toBe(4);
  });

  it('reports trainer-absent when the trainer has left but students remain', () => {
    const result = classifyMeetingState(runningNoTrainer);
    expect(result.state).toBe('trainer-absent');
    expect(result.moderatorCount).toBe(0);
    expect(result.participantCount).toBe(3);
  });

  it('reports ended after "End session for all"', () => {
    expect(classifyMeetingState(forciblyEnded).state).toBe('ended');
  });

  it('reports ended when the meeting no longer exists', () => {
    expect(classifyMeetingState(notFound).state).toBe('ended');
  });

  it('reports unknown for an unparseable response', () => {
    expect(classifyMeetingState('<html>gateway timeout</html>').state).toBe('unknown');
  });

  it('never reports trainer-present for an ended meeting', () => {
    // Guards the exact regression: a torn-down meeting must not look joinable.
    for (const xml of [notFound, endedNaturally, forciblyEnded, '']) {
      expect(classifyMeetingState(xml).state).not.toBe('trainer-present');
    }
  });
});
