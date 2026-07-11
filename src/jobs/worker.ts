import { Worker } from "bullmq";
import { deliverNotification } from "@/services/notification.service";
import { processHolidayReminders } from "@/services/holiday.service";
import {
  processAdminDigests,
  processDocumentExpiryAlerts,
} from "@/services/digest.service";
import type { NotificationJobData } from "@/jobs/notification.queue";

const HOUR_MS = 60 * 60 * 1000;

function startOfLocalDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function startNotificationWorker() {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.info("[worker] Redis not configured — inline delivery only");
  } else {
    const worker = new Worker<NotificationJobData>(
      "notifications",
      async (job) => {
        await deliverNotification(job.data);
      },
      { connection: { url } }
    );

    worker.on("failed", (job, err) => {
      console.error(`[worker] job ${job?.id} failed`, err.message);
    });

    console.info("[worker] Notification worker started");
  }

  const runReminders = async () => {
    try {
      const n = await processHolidayReminders();
      if (n > 0) console.info(`[worker] Sent ${n} holiday reminder(s)`);
    } catch (err) {
      console.error("[worker] holiday reminders failed", err);
    }
  };

  let lastDigestDay = 0;
  let lastExpiryDay = 0;

  const runDailyJobs = async () => {
    const dayKey = startOfLocalDay();
    const hour = new Date().getHours();

    // Run digest once per day after 8 AM local
    if (hour >= 8 && lastDigestDay !== dayKey) {
      try {
        const n = await processAdminDigests();
        lastDigestDay = dayKey;
        if (n > 0) console.info(`[worker] Sent ${n} admin digest(s)`);
      } catch (err) {
        console.error("[worker] admin digests failed", err);
      }
    }

    // Document expiry scan once per day
    if (hour >= 9 && lastExpiryDay !== dayKey) {
      try {
        const n = await processDocumentExpiryAlerts();
        lastExpiryDay = dayKey;
        if (n > 0) console.info(`[worker] Sent ${n} document expiry alert(s)`);
      } catch (err) {
        console.error("[worker] document expiry failed", err);
      }
    }
  };

  void runReminders();
  void runDailyJobs();
  setInterval(runReminders, HOUR_MS);
  setInterval(runDailyJobs, HOUR_MS);
  console.info("[worker] Holiday / digest / doc-expiry scanners started");
  return null;
}

startNotificationWorker();
