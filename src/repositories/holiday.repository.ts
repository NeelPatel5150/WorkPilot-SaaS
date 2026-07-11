import { prisma } from "@/lib/prisma";

export const holidayRepo = {
  list(companyId: string) {
    return prisma.holiday.findMany({
      where: { companyId },
      orderBy: { date: "asc" },
    });
  },
  create(companyId: string, name: string, date: Date) {
    return prisma.holiday.create({ data: { companyId, name, date } });
  },
  delete(companyId: string, id: string) {
    return prisma.holiday.deleteMany({ where: { id, companyId } });
  },
};

export const announcementRepo = {
  list(companyId: string) {
    return prisma.announcement.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    });
  },
  create(companyId: string, title: string, body: string) {
    return prisma.announcement.create({ data: { companyId, title, body } });
  },
  delete(companyId: string, id: string) {
    return prisma.announcement.deleteMany({ where: { id, companyId } });
  },
};
