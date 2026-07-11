import { prisma } from "@/lib/prisma";
import type { LeaveStatus } from "@/generated/prisma";

export const leaveRepo = {
  listTypes(companyId: string) {
    return prisma.leaveType.findMany({ where: { companyId }, orderBy: { name: "asc" } });
  },
  createType(companyId: string, name: string, defaultDays: number, requiresProof = false) {
    return prisma.leaveType.create({
      data: { companyId, name, defaultDays, requiresProof },
    });
  },
  seedDefaultTypes(companyId: string) {
    const defaults = [
      { name: "Casual Leave", code: "CL", defaultDays: 12, sandwichRule: true, carryForward: false },
      { name: "Sick Leave", code: "SL", defaultDays: 10, sandwichRule: false, carryForward: false },
      { name: "Earned Leave", code: "EL", defaultDays: 15, sandwichRule: true, carryForward: true, maxCarryDays: 30 },
      { name: "WFH", code: "WFH", defaultDays: 24, sandwichRule: false, carryForward: false },
      { name: "Comp Off", code: "CO", defaultDays: 0, sandwichRule: false, carryForward: false },
    ];
    return prisma.leaveType.createMany({
      data: defaults.map((d) => ({ companyId, ...d })),
      skipDuplicates: true,
    });
  },
  listRequests(companyId: string, filters?: { employeeId?: string; status?: LeaveStatus }) {
    return prisma.leaveRequest.findMany({
      where: {
        companyId,
        ...(filters?.employeeId ? { employeeId: filters.employeeId } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
      },
      include: {
        employee: true,
        leaveType: true,
      },
      orderBy: { createdAt: "desc" },
    });
  },
  findRequest(companyId: string, id: string) {
    return prisma.leaveRequest.findFirst({
      where: { id, companyId },
      include: { employee: true, leaveType: true },
    });
  },
  createRequest(data: {
    companyId: string;
    employeeId: string;
    leaveTypeId: string;
    startDate: Date;
    endDate: Date;
    isHalfDay?: boolean;
    reason?: string;
    coverEmployeeId?: string | null;
  }) {
    return prisma.leaveRequest.create({ data });
  },
  updateStatus(
    companyId: string,
    id: string,
    data: {
      status: LeaveStatus;
      approverId?: string;
      approverComment?: string;
    }
  ) {
    return prisma.leaveRequest.updateMany({
      where: { id, companyId },
      data,
    });
  },
  getBalance(companyId: string, employeeId: string, leaveTypeId: string, year: number) {
    return prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year },
      },
    });
  },
  listBalances(companyId: string, employeeId: string, year: number) {
    return prisma.leaveBalance.findMany({
      where: { companyId, employeeId, year },
      include: { leaveType: true },
    });
  },
  upsertBalance(data: {
    companyId: string;
    employeeId: string;
    leaveTypeId: string;
    year: number;
    allocated: number;
    used?: number;
  }) {
    return prisma.leaveBalance.upsert({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: data.employeeId,
          leaveTypeId: data.leaveTypeId,
          year: data.year,
        },
      },
      create: { ...data, used: data.used ?? 0 },
      update: { allocated: data.allocated, used: data.used },
    });
  },
  incrementUsed(companyId: string, employeeId: string, leaveTypeId: string, year: number, days: number) {
    return prisma.leaveBalance.updateMany({
      where: { companyId, employeeId, leaveTypeId, year },
      data: { used: { increment: days } },
    });
  },
  countPending(companyId: string) {
    return prisma.leaveRequest.count({
      where: { companyId, status: "PENDING" },
    });
  },
};
