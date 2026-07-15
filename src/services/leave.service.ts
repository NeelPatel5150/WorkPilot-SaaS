import { leaveRepo } from "@/repositories/leave.repository";
import { employeeRepo } from "@/repositories/employee.repository";
import { activityRepo } from "@/repositories/activity.repository";
import { holidayRepo } from "@/repositories/holiday.repository";
import { assertPermission } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { daysBetween, formatDate, startOfDayUTC } from "@/lib/utils";
import { getWorkPolicy, isWeeklyOff } from "@/services/policy.service";
import { notifyAdmins, notifyUser } from "@/services/notification.service";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/generated/prisma";

export async function listLeaveTypes(companyId: string, opts?: { applicableOnly?: boolean }) {
  return leaveRepo.listTypes(companyId, opts);
}

export async function updateLeaveType(
  actor: { id: string; companyId: string; role: UserRole },
  id: string,
  input: {
    name: string;
    code?: string | null;
    defaultDays: number;
    requiresProof?: boolean;
    carryForward?: boolean;
    maxCarryDays?: number;
    sandwichRule?: boolean;
    isApplicable: boolean;
  }
) {
  assertPermission(actor.role, "settings:manage");
  const existing = await leaveRepo.findType(actor.companyId, id);
  if (!existing) throw new NotFoundError("Leave type not found");

  const name = input.name.trim();
  if (!name) throw new ValidationError("Leave type name is required");
  if (!Number.isFinite(input.defaultDays) || input.defaultDays < 0) {
    throw new ValidationError("Default days must be 0 or more");
  }

  await leaveRepo.updateType(actor.companyId, id, {
    name,
    code: input.code?.trim() || null,
    defaultDays: Math.floor(input.defaultDays),
    requiresProof: !!input.requiresProof,
    carryForward: !!input.carryForward,
    maxCarryDays: Math.max(0, Math.floor(input.maxCarryDays ?? 0)),
    sandwichRule: !!input.sandwichRule,
    isApplicable: input.isApplicable,
  });

  await activityRepo.log(actor.companyId, "leave_type.updated", actor.id, {
    leaveTypeId: id,
    isApplicable: input.isApplicable,
  });
}

