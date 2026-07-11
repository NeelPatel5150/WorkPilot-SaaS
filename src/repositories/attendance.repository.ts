import { prisma } from "@/lib/prisma";
import type { AttendanceStatus, Prisma } from "@/generated/prisma";
import { startOfDayUTC } from "@/lib/utils";

export const attendanceRepo = {
  findToday(companyId: string, employeeId: string, date = new Date()) {
    return prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date: startOfDayUTC(date),
        },
      },
    });
  },
  listForCompany(companyId: string, date?: Date) {
    const where: Prisma.AttendanceWhereInput = { companyId };
    if (date) where.date = startOfDayUTC(date);
    return prisma.attendance.findMany({
      where,
      include: { employee: true },
      orderBy: [{ date: "desc" }, { checkIn: "desc" }],
      take: 100,
    });
  },
  listForEmployee(companyId: string, employeeId: string) {
    return prisma.attendance.findMany({
      where: { companyId, employeeId },
      orderBy: { date: "desc" },
      take: 60,
    });
  },
  listForEmployeeInRange(
    companyId: string,
    employeeId: string,
    from: Date,
    to: Date
  ) {
    return prisma.attendance.findMany({
      where: {
        companyId,
        employeeId,
        date: {
          gte: startOfDayUTC(from),
          lte: startOfDayUTC(to),
        },
      },
      orderBy: { date: "asc" },
    });
  },
  listToday(companyId: string) {
    return prisma.attendance.findMany({
      where: { companyId, date: startOfDayUTC() },
      include: { employee: true },
      orderBy: { checkIn: "asc" },
    });
  },
  upsertCheckIn(data: {
    companyId: string;
    employeeId: string;
    date: Date;
    checkIn: Date;
    status: AttendanceStatus;
    isLate: boolean;
    checkInIp?: string;
    checkInLat?: number;
    checkInLng?: number;
  }) {
    return prisma.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId: data.employeeId,
          date: data.date,
        },
      },
      create: data,
      update: {
        checkIn: data.checkIn,
        status: data.status,
        isLate: data.isLate,
        checkInIp: data.checkInIp,
        checkInLat: data.checkInLat,
        checkInLng: data.checkInLng,
      },
    });
  },
  checkOut(
    companyId: string,
    employeeId: string,
    date: Date,
    patch: {
      checkOut: Date;
      workingHours: number;
      overtimeHours: number;
      isEarlyExit: boolean;
    }
  ) {
    return prisma.attendance.updateMany({
      where: { companyId, employeeId, date },
      data: patch,
    });
  },
  countPresentToday(companyId: string) {
    return prisma.attendance.count({
      where: {
        companyId,
        date: startOfDayUTC(),
        status: { in: ["PRESENT", "LATE", "HALF_DAY"] },
      },
    });
  },
};
