import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/session";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { activityRepo } from "@/repositories/activity.repository";
import { notifyUser } from "@/services/notification.service";
import type { EmploymentStatus, UserRole } from "@/generated/prisma";

export async function offboardEmployee(
  actor: { id: string; companyId: string; role: UserRole },
  employeeId: string,
  input: { exitReason?: string; status?: EmploymentStatus }
) {
  assertPermission(actor.role, "employees:manage");
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, companyId: actor.companyId },
    include: { user: { select: { id: true, role: true } } },
  });
  if (!employee) throw new NotFoundError("Employee not found");

  if (
    employee.user.role === "COMPANY_ADMIN" ||
    employee.user.role === "SUPER_ADMIN"
  ) {
    throw new ValidationError("Company admins cannot be offboarded");
  }
  if (employee.userId === actor.id) {
    throw new ValidationError("You cannot offboard yourself");
  }

  const status = input.status ?? "RESIGNED";
  if (status === "ACTIVE") throw new ValidationError("Use a non-active status to offboard");

  // Resigned / terminated / on-notice - always revoke portal login
  await prisma.$transaction([
    prisma.employee.update({
      where: { id: employeeId },
      data: {
        employmentStatus: status,
        exitDate: new Date(),
        exitReason: input.exitReason ?? null,
      },
    }),
    prisma.user.update({
      where: { id: employee.userId },
      data: { isActive: false },
    }),
  ]);

  await activityRepo.log(actor.companyId, "employee.offboarded", actor.id, {
    employeeId,
    status,
    accessKilled: true,
  });

  return { success: true };
}

export async function markOnboardingDone(
  actor: { id: string; companyId: string; role: UserRole },
  employeeId: string
) {
  assertPermission(actor.role, "employees:manage");
  await prisma.employee.updateMany({
    where: { id: employeeId, companyId: actor.companyId },
    data: { onboardingDone: true },
  });
}

export async function reactivateEmployee(
  actor: { id: string; companyId: string; role: UserRole },
  employeeId: string
) {
  assertPermission(actor.role, "employees:manage");
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, companyId: actor.companyId },
  });
  if (!employee) throw new NotFoundError("Employee not found");
  await prisma.$transaction([
    prisma.employee.update({
      where: { id: employeeId },
      data: {
        employmentStatus: "ACTIVE",
        exitDate: null,
        exitReason: null,
      },
    }),
    prisma.user.update({
      where: { id: employee.userId },
      data: { isActive: true },
    }),
  ]);
  await activityRepo.log(actor.companyId, "employee.reactivated", actor.id, {
    employeeId,
  });

  await notifyUser({
    companyId: actor.companyId,
    userId: employee.userId,
    title: "Account reactivated",
    message: "Your WorkPilot portal access has been restored. You can sign in again.",
    channels: ["in_app", "email"],
  });
}
