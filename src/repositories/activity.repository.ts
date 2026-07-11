import { prisma } from "@/lib/prisma";

export const activityRepo = {
  log(companyId: string, action: string, userId?: string | null, metadata?: object) {
    return prisma.activityLog.create({
      data: {
        companyId,
        userId: userId ?? null,
        action,
        metadata: metadata ?? undefined,
      },
    });
  },
  list(companyId: string, take = 100) {
    return prisma.activityLog.findMany({
      where: { companyId },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take,
    });
  },
};
