// BBB Learning Dashboard data normalizer
// Converts raw BBB export JSON to consistent internal format
//
// Export shape stored in lms.bbbLearningDashboardExports (BBB 2.6+/3.x):
//   data.users = {
//     <userKey>: {
//       userKey, extId, name, isModerator,
//       intIds: { <intId>: { intId, sessions: [{ registeredOn, leftOn }] } },
//       totalOfMessages, ...
//     }
//   }
// Timestamps are epoch milliseconds. Older exports used `data.users_data`
// with `intIds` as an array and a `role` string; both shapes are handled.

/**
 * Returns the participant map from an export's `data`, whichever shape it uses.
 * @param {Object} data - export `data` object
 * @returns {Object|null}
 */
function getUsersMap(data) {
  if (!data) return null;
  if (data.users && typeof data.users === 'object') return data.users;
  if (data.users_data && typeof data.users_data === 'object') return data.users_data;
  return null;
}

/**
 * Normalizes BBB Learning Dashboard export data to standard attendance format
 * @param {Object} bbbExport - BBB meeting export document from database
 * @returns {Object} Normalized meeting attendance data
 */
function normalizeAttendance(bbbExport) {
  if (!bbbExport) {
    return createEmptyAttendance(null, 'Export not found');
  }

  const meetingIntId = bbbExport.meetingIntId;
  const meetingName = bbbExport.meetingName || 'Unknown Meeting';
  const status = bbbExport.endedOn ? 'COMPLETED' : 'IN_PROGRESS';

  // Parse timing data
  const timestamps = {
    startedAt: toDate(bbbExport.createdOn),
    endedAt: toDate(bbbExport.endedOn)
  };

  const usersMap = getUsersMap(bbbExport.data);

  // Check if we have actual BBB data
  if (!usersMap) {
    return {
      meetingIntId,
      meetingName,
      status,
      startedAt: timestamps.startedAt ? timestamps.startedAt.toISOString() : null,
      endedAt: timestamps.endedAt ? timestamps.endedAt.toISOString() : null,
      participantCount: null,
      participants: [],
      attendanceAvailable: false,
      errorMessage: 'No participant data available in BBB export'
    };
  }

  // Parse participants
  const participants = [];
  Object.entries(usersMap).forEach(([userId, userData]) => {
    const participant = parseParticipant(userId, userData);
    if (participant) {
      participants.push(participant);
    }
  });

  return {
    meetingIntId,
    meetingName,
    status,
    startedAt: timestamps.startedAt ? timestamps.startedAt.toISOString() : null,
    endedAt: timestamps.endedAt ? timestamps.endedAt.toISOString() : null,
    participantCount: participants.length,
    participants: participants,
    attendanceAvailable: true
  };
}

/**
 * Parse individual participant from BBB user data
 * @param {string} userId - BBB user key
 * @param {Object} userData - BBB user data object
 * @returns {Object|null} Normalized participant data
 */
function parseParticipant(userId, userData) {
  if (!userData) return null;

  // Extract display name (remove session token suffix if present)
  const fullName = userData.name || 'Unknown User';
  const displayName = fullName.replace(/-[a-z0-9]{8,}$/i, ''); // Remove session token

  // Determine role. New exports carry an explicit boolean; old ones a string.
  const role = typeof userData.isModerator === 'boolean'
    ? (userData.isModerator ? 'MODERATOR' : 'STUDENT')
    : determineRole(userData.role);

  // Collect every session across every intId.
  const intervals = collectSessions(userData.intIds)
    .map(parseSessionInterval)
    .filter(Boolean);

  let firstJoinedAt = null;
  let lastLeftAt = null;
  for (const interval of intervals) {
    if (interval.joinedAt && (!firstJoinedAt || interval.joinedAt < firstJoinedAt)) {
      firstJoinedAt = interval.joinedAt;
    }
    if (interval.leftAt && (!lastLeftAt || interval.leftAt > lastLeftAt)) {
      lastLeftAt = interval.leftAt;
    }
  }

  const totalDurationSeconds = mergedDurationSeconds(intervals);

  return {
    participantId: userId,
    userKey: userData.userKey || userId,
    displayName: displayName,
    fullName: fullName,
    role: role,
    totalDurationSeconds: totalDurationSeconds > 0 ? totalDurationSeconds : null,
    firstJoinedAt: firstJoinedAt,
    lastLeftAt: lastLeftAt,
    sessionCount: intervals.length,
    intervals: intervals,
    messageCount: userData.totalOfMessages || 0,
    // Additional BBB-specific data
    bbbData: {
      userId: userId,
      originalName: fullName,
      role: userData.role,
      isModerator: userData.isModerator
    }
  };
}

