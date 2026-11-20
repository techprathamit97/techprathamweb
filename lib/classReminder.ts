import { connectMongo } from '@/utils/mongodb';
import { sendPushToTokens } from '@/lib/firebaseAdmin';

const Batch = require('@/models/Batch');
const Student = require('@/models/Student');
const Notification = require('@/models/Notification');

// How many minutes before class the reminder fires.
export const LEAD_MINUTES = parseInt(process.env.CLASS_REMINDER_LEAD_MINUTES || '10', 10);
// Half-width of the accept window. The scheduler runs every minute, so ±90s
// reliably catches the moment; the per-day dedup below prevents double sends.
const WINDOW_MS = 90 * 1000;

const DAY_NAME_TO_INDEX: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
};

// IST "now" as a Date whose wall-clock fields equal Asia/Kolkata local time.
function istNow(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
}

// Which weekday indices this batch runs on. Empty => Mon–Sat (legacy behaviour,
// matching the student batch-management page).
function allowedDayIndices(daysOfWeek?: string[]): number[] {
  const days = daysOfWeek || [];
  if (!days.length) return [1, 2, 3, 4, 5, 6];
  return days
    .map((d) => DAY_NAME_TO_INDEX[String(d).trim().toLowerCase()])
    .filter((n) => n !== undefined);
}

// Parse the first "H:MM AM/PM" out of a timing string like "9:00 AM to 5:00 PM".
function parseClassStart(timing: string, nowIst: Date): Date | null {
  const m = timing.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return null;
  const [, hh, mm, ap] = m;
  let hour = parseInt(hh, 10);
  const minute = parseInt(mm, 10);
  if (ap.toUpperCase() === 'PM' && hour !== 12) hour += 12;
  else if (ap.toUpperCase() === 'AM' && hour === 12) hour = 0;

  const classTime = new Date(nowIst);
  classTime.setHours(hour, minute, 0, 0);
  return classTime;
}

function istStartOfDay(nowIst: Date): Date {
  const d = new Date(nowIst);
  d.setHours(0, 0, 0, 0);
  return d;
}

// A batch is "completed" (and must not fire reminders) when an admin has
// approved its completion, its status is completed, or its end date has passed.
function isBatchCompleted(batch: any, nowIst: Date): boolean {
  if (batch?.completionRequest?.status === 'approved') return true;
  if (String(batch?.status || '').trim().toLowerCase() === 'completed') return true;
  if (batch?.endDate) {
    const end = new Date(batch.endDate);
    // Completed only once the end day is fully past, so the last class day
    // still gets its reminder.
    if (!isNaN(end.getTime()) && end.getTime() < istStartOfDay(nowIst).getTime()) return true;
  }
  return false;
}

export interface ReminderSummary {
  leadMinutes: number;
  nowIst: string;
  batchesChecked: number;
  batchesFired: number;
  pushSent: number;
  pushFailed: number;
  notificationsStored: number;
  details: any[];
}

/**
 * Check every timed batch and, for any whose class starts in ~LEAD_MINUTES,
 * send an FCM push + store in-app notifications for enrolled students.
 * `dryRun` previews without sending or writing.
 */
