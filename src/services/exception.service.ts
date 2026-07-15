import { prisma } from "@/lib/prisma";
import { employeeRepo } from "@/repositories/employee.repository";
import { activityRepo } from "@/repositories/activity.repository";
import { adminAdjustAttendance } from "@/services/attendance.service";
import { notifyAdmins, notifyUser } from "@/services/notification.service";
import { assertPermission } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { NotFoundError, ValidationError, ForbiddenError } from "@/lib/errors";
import { startOfDayUTC } from "@/lib/utils";
import type { AttendanceExceptionType, UserRole } from "@/generated/prisma";
import type { Role } from "@/lib/permissions";

export async function requestAttendanceException(
  actor: { id: string; companyId: string; role: UserRole },
  input: {
    type: AttendanceExceptionType;
    date: string;
    reason?: string;
    proposedCheckIn?: string;
    proposedCheckOut?: string;
  }
) {
  assertPermission(actor.role, "attendance:mark");
  const employee = await employeeRepo.findByUserId(actor.companyId, actor.id);
  if (!employee) throw new NotFoundError("Employee profile not found");

  const date = startOfDayUTC(new Date(input.date));
  const row = await prisma.attendanceException.create({
    data: {
      companyId: actor.companyId,
      employeeId: employee.id,
      date,
      type: input.type,
      reason: input.reason,
      proposedCheckIn: input.proposedCheckIn ? new Date(input.proposedCheckIn) : null,
      proposedCheckOut: input.proposedCheckOut
        ? new Date(input.proposedCheckOut)
        : null,
    },
  });

  await notifyAdmins(
    actor.companyId,
    "Attendance exception",
    `${employee.firstName} ${employee.lastName} requested ${input.type.replace(/_/g, " ").toLowerCase()} for ${input.date}.`,
    { channels: ["in_app", "email", "push"] }
  );

  return row;
}

export async function listPendingExceptions(
  companyId: string,
  role: UserRole,
  actorUserId?: string
) {
  const canAll = hasPermission(role as Role, "attendance:view_all");
  const canTeam = hasPermission(role as Role, "attendance:view_team");
  if (!canAll && !canTeam) {
    throw new ForbiddenError("You do not have permission for this action");
  }

  let teamEmployeeIds: string[] | null = null;
  if (!canAll && canTeam && actorUserId) {
    const me = await employeeRepo.findByUserId(companyId, actorUserId);
    if (!me) return [];
    const reports = await prisma.employee.findMany({
      where: { companyId, managerId: me.id },
      select: { id: true },
    });
    teamEmployeeIds = reports.map((r) => r.id);
    if (teamEmployeeIds.length === 0) return [];
  }

  return prisma.attendanceException.findMany({
    where: {
      companyId,
      status: "PENDING",
      ...(teamEmployeeIds ? { employeeId: { in: teamEmployeeIds } } : {}),
    },
    include: { employee: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function listMyExceptions(companyId: string, userId: string, role: UserRole) {
  assertPermission(role, "attendance:view_own");
  const employee = await employeeRepo.findByUserId(companyId, userId);
  if (!employee) throw new NotFoundError("Employee profile not found");
  return prisma.attendanceException.findMany({
    where: { companyId, employeeId: employee.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
}

export async function decideException(
  actor: { id: string; companyId: string; role: UserRole },
  id: string,
  decision: "APPROVED" | "REJECTED",
  comment?: string
) {
  const canAll = hasPermission(actor.role as Role, "attendance:view_all");
  const canTeam = hasPermission(actor.role as Role, "attendance:view_team");
  if (!canAll && !canTeam) {
    throw new ForbiddenError("You do not have permission for this action");
  }

  const row = await prisma.attendanceException.findFirst({
    where: { id, companyId: actor.companyId },
    include: { employee: true },
  });
  if (!row) throw new NotFoundError("Exception not found");
  if (row.status !== "PENDING") throw new ValidationError("Already decided");

  if (!canAll) {
    const me = await employeeRepo.findByUserId(actor.companyId, actor.id);
    if (!me || row.employee.managerId !== me.id) {
      throw new ForbiddenError("You can only decide exceptions for your team");
    }
  }

  await prisma.attendanceException.update({
    where: { id },
    data: {
      status: decision,
      reviewerId: actor.id,
      reviewComment: comment,
    },
  });

  if (decision === "APPROVED") {
    const checkIn =
      row.proposedCheckIn ??
      new Date(
        Date.UTC(
          row.date.getUTCFullYear(),
          row.date.getUTCMonth(),
          row.date.getUTCDate(),
          10,
          0
        )
      );
    const checkOut = row.proposedCheckOut ?? null;
    await adminAdjustAttendance(actor, {
      employeeId: row.employeeId,
      date: row.date,
      checkIn,
      checkOut,
    });
  }

  await activityRepo.log(actor.companyId, `attendance.exception.${decision.toLowerCase()}`, actor.id, {
    exceptionId: id,
  });

  await notifyUser({
    companyId: actor.companyId,
    userId: row.employee.userId,
    title: `Exception ${decision.toLowerCase()}`,
    message: `Your ${row.type.replace(/_/g, " ").toLowerCase()} request was ${decision.toLowerCase()}.`,
    channels: ["in_app", "email", "push"],
  });
}
