import { prisma } from "@/lib/prisma";
import type { EmploymentStatus, UserRole } from "@/generated/prisma";

export type EmployeeListFilters = {
  q?: string;
  departmentId?: string;
  status?: EmploymentStatus | "ALL";
};

export const employeeRepo = {
  list(companyId: string) {
    return prisma.employee.findMany({
      where: { companyId },
      include: { department: true, user: true, manager: true },
      orderBy: { createdAt: "desc" },
    });
  },
  listFiltered(companyId: string, filters: EmployeeListFilters = {}) {
    const q = filters.q?.trim();
    const tokens = q ? q.split(/\s+/).filter(Boolean) : [];
    const status =
      filters.status && filters.status !== "ALL" ? filters.status : undefined;
    return prisma.employee.findMany({
      where: {
        companyId,
        ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
        ...(status ? { employmentStatus: status } : {}),
        ...(tokens.length
          ? {
              AND: tokens.map((token) => ({
                OR: [
                  { firstName: { contains: token, mode: "insensitive" as const } },
                  { lastName: { contains: token, mode: "insensitive" as const } },
                  { employeeCode: { contains: token, mode: "insensitive" as const } },
                  { designation: { contains: token, mode: "insensitive" as const } },
                  { user: { email: { contains: token, mode: "insensitive" as const } } },
                ],
              })),
            }
          : {}),
      },
      include: { department: true, user: true, manager: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });
  },
  findById(companyId: string, id: string) {
    return prisma.employee.findFirst({
      where: { id, companyId },
      include: { department: true, user: true, manager: true },
    });
  },
  findByUserId(companyId: string, userId: string) {
    return prisma.employee.findFirst({
      where: { companyId, userId },
      include: { department: true, user: true },
    });
  },
  count(companyId: string) {
    return prisma.employee.count({ where: { companyId } });
  },
  async statusCounts(companyId: string) {
    const [active, inactive] = await Promise.all([
      prisma.employee.count({
        where: { companyId, employmentStatus: "ACTIVE" },
      }),
      prisma.employee.count({
        where: {
          companyId,
          employmentStatus: { in: ["ON_NOTICE", "RESIGNED", "TERMINATED"] },
        },
      }),
    ]);
    return { active, inactive, total: active + inactive };
  },
  create(data: {
    companyId: string;
    userId: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    designation?: string;
    departmentId?: string | null;
    managerId?: string | null;
    phone?: string;
    joiningDate?: Date;
    basicSalary?: number | null;
  }) {
    return prisma.employee.create({ data });
  },
  update(
    companyId: string,
    id: string,
    data: Partial<{
      firstName: string;
      lastName: string;
      designation: string | null;
      departmentId: string | null;
      managerId: string | null;
      phone: string | null;
      emergencyContact: string | null;
      joiningDate: Date;
      employmentStatus: EmploymentStatus;
      basicSalary: number | null;
      exitDate: Date | null;
      exitReason: string | null;
      bankAccountName: string | null;
      bankName: string | null;
      bankAccountNumber: string | null;
      bankIfsc: string | null;
      panNumber: string | null;
      uanNumber: string | null;
      pfEligible: boolean;
      esiEligible: boolean;
    }>
  ) {
    return prisma.employee.updateMany({
      where: { id, companyId },
      data,
    });
  },
};

export const userRepo = {
  updateRole(userId: string, companyId: string, role: UserRole) {
    return prisma.user.updateMany({
      where: { id: userId, companyId },
      data: { role },
    });
  },
  updateProfile(
    userId: string,
    companyId: string,
    data: Partial<{ name: string; email: string; role: UserRole }>
  ) {
    return prisma.user.updateMany({
      where: { id: userId, companyId },
      data,
    });
  },
  attachCompany(userId: string, companyId: string, role: UserRole) {
    return prisma.user.update({
      where: { id: userId },
      data: { companyId, role },
    });
  },
};