export async function runReminders(dryRun = false): Promise<ReminderSummary> {
  await connectMongo();
  const nowIst = istNow();
  const todayIndex = nowIst.getDay();

  const batches = await Batch.find({
    timing: { $exists: true, $nin: [null, ''] },
  })
    .populate('studentIds', 'name email fcmTokens notificationPreferences')
    .populate('courseId', 'title courseName name')
    .lean();

  const summary: ReminderSummary = {
    leadMinutes: LEAD_MINUTES,
    nowIst: nowIst.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    batchesChecked: batches.length,
    batchesFired: 0,
    pushSent: 0,
    pushFailed: 0,
    notificationsStored: 0,
    details: [],
  };

  for (const batch of batches) {
    try {
      const classTime = parseClassStart(batch.timing, nowIst);
      if (!classTime) continue;

      // Skip batches that are finished (completed / approved / past end date).
      if (isBatchCompleted(batch, nowIst)) {
        if (dryRun) {
          summary.details.push({ batch: batch.batchName, skipped: 'batch completed' });
        }
        continue;
      }

      // Only on scheduled weekdays.
      if (!allowedDayIndices(batch.daysOfWeek).includes(todayIndex)) continue;

      const reminderTime = new Date(classTime.getTime() - LEAD_MINUTES * 60 * 1000);
      const diff = nowIst.getTime() - reminderTime.getTime();
      const inWindow = Math.abs(diff) <= WINDOW_MS;

      // classTime already carries IST wall-clock values in its local fields
      // (built from istNow() + setHours), so format WITHOUT a timeZone option.
      // Passing timeZone: 'Asia/Kolkata' here re-applies the +5:30 offset and
      // shows e.g. 12:30 as 6:00 PM. The firing math above is unaffected.
      const classTimeStr = classTime.toLocaleTimeString('en-IN', {
        hour: 'numeric', minute: '2-digit', hour12: true,
      });

      if (!inWindow) {
        if (dryRun) {
          summary.details.push({
            batch: batch.batchName, classTime: classTimeStr,
            minutesUntilReminder: Math.round(-diff / 60000), willFire: false,
          });
        }
        continue;
      }

      // Dedup: already reminded for this batch today?
      const already = await Notification.findOne({
        batchId: batch._id,
        type: 'upcoming_class',
        createdAt: { $gte: istStartOfDay(nowIst) },
      }).lean();
      if (already) {
        summary.details.push({ batch: batch.batchName, classTime: classTimeStr, skipped: 'already sent today' });
        continue;
      }

      const course = batch.courseId || {};
      const courseTitle = course.title || course.courseName || course.name || batch.batchName;
      const title = `Class starting in ${LEAD_MINUTES} minutes`;
      const body = `${courseTitle} (${batch.batchName}) begins at ${classTimeStr}. Get ready to join!`;

      const students: any[] = batch.studentIds || [];

      // Collect FCM tokens from students who have reminders enabled.
      const allTokens: string[] = [];
      for (const s of students) {
        if (s?.notificationPreferences && s.notificationPreferences.classReminders === false) continue;
        const toks = (s?.fcmTokens || [])
          .filter((t: any) => t?.isActive && t?.token)
          .map((t: any) => t.token);
        if (toks.length) allTokens.push(...toks);
      }

      summary.batchesFired++;
      const detail: any = {
        batch: batch.batchName, classTime: classTimeStr,
        students: students.length, tokens: allTokens.length, dryRun,
      };

      if (!dryRun) {
        // 1) Push (works even when the LMS tab is closed).
        if (allTokens.length) {
          const push = await sendPushToTokens(allTokens, {
            title, body, type: 'upcoming_class', url: '/student/batch-management',
          });
          summary.pushSent += push.successCount;
          summary.pushFailed += push.failureCount;
          detail.pushSuccess = push.successCount;
          detail.pushFailed = push.failureCount;
          if (push.error) detail.pushError = push.error;

          if (push.invalidTokens.length) {
            await Student.updateMany(
              { 'fcmTokens.token': { $in: push.invalidTokens } },
              { $pull: { fcmTokens: { token: { $in: push.invalidTokens } } } }
            );
            detail.invalidTokensRemoved = push.invalidTokens.length;
          }
        }

        // 2) In-app notifications (bell) for every enrolled student.
        if (students.length) {
          const docs = students.map((s: any) => ({
            studentId: String(s._id),
            batchId: batch._id,
            title,
            message: body,
            type: 'upcoming_class',
            priority: 'high',
            relatedId: batch._id,
            relatedType: 'Batch',
            actionUrl: '/student/batch-management',
            scheduledFor: classTime,
          }));
          await Notification.insertMany(docs);
          summary.notificationsStored += docs.length;
          detail.notificationsStored = docs.length;
        }
      }

      summary.details.push(detail);
    } catch (err: any) {
      summary.details.push({ batch: batch?.batchName, error: err?.message || String(err) });
    }
  }

  return summary;
}
