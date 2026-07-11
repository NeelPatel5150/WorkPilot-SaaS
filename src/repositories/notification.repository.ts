import { prisma } from "@/lib/prisma";

export const notificationRepo = {
  create(data: {
    companyId: string;
    userId: string;
    title: string;
    message: string;
    channel: string;
  }) {
    return prisma.notification.create({ data });
  },
  listForUser(companyId: string, userId: string, take = 50) {
    return prisma.notification.findMany({
      where: { companyId, userId },
      orderBy: { createdAt: "desc" },
      take,
    });
  },
  unreadCount(companyId: string, userId: string) {
    return prisma.notification.count({
      where: { companyId, userId, readAt: null, channel: "in_app" },
    });
  },
  markRead(companyId: string, userId: string, id: string) {
    return prisma.notification.updateMany({
      where: { id, companyId, userId },
      data: { readAt: new Date() },
    });
  },
  markAllRead(companyId: string, userId: string) {
    return prisma.notification.updateMany({
      where: { companyId, userId, readAt: null },
      data: { readAt: new Date() },
    });
  },
};
