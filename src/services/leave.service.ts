import { leaveRepo } from "@/repositories/leave.repository";
import { employeeRepo } from "@/repositories/employee.repository";
import { activityRepo } from "@/repositories/activity.repository";
import { holidayRepo } from "@/repositories/holiday.repository";
import { assertPermission } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { daysBetween, startOfDayUTC } from "@/lib/utils";
import { getWorkPolicy, isWeeklyOff } from "@/services/policy.service";
import { notifyAdmins, notifyUser } from "@/services/notification.service";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/generated/prisma";

export async function listLeaveTypes(companyId: string) {
  return leaveRepo.listTypes(companyId);
}

/** Count leave days with optional sandwich (weekend between leave edges counts). */
export async function countLeaveDays(
  companyId: string,
  startDate: Date,
  endDate: Date,
  isHalfDay: boolean,
  sandwich: boolean
) {
  if (isHalfDay) return 0.5;
  const policy = await getWorkPolicy(companyId);
  const holidays = await holidayRepo.list(companyId);
  const holidaySet = new Set(
    holidays.map((h) => startOfDayUTC(h.date).toISOString().slice(0, 10))
  );

  let days = 0;
  for (
    let t = startDate.getTime();
    t <= endDate.getTime();
    t += 24 * 60 * 60 * 1000
  ) {
    const d = new Date(t);
    const key = startOfDayUTC(d).toISOString().slice(0, 10);
    if (isWeeklyOff(policy, d)) {
      if (sandwich) days += 1;
      continue;
    }
    if (holidaySet.has(key)) {
      if (sandwich) days += 1;
      continue;
    }
    days += 1;
  }
  return days || daysBetween(startDate, endDate);
}

export async function applyLeave(
  actor: { id: string; companyId: string; role: UserRole },
  input: {
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    isHalfDay?: boolean;
    reason?: string;
    coverEmployeeId?: string;
  }
) {
  assertPermission(actor.role, "leave:apply");
  const employee = await employeeRepo.findByUserId(actor.companyId, actor.id);
  if (!employee) throw new NotFoundError("Employee profile not found");

  const startDate = startOfDayUTC(new Date(input.startDate));
  const endDate = startOfDayUTC(new Date(input.endDate));
  if (endDate < startDate) throw new ValidationError("End date must be after start date");

  const type = (await leaveRepo.listTypes(actor.companyId)).find(
    (t) => t.id === input.leaveTypeId
  );
  if (!type) throw new NotFoundError("Leave type not found");

  const days = await countLeaveDays(
    actor.companyId,
    startDate,
    endDate,
    !!input.isHalfDay,
    type.sandwichRule
  );
  const year = startDate.getUTCFullYear();

  let balance = await leaveRepo.getBalance(
    actor.companyId,
    employee.id,
    input.leaveTypeId,
    year
  );

  if (!balance) {
    balance = await leaveRepo.upsertBalance({
      companyId: actor.companyId,
      employeeId: employee.id,
      leaveTypeId: type.id,
      year,
      allocated: type.defaultDays,
      used: 0,
    });
  }

  const remaining = balance.allocated - balance.used;
  if (days > remaining) {
    throw new ValidationError(`Insufficient leave balance (${remaining} days left)`);
  }

  if (input.coverEmployeeId) {
    const cover = await employeeRepo.findById(actor.companyId, input.coverEmployeeId);
    if (!cover) throw new ValidationError("Cover employee not found");
  }

  const request = await leaveRepo.createRequest({
    companyId: actor.companyId,
    employeeId: employee.id,
    leaveTypeId: input.leaveTypeId,
    startDate,
    endDate,
    isHalfDay: input.isHalfDay ?? false,
    reason: input.reason,
    coverEmployeeId: input.coverEmployeeId || null,
  });

  await activityRepo.log(actor.companyId, "leave.applied", actor.id, {
    leaveRequestId: request.id,
  });

  // Notify manager if set, else admins
  if (employee.managerId) {
    const manager = await prisma.employee.findFirst({
      where: { id: employee.managerId, companyId: actor.companyId },
    });
    if (manager?.userId) {
      await notifyUser({
        companyId: actor.companyId,
        userId: manager.userId,
        title: "Team leave request",
        message: `${employee.firstName} ${employee.lastName} applied for ${type.name} leave.`,
        channels: ["in_app", "email", "push"],
      });
    }
  } else {
    await notifyAdmins(
      actor.companyId,
      "New leave request",
      `${employee.firstName} ${employee.lastName} applied for leave (${startDate.toISOString().slice(0, 10)} → ${endDate.toISOString().slice(0, 10)}).`
    );
  }

  return request;
}

