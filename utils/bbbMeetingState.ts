/**
 * Helpers for interpreting a BigBlueButton `getMeetingInfo` response.
 *
 * These decide whether a class is genuinely live. Getting this wrong is what
 * caused students to see a Live button after the trainer had already left or
 * used "End session for all", so the logic is kept pure and unit tested.
 */

/** Reads a numeric BBB counter such as moderatorCount or participantCount. */
export function readCount(xml: string, tag: string): number {
  const match = xml.match(new RegExp(`<${tag}>\\s*(\\d+)\\s*</${tag}>`));
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * True when BBB reports the meeting as gone or torn down.
 * Covers a natural end, an explicit "End session for all", and BBB reaping the
 * room after everyone left.
 */
export function meetingIsOver(xml: string): boolean {
  if (!xml) return true;

  return (
    xml.includes('notFound') ||
    xml.includes('No such meeting') ||
    xml.includes('<ended>true</ended>') ||
    xml.includes('meetingForciblyEnded') ||
    xml.includes('hasBeenForciblyEnded>true')
  );
}

/** True when BBB returned a usable success payload. */
export function isSuccessResponse(xml: string): boolean {
  return Boolean(xml) && xml.includes('<returncode>SUCCESS</returncode>');
}

export type MeetingLiveState =
  | 'ended'
  | 'trainer-present'
  | 'trainer-absent'
  | 'unknown';

/**
 * Classifies a meeting from its getMeetingInfo XML.
 *
 * `trainer-present` is the only state in which students may join, because a
 * moderator must be in the room for the class to be running.
 */
export function classifyMeetingState(xml: string): {
  state: MeetingLiveState;
  moderatorCount: number;
  participantCount: number;
} {
  if (meetingIsOver(xml)) {
    return { state: 'ended', moderatorCount: 0, participantCount: 0 };
  }

  if (!isSuccessResponse(xml)) {
    return { state: 'unknown', moderatorCount: 0, participantCount: 0 };
  }

  const moderatorCount = readCount(xml, 'moderatorCount');
  const participantCount = readCount(xml, 'participantCount');

  return {
    state: moderatorCount > 0 ? 'trainer-present' : 'trainer-absent',
    moderatorCount,
    participantCount
  };
}
