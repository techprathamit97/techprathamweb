// Next.js instrumentation: runs once when the server process starts.
// We use it to start an in-process scheduler that fires the class reminder
// job every minute, so students get a push ~10 min before class even with the
// LMS tab closed. Requires a long-lived server (next start / node) — this does
// NOT work on ephemeral serverless; use an external cron there instead.

export async function register() {
  // Only run in the Node.js server runtime (not Edge, not the browser).
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // Allow disabling without code changes.
  if (process.env.ENABLE_CLASS_REMINDER_SCHEDULER === 'false') {
    console.log('[scheduler] Class reminder scheduler disabled via env.');
    return;
  }

  // Guard against double-registration (dev HMR, multiple register calls).
  const g = globalThis as any;
  if (g.__classReminderSchedulerStarted) return;
  g.__classReminderSchedulerStarted = true;

  const { runReminders } = await import('@/lib/classReminder');

  let running = false;
  const tick = async () => {
    if (running) return; // never overlap runs
    running = true;
    try {
      const summary = await runReminders(false);
      if (summary.batchesFired > 0) {
        console.log(
          `[scheduler] class-reminder: fired ${summary.batchesFired} batch(es), ` +
            `push ${summary.pushSent} ok / ${summary.pushFailed} failed, ` +
            `${summary.notificationsStored} in-app stored.`
        );
      }
    } catch (err) {
      console.error('[scheduler] class-reminder run failed:', err);
    } finally {
      running = false;
    }
  };

  // Align the first run to the next minute boundary, then run every 60s.
  const msToNextMinute = 60000 - (Date.now() % 60000);
  console.log(
    `[scheduler] Class reminder scheduler started; first run in ${Math.round(
      msToNextMinute / 1000
    )}s, then every 60s.`
  );
  setTimeout(() => {
    tick();
    setInterval(tick, 60 * 1000);
  }, msToNextMinute);
}
