import { prisma } from "@/lib/prisma";
import type { LeaveStatus } from "@/generated/prisma";

export const leaveRepo = {
  listTypes(companyId: string, opts?: { applicableOnly?: boolean }) {
    return prisma.leaveType.findMany({
      where: {
        companyId,
        ...(opts?.applicableOnly ? { isApplicable: true } : {}),
      },
      orderBy: { name: "asc" },
    });
  },
  findType(companyId: string, id: string) {
    return prisma.leaveType.findFirst({ where: { id, companyId } });
  },
  createType(
    companyId: string,
    data: {
      name: string;
      code?: string | null;
      defaultDays: number;
      requiresProof?: boolean;
      carryForward?: boolean;
      maxCarryDays?: number;
      sandwichRule?: boolean;
      isApplicable?: boolean;
    }
  ) {
    return prisma.leaveType.create({
      data: {
        companyId,
        name: data.name,
        code: data.code ?? null,
        defaultDays: data.defaultDays,
        requiresProof: data.requiresProof ?? false,
        carryForward: data.carryForward ?? false,
        maxCarryDays: data.maxCarryDays ?? 0,
        sandwichRule: data.sandwichRule ?? false,
        isApplicable: data.isApplicable ?? true,
      },
    });
  },
  updateType(
    companyId: string,
    id: string,
    data: {
      name?: string;
      code?: string | null;
      defaultDays?: number;
      requiresProof?: boolean;
      carryForward?: boolean;
      maxCarryDays?: number;
      sandwichRule?: boolean;
      isApplicable?: boolean;
    }
  ) {
    return prisma.leaveType.updateMany({
      where: { id, companyId },
      data,
    });
  },
  seedDefaultTypes(companyId: string) {
    // Only Casual Leave is company-default. Admins opt into SL/EL/WFH/CO in Settings.
    return prisma.leaveType.createMany({
      data: [
        {
          companyId,
          name: "Casual Leave",
          code: "CL",
          defaultDays: 12,
          sandwichRule: true,
          carryForward: false,
          maxCarryDays: 0,
          requiresProof: false,
          isApplicable: true,
        },
      ],
      skipDuplicates: true,
    });
  },
  findTypeByCode(companyId: string, code: string) {
    return prisma.leaveType.findFirst({
      where: { companyId, code },
    });
  },
  findTypeByName(companyId: string, name: string) {
    return prisma.leaveType.findFirst({
      where: { companyId, name },
    });
  },
  listRequests(
    companyId: string,
    filters?: { employeeId?: string; status?: LeaveStatus; take?: number }
  ) {
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
      ...(filters?.take ? { take: filters.take } : {}),
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
      update: {
        allocated: data.allocated,
        ...(data.used !== undefined ? { used: data.used } : {}),
      },
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
