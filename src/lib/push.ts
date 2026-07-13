import { activityRepo } from "@/repositories/activity.repository";

/**
 * FCM browser push - Phase 2 stub.
 * When FIREBASE_* env vars are set, wire firebase-admin here.
 * Until then we log + record activity so the fan-out path stays complete.
 */
export async function sendPush(opts: {
  companyId: string;
  userId: string;
  title: string;
  message: string;
}) {
  const configured = Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
  );

  if (!configured) {
    console.info(`[push:dev] user=${opts.userId} title=${opts.title}`);
    await activityRepo.log(opts.companyId, "notification.push.skipped", opts.userId, {
      reason: "Firebase credentials missing",
      title: opts.title,
    });
    return { skipped: true };
  }

  // Placeholder for firebase-admin messaging.send(...)
  await activityRepo.log(opts.companyId, "notification.push.queued", opts.userId, {
    title: opts.title,
  });
  return { ok: true };
}