export async function createLeaveType(
  actor: { id: string; companyId: string; role: UserRole },
  input: {
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
  assertPermission(actor.role, "settings:manage");
  const name = input.name.trim();
  if (!name) throw new ValidationError("Leave type name is required");
  if (!Number.isFinite(input.defaultDays) || input.defaultDays < 0) {
    throw new ValidationError("Default days must be 0 or more");
  }

  const created = await leaveRepo.createType(actor.companyId, {
    name,
    code: input.code?.trim() || null,
    defaultDays: Math.floor(input.defaultDays),
    requiresProof: !!input.requiresProof,
    carryForward: !!input.carryForward,
    maxCarryDays: Math.max(0, Math.floor(input.maxCarryDays ?? 0)),
    sandwichRule: !!input.sandwichRule,
    isApplicable: input.isApplicable ?? true,
  });

  await activityRepo.log(actor.companyId, "leave_type.created", actor.id, {
    leaveTypeId: created.id,
  });

  return created;
}

/**
 * Enable a catalog leave type for this company (or re-activate if it was turned off).
 * Comp Off gets 0 default allotment — days are granted per employee later.
 */
export async function addCatalogLeaveType(
  actor: { id: string; companyId: string; role: UserRole },
  catalogKey: string
) {
  assertPermission(actor.role, "settings:manage");
  const { getLeaveCatalogPreset } = await import("@/lib/leave-catalog");
  const preset = getLeaveCatalogPreset(catalogKey);
  if (!preset) throw new ValidationError("Unknown leave type");

  const existing =
    (await leaveRepo.findTypeByCode(actor.companyId, preset.code)) ||
    (await leaveRepo.findTypeByName(actor.companyId, preset.name));

  let leaveTypeId: string;

  if (existing) {
    if (existing.isApplicable) {
      throw new ValidationError(`${preset.name} is already enabled for your company`);
    }
    await leaveRepo.updateType(actor.companyId, existing.id, {
      isApplicable: true,
      defaultDays: preset.defaultDays,
      requiresProof: preset.requiresProof,
      carryForward: preset.carryForward,
      maxCarryDays: preset.maxCarryDays,
      sandwichRule: preset.sandwichRule,
      code: preset.code,
      name: preset.name,
    });
    leaveTypeId = existing.id;
  } else {
    const created = await leaveRepo.createType(actor.companyId, {
      name: preset.name,
      code: preset.code,
      defaultDays: preset.defaultDays,
      requiresProof: preset.requiresProof,
      carryForward: preset.carryForward,
      maxCarryDays: preset.maxCarryDays,
      sandwichRule: preset.sandwichRule,
      isApplicable: true,
    });
    leaveTypeId = created.id;
  }

  // Backfill balances for current employees (Comp Off starts at 0 days).
  const year = new Date().getFullYear();
  const employees = await prisma.employee.findMany({
    where: {
      companyId: actor.companyId,
      employmentStatus: { in: ["ACTIVE", "ON_NOTICE"] },
    },
    select: { id: true },
  });
  const allocated = preset.scope === "employee" ? 0 : preset.defaultDays;
  for (const emp of employees) {
    const bal = await leaveRepo.getBalance(
      actor.companyId,
      emp.id,
      leaveTypeId,
      year
    );
    if (!bal) {
      await leaveRepo.upsertBalance({
        companyId: actor.companyId,
        employeeId: emp.id,
        leaveTypeId,
        year,
        allocated,
        used: 0,
      });
    }
  }

  await activityRepo.log(actor.companyId, "leave_type.catalog_added", actor.id, {
    leaveTypeId,
    code: preset.code,
    scope: preset.scope,
  });

  return { leaveTypeId, preset };
}

/** Soft-remove: hide from employees (keeps history). */
export async function disableLeaveType(
  actor: { id: string; companyId: string; role: UserRole },
  id: string
) {
  assertPermission(actor.role, "settings:manage");
  const existing = await leaveRepo.findType(actor.companyId, id);
  if (!existing) throw new NotFoundError("Leave type not found");
  if ((existing.code || "").toUpperCase() === "CL") {
    throw new ValidationError(
      "Casual Leave is required. You can edit days, but it cannot be removed."
    );
  }
  await leaveRepo.updateType(actor.companyId, id, { isApplicable: false });
  await activityRepo.log(actor.companyId, "leave_type.disabled", actor.id, {
    leaveTypeId: id,
  });
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
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new ValidationError("Invalid leave dates");
  }
  const today = startOfDayUTC();
  if (startDate < today) {
    throw new ValidationError("Leave cannot start before today");
  }
  if (endDate < startDate) throw new ValidationError("End date must be after start date");

  const type = (await leaveRepo.listTypes(actor.companyId)).find(
    (t) => t.id === input.leaveTypeId
  );
  if (!type) throw new NotFoundError("Leave type not found");
  if (!type.isApplicable) {
    throw new ValidationError("This leave type is not available for your company");
  }

  const holidays = await holidayRepo.list(actor.companyId);
  const policy = await getWorkPolicy(actor.companyId);
  const holidayHits: string[] = [];
  const weekOffHits: string[] = [];
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  for (
    let t = startDate.getTime();
    t <= endDate.getTime();
    t += 24 * 60 * 60 * 1000
  ) {
    const day = startOfDayUTC(new Date(t));
    const key = day.toISOString().slice(0, 10);
    if (isWeeklyOff(policy, day)) {
      weekOffHits.push(`${dayNames[day.getUTCDay()]} (${formatDate(day)})`);
      continue;
    }
    const hit = holidays.find(
      (h) => startOfDayUTC(h.date).toISOString().slice(0, 10) === key
    );
    if (hit) holidayHits.push(`${hit.name} (${formatDate(hit.date)})`);
  }
  if (weekOffHits.length > 0) {
    throw new ValidationError(
      `Cannot apply leave on weekly off: ${weekOffHits.slice(0, 3).join(", ")}`
    );
  }
  if (holidayHits.length > 0) {
    throw new ValidationError(
      `Cannot apply leave on holiday: ${holidayHits.slice(0, 3).join(", ")}`
    );
  }

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
    const { isEmployeeScopedLeave } = await import("@/lib/leave-catalog");
    balance = await leaveRepo.upsertBalance({
      companyId: actor.companyId,
      employeeId: employee.id,
      leaveTypeId: type.id,
      year,
      allocated: isEmployeeScopedLeave(type.code) ? 0 : type.defaultDays,
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
  const balances = await leaveRepo.listBalances(
    companyId,
    employee.id,
    new Date().getFullYear()
  );
  return balances.filter((b) => b.leaveType.isApplicable);
}
