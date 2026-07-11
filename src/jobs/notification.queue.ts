import { Queue } from "bullmq";

export type NotificationChannel = "email" | "whatsapp" | "push" | "in_app";

export type NotificationJobData = {
  companyId: string;
  userId: string;
  title: string;
  message: string;
  channels: NotificationChannel[];
  email?: string | null;
  phone?: string | null;
};

let queue: Queue | null = null;

function redisConnection() {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  return { url };
}

export function getNotificationQueue() {
  if (queue) return queue;
  const connection = redisConnection();
  if (!connection) return null;

  queue = new Queue("notifications", {
    connection,
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
    },
  });
  return queue;
}

/**
 * in_app is always delivered immediately (realtime toasts).
 * email / whatsapp / push go through BullMQ when Redis is up.
 */
export async function enqueueNotification(data: NotificationJobData) {
  const { deliverNotification } = await import("@/services/notification.service");
  const channels = data.channels.length ? data.channels : (["in_app"] as NotificationChannel[]);
  const instant = channels.filter((c): c is "in_app" => c === "in_app");
  const deferred = channels.filter((c): c is Exclude<NotificationChannel, "in_app"> => c !== "in_app");

  if (instant.length) {
    await deliverNotification({ ...data, channels: instant });
  }

  if (!deferred.length) return;

  const q = getNotificationQueue();
  if (!q) {
    await deliverNotification({ ...data, channels: deferred });
    return;
  }

  await q.add("notify", { ...data, channels: deferred });
}
