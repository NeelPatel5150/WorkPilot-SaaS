import { notificationRepo } from "@/repositories/notification.repository";
import { activityRepo } from "@/repositories/activity.repository";
import { sendEmail } from "@/lib/email";
import { sendWhatsApp } from "@/lib/whatsapp";
import { sendPush } from "@/lib/push";
import { enqueueNotification, type NotificationJobData } from "@/jobs/notification.queue";
import { publishToUser } from "@/lib/realtime";
import { prisma } from "@/lib/prisma";

export async function deliverNotification(data: NotificationJobData) {
  const channels = data.channels.length ? data.channels : ["in_app"];
  const company = await prisma.company.findUnique({
    where: { id: data.companyId },
    select: {
      id: true,
      name: true,
      primaryColor: true,
      secondaryColor: true,
      logoUrl: true,
      slug: true,
      customDomain: true,
    },
  });

  for (const channel of channels) {
    try {
      if (channel === "in_app") {
        const row = await notificationRepo.create({
          companyId: data.companyId,
          userId: data.userId,
          title: data.title,
          message: data.message,
          channel: "in_app",
        });
        publishToUser(data.userId, {
          type: "notification",
          id: row.id,
          title: row.title,
          message: row.message,
          createdAt: row.createdAt.toISOString(),
        });
        continue;
      }

      if (channel === "email") {
        if (!data.email) continue;
        const { wrapBrandedEmail, escapeHtml } = await import("@/lib/brand-email");
        const { getTenantLoginUrl } = await import("@/lib/tenant-url");
        const html = company
          ? wrapBrandedEmail({
              company,
              title: data.title,
              bodyHtml: `<p style="margin:0;">${escapeHtml(data.message)}</p>`,
              ctaLabel: "Open portal",
              ctaUrl: getTenantLoginUrl(company),
            })
          : `<p>${data.message}</p>`;
        await sendEmail({
          companyId: data.companyId,
          to: data.email,
          subject: data.title,
          html,
        });
        await notificationRepo.create({
          companyId: data.companyId,
          userId: data.userId,
          title: data.title,
          message: data.message,
          channel: "email",
        });
        continue;
      }

      if (channel === "whatsapp") {
        if (!data.phone) continue;
        await sendWhatsApp({
          companyId: data.companyId,
          to: data.phone,
          body: `${data.title}\n${data.message}`,
        });
        await notificationRepo.create({
          companyId: data.companyId,
          userId: data.userId,
          title: data.title,
          message: data.message,
          channel: "whatsapp",
        });
        continue;
      }

      if (channel === "push") {
        await sendPush({
          companyId: data.companyId,
          userId: data.userId,
          title: data.title,
          message: data.message,
        });
        await notificationRepo.create({
          companyId: data.companyId,
          userId: data.userId,
          title: data.title,
          message: data.message,
          channel: "push",
        });
      }
    } catch (error) {
      console.error(`Notification channel ${channel} failed`, error);
      await activityRepo.log(data.companyId, `notification.${channel}.failed`, data.userId, {
        error: error instanceof Error ? error.message : "unknown",
        title: data.title,
      });
    }
  }
}

export async function notifyUser(opts: {
  companyId: string;
  userId: string;
  title: string;
  message: string;
  channels?: NotificationJobData["channels"];
}) {
  const user = await prisma.user.findFirst({
    where: { id: opts.userId, companyId: opts.companyId },
    include: { employee: true },
  });
  if (!user) return;

  await enqueueNotification({
    companyId: opts.companyId,
    userId: opts.userId,
    title: opts.title,
    message: opts.message,
    channels: opts.channels ?? ["in_app", "email", "whatsapp", "push"],
    email: user.email,
    phone: user.employee?.phone ?? null,
  });
}

export async function notifyAdmins(
  companyId: string,
  title: string,
  message: string,
  opts?: {
    channels?: Array<"in_app" | "email" | "whatsapp" | "push">;
    excludeUserId?: string;
  }
) {
  const admins = await prisma.user.findMany({
    where: {
      companyId,
      isActive: true,
      role: { in: ["COMPANY_ADMIN", "HR", "SUPER_ADMIN", "MANAGER"] },
      ...(opts?.excludeUserId ? { id: { not: opts.excludeUserId } } : {}),
    },
    include: { employee: true },
  });

  const channels = opts?.channels ?? ["in_app", "email", "whatsapp", "push"];

  await Promise.all(
    admins.map((admin) =>
      enqueueNotification({
        companyId,
        userId: admin.id,
        title,
        message,
        channels,
        email: admin.email,
        phone: admin.employee?.phone ?? null,
      })
    )
  );
}

/** Notify every active user in the company (employees + admins). */
export async function notifyCompanyUsers(
  companyId: string,
  title: string,
  message: string,
  opts?: {
    channels?: NotificationJobData["channels"];
    employeesOnly?: boolean;
  }
) {
  const users = await prisma.user.findMany({
    where: {
      companyId,
      isActive: true,
      ...(opts?.employeesOnly ? { role: "EMPLOYEE" } : {}),
    },
    include: { employee: true },
  });

  const channels = opts?.channels ?? ["in_app", "email", "push"];

  await Promise.all(
    users.map((user) =>
      enqueueNotification({
        companyId,
        userId: user.id,
        title,
        message,
        channels,
        email: user.email,
        phone: user.employee?.phone ?? null,
      })
    )
  );
}

export async function listMyNotifications(companyId: string, userId: string) {
  return notificationRepo.listForUser(companyId, userId);
}

export async function markNotificationRead(
  companyId: string,
  userId: string,
  id: string
) {
  return notificationRepo.markRead(companyId, userId, id);
}

export async function markAllNotificationsRead(companyId: string, userId: string) {
  return notificationRepo.markAllRead(companyId, userId);
}
