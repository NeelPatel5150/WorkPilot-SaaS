import { prisma } from "@/lib/prisma";

export const holidayRepo = {
  list(companyId: string) {
    return prisma.holiday.findMany({
      where: { companyId },
      orderBy: { date: "asc" },
    });
  },
  listUpcoming(companyId: string, fromDate: Date) {
    return prisma.holiday.findMany({
      where: { companyId, date: { gte: fromDate } },
      orderBy: { date: "asc" },
    });
  },
  create(companyId: string, name: string, date: Date) {
    return prisma.holiday.create({ data: { companyId, name, date } });
  },
  createMany(companyId: string, rows: { name: string; date: Date }[]) {
    if (rows.length === 0) return { count: 0 };
    return prisma.holiday.createMany({
      data: rows.map((r) => ({ companyId, name: r.name, date: r.date })),
    });
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