/**
 * Flattens `intIds` into a list of {registeredOn, leftOn} sessions.
 * New shape: object of { sessions: [...] }. Old shape: array of sessions.
 */
function collectSessions(intIds) {
  if (!intIds) return [];
  if (Array.isArray(intIds)) return intIds;
  const sessions = [];
  for (const entry of Object.values(intIds)) {
    if (entry && Array.isArray(entry.sessions)) {
      sessions.push(...entry.sessions);
    } else if (entry && (entry.registeredOn || entry.leftOn)) {
      sessions.push(entry);
    }
  }
  return sessions;
}

/**
 * Parse session interval from a BBB session object
 * @param {Object} session - { registeredOn, leftOn }
 * @returns {Object|null} Parsed interval
 */
function parseSessionInterval(session) {
  if (!session) return null;

  const join = toDate(session.registeredOn);
  const leave = toDate(session.leftOn);

  let durationSeconds = null;
  if (join && leave) {
    const diff = Math.floor((leave.getTime() - join.getTime()) / 1000);
    durationSeconds = diff > 0 ? diff : null;
  }

  return {
    joinedAt: join ? join.toISOString() : null,
    leftAt: leave ? leave.toISOString() : null,
    durationSeconds
  };
}

/**
 * Total seconds covered by the intervals, merging overlaps so the same time
 * is never counted twice. Intervals missing either end are skipped.
 */
function mergedDurationSeconds(intervals) {
  const ranges = intervals
    .filter(i => i.joinedAt && i.leftAt && i.durationSeconds)
    .map(i => [new Date(i.joinedAt).getTime(), new Date(i.leftAt).getTime()])
    .sort((a, b) => a[0] - b[0]);

  let totalMs = 0;
  let current = null;
  for (const [start, end] of ranges) {
    if (!current || start > current[1]) {
      if (current) totalMs += current[1] - current[0];
      current = [start, end];
    } else if (end > current[1]) {
      current[1] = end;
    }
  }
  if (current) totalMs += current[1] - current[0];
  return Math.floor(totalMs / 1000);
}

/** Accepts epoch ms (number or numeric string), ISO string, or Date. */
function toDate(value) {
  if (value === null || value === undefined || value === '' || value === 0) return null;
  const d = typeof value === 'string' && /^\d+$/.test(value)
    ? new Date(parseInt(value, 10))
    : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Determine participant role from BBB role data
 * @param {string} bbbRole - BBB role string
 * @returns {string} Normalized role
 */
function determineRole(bbbRole) {
  if (!bbbRole) return 'UNKNOWN';

  const roleLower = bbbRole.toLowerCase();

  if (roleLower === 'moderator') return 'MODERATOR';
  if (roleLower === 'viewer') return 'STUDENT';
  if (roleLower === 'presenter') return 'TRAINER';

  return 'UNKNOWN';
}

/**
 * Create empty attendance structure
 * @param {string} meetingIntId - Meeting ID
 * @param {string} reason - Reason for empty data
 * @returns {Object} Empty attendance structure
 */
function createEmptyAttendance(meetingIntId, reason = 'No data available') {
  return {
    meetingIntId: meetingIntId || null,
    meetingName: 'Unknown Meeting',
    status: 'UNKNOWN',
    startedAt: null,
    endedAt: null,
    participantCount: null,
    participants: [],
    attendanceAvailable: false,
    errorMessage: reason
  };
}

/**
 * Format duration in human-readable format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration (e.g., "1h 30m", "45m", "2m", "28s")
 */
function formatDuration(seconds) {
  if (!seconds || seconds < 0) return '0m';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  if (minutes > 0) return `${minutes}m`;
  return `${Math.floor(seconds)}s`;
}

module.exports = {
  normalizeAttendance,
  parseParticipant,
  formatDuration,
  determineRole,
  getUsersMap
};
