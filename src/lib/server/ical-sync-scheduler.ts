import "server-only";

const INTERVAL_MS = 15 * 60 * 1000;
const FIRST_RUN_DELAY_MS = 60 * 1000;

type SchedulerGlobal = typeof globalThis & { __racIcalSyncTimer?: ReturnType<typeof setInterval> };

/** Long-running servers (next start / Cloudways) sync imported iCal feeds every 15 minutes. */
export function startIcalSyncScheduler() {
  const g = globalThis as SchedulerGlobal;
  if (g.__racIcalSyncTimer || process.env.ICAL_SYNC_SCHEDULER === "off") return;

  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      const { syncStaleChannelFeeds } = await import("@/lib/server/channel-sync");
      const synced = await syncStaleChannelFeeds();
      if (synced) console.info(`[ical-sync] refreshed ${synced} feed(s)`);
    } catch (error) {
      console.warn("[ical-sync] run failed", error);
    } finally {
      running = false;
    }
  };

  const first = setTimeout(run, FIRST_RUN_DELAY_MS);
  first.unref?.();
  g.__racIcalSyncTimer = setInterval(run, INTERVAL_MS);
  g.__racIcalSyncTimer.unref?.();
}
