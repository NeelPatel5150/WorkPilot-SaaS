import { prisma } from "@/lib/prisma";
import type { EmploymentStatus, UserRole } from "@/generated/prisma";

export const employeeRepo = {
  list(companyId: string) {
    return prisma.employee.findMany({
      where: { companyId },
      include: { department: true, user: true, manager: true },
      orderBy: { createdAt: "desc" },
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
      employmentStatus: EmploymentStatus;
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
  attachCompany(userId: string, companyId: string, role: UserRole) {
    return prisma.user.update({
      where: { id: userId },
      data: { companyId, role },
    });
  },
};