export async function listMyLeaves(companyId: string, userId: string, role: UserRole) {
  assertPermission(role, "leave:view_own");
  const employee = await employeeRepo.findByUserId(companyId, userId);
  if (!employee) throw new NotFoundError("Employee profile not found");
  return leaveRepo.listRequests(companyId, { employeeId: employee.id });
}

export async function listCompanyLeaves(companyId: string, role: UserRole, userId?: string) {
  if (hasPermission(role as never, "leave:approve_all")) {
    return leaveRepo.listRequests(companyId);
  }
  if (hasPermission(role as never, "leave:approve_team") && userId) {
    const me = await employeeRepo.findByUserId(companyId, userId);
    if (!me) return [];
    const reports = await prisma.employee.findMany({
      where: { companyId, managerId: me.id },
      select: { id: true },
    });
    const ids = reports.map((r) => r.id);
    const all = await leaveRepo.listRequests(companyId);
    return all.filter((r) => ids.includes(r.employeeId));
  }
  assertPermission(role, "leave:approve_all");
  return [];
}

export async function decideLeave(
  actor: { id: string; companyId: string; role: UserRole },
  requestId: string,
  decision: "APPROVED" | "REJECTED",
  comment?: string
) {
  const canAll = hasPermission(actor.role as never, "leave:approve_all");
  const canTeam = hasPermission(actor.role as never, "leave:approve_team");
  if (!canAll && !canTeam) {
    assertPermission(actor.role, "leave:approve_all");
  }

  const request = await leaveRepo.findRequest(actor.companyId, requestId);
  if (!request) throw new NotFoundError("Leave request not found");
  if (request.status !== "PENDING") {
    throw new ValidationError("Leave request already decided");
  }

  if (!canAll && canTeam) {
    const me = await employeeRepo.findByUserId(actor.companyId, actor.id);
    if (!me || request.employee.managerId !== me.id) {
      throw new ValidationError("You can only approve your direct reports");
    }
  }

  await leaveRepo.updateStatus(actor.companyId, requestId, {
    status: decision,
    approverId: actor.id,
    approverComment: comment,
  });

  if (decision === "APPROVED") {
    const days = await countLeaveDays(
      actor.companyId,
      request.startDate,
      request.endDate,
      request.isHalfDay,
      request.leaveType.sandwichRule
    );
    const year = request.startDate.getUTCFullYear();
    await leaveRepo.incrementUsed(
      actor.companyId,
      request.employeeId,
      request.leaveTypeId,
      year,
      days
    );
  }

  await activityRepo.log(actor.companyId, `leave.${decision.toLowerCase()}`, actor.id, {
    leaveRequestId: requestId,
  });

  await notifyUser({
    companyId: actor.companyId,
    userId: request.employee.userId,
    title: `Leave ${decision.toLowerCase()}`,
    message: `Your ${request.leaveType.name} leave was ${decision.toLowerCase()}.${
      comment ? ` Note: ${comment}` : ""
    }`,
    channels: ["in_app", "email", "whatsapp", "push"],
  });
}

export async function myBalances(companyId: string, userId: string) {
  const employee = await employeeRepo.findByUserId(companyId, userId);
  if (!employee) throw new NotFoundError("Employee profile not found");
  return leaveRepo.listBalances(companyId, employee.id, new Date().getFullYear());
}
