import { attendanceRepo } from "@/repositories/attendance.repository";
import { employeeRepo } from "@/repositories/employee.repository";
import { activityRepo } from "@/repositories/activity.repository";
import { notifyAdmins } from "@/services/notification.service";
import {
  distanceMeters,
  getWorkPolicy,
  ipAllowed,
  isLatePunch,
  isWeeklyOff,
} from "@/services/policy.service";
import { assertPermission } from "@/lib/session";
import { hasAnyPermission, hasPermission, type Role } from "@/lib/permissions";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { formatTime, startOfDayUTC } from "@/lib/utils";
import type { UserRole } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

function employeeLabel(employee: { firstName: string; lastName: string; employeeCode: string }) {
  return `${employee.firstName} ${employee.lastName} (${employee.employeeCode})`;
}

function assertCanViewCompanyAttendance(role: UserRole) {
  if (
    !hasAnyPermission(role as Role, ["attendance:view_all", "attendance:view_team"])
  ) {
    throw new ForbiddenError("You do not have permission for this action");
  }
}

async function teamEmployeeIds(companyId: string, userId: string) {
  const me = await employeeRepo.findByUserId(companyId, userId);
  if (!me) return [] as string[];
  const reports = await prisma.employee.findMany({
    where: { companyId, managerId: me.id },
    select: { id: true },
  });
  return [me.id, ...reports.map((r) => r.id)];
}

export async function getMyTodayAttendance(
  companyId: string,
  userId: string,
  role: UserRole
) {
  assertPermission(role, "attendance:view_own");
  const employee = await employeeRepo.findByUserId(companyId, userId);
  if (!employee) throw new NotFoundError("Employee profile not found");
  const today = await attendanceRepo.findToday(companyId, employee.id);
  return { employee, today };
}

export async function checkIn(
  actor: { id: string; companyId: string; role: UserRole },
  opts?: { ip?: string; lat?: number; lng?: number }
) {
  if (actor.role === "COMPANY_ADMIN" || actor.role === "SUPER_ADMIN") {
    throw new ForbiddenError("Admins cannot check in. Use an employee or HR account to punch.");
  }
  assertPermission(actor.role, "attendance:mark");
  const employee = await employeeRepo.findByUserId(actor.companyId, actor.id);
  if (!employee) throw new NotFoundError("Employee profile not found");
  if (employee.employmentStatus !== "ACTIVE" && employee.employmentStatus !== "ON_NOTICE") {
    throw new ValidationError("Inactive employees cannot mark attendance");
  }

  const policy = await getWorkPolicy(actor.companyId);
  const now = new Date();
  const date = startOfDayUTC(now);

  if (isWeeklyOff(policy, date)) {
    throw new ValidationError("Today is a weekly off. Request an exception if you worked");
  }

  if (!ipAllowed(policy, opts?.ip)) {
    throw new ValidationError("Check-in blocked: IP not in office allowlist");
  }

  if (
    policy.geofenceRadiusM > 0 &&
    policy.officeLat != null &&
    policy.officeLng != null
  ) {
    if (opts?.lat == null || opts?.lng == null) {
      throw new ValidationError("Location required for check-in");
    }
    const dist = distanceMeters(policy.officeLat, policy.officeLng, opts.lat, opts.lng);
    if (dist > policy.geofenceRadiusM) {
      throw new ValidationError(
        `You are ~${Math.round(dist)}m from office (limit ${policy.geofenceRadiusM}m)`
      );
    }
  }

  const existing = await attendanceRepo.findToday(actor.companyId, employee.id, now);
  if (existing?.checkIn) throw new ValidationError("Already checked in today");

  const late = isLatePunch(policy, now);

  const record = await attendanceRepo.upsertCheckIn({
    companyId: actor.companyId,
    employeeId: employee.id,
    date,
    checkIn: now,
    status: late ? "LATE" : "PRESENT",
    isLate: late,
    checkInIp: opts?.ip,
    checkInLat: opts?.lat,
    checkInLng: opts?.lng,
  });

  await activityRepo.log(actor.companyId, "attendance.check_in", actor.id, {
    attendanceId: record.id,
  });

  await notifyAdmins(
    actor.companyId,
    "Employee checked in",
    `${employeeLabel(employee)} checked in at ${formatTime(now)}${late ? " (late)" : ""}.`,
    { channels: ["in_app", "push"], excludeUserId: actor.id }
  );

  return record;
}

export async function checkOut(
  actor: { id: string; companyId: string; role: UserRole },
  opts?: { lat?: number; lng?: number }
) {
  if (actor.role === "COMPANY_ADMIN" || actor.role === "SUPER_ADMIN") {
    throw new ForbiddenError("Admins cannot check out. Use an employee or HR account to punch.");
  }
  assertPermission(actor.role, "attendance:mark");
  const employee = await employeeRepo.findByUserId(actor.companyId, actor.id);
  if (!employee) throw new NotFoundError("Employee profile not found");

  const policy = await getWorkPolicy(actor.companyId);
  const now = new Date();
  const date = startOfDayUTC(now);
  const existing = await attendanceRepo.findToday(actor.companyId, employee.id, now);
  if (!existing?.checkIn) throw new ValidationError("Check in first");
  if (existing.checkOut) throw new ValidationError("Already checked out");

  const ms = now.getTime() - existing.checkIn.getTime();
  const workingHours = Math.round((ms / (1000 * 60 * 60)) * 100) / 100;
  const overtimeHours = Math.max(
    0,
    Math.round((workingHours - policy.standardHours) * 100) / 100
  );
  const isEarlyExit = workingHours < policy.standardHours;

  await attendanceRepo.checkOut(actor.companyId, employee.id, date, {
    checkOut: now,
    workingHours,
    overtimeHours,
    isEarlyExit,
  });

  await activityRepo.log(actor.companyId, "attendance.check_out", actor.id, {
    attendanceId: existing.id,
  });

  await notifyAdmins(
    actor.companyId,
    "Employee checked out",
    `${employeeLabel(employee)} checked out at ${formatTime(now)} · ${workingHours}h worked${
      overtimeHours > 0 ? ` · OT ${overtimeHours}h` : ""
    }.`,
    { channels: ["in_app", "push"], excludeUserId: actor.id }
  );

  return { workingHours, overtimeHours, isEarlyExit };
}

export async function listCompanyAttendance(
  companyId: string,
  role: UserRole,
  userId?: string
) {
  assertCanViewCompanyAttendance(role);
  const rows = await attendanceRepo.listForCompany(companyId);
  if (hasPermission(role as Role, "attendance:view_all") || !userId) return rows;
  const allowed = new Set(await teamEmployeeIds(companyId, userId));
  return rows.filter((r) => allowed.has(r.employeeId));
}

export async function listTodayAttendance(
  companyId: string,
  role: UserRole,
  userId?: string
) {
  assertCanViewCompanyAttendance(role);
  const rows = await attendanceRepo.listToday(companyId);
  if (hasPermission(role as Role, "attendance:view_all") || !userId) return rows;
  const allowed = new Set(await teamEmployeeIds(companyId, userId));
  return rows.filter((r) => allowed.has(r.employeeId));
}

export async function listMyAttendance(companyId: string, userId: string, role: UserRole) {
  assertPermission(role, "attendance:view_own");
  const employee = await employeeRepo.findByUserId(companyId, userId);
  if (!employee) throw new NotFoundError("Employee profile not found");
  return attendanceRepo.listForEmployee(companyId, employee.id);
}

export async function getEmployeeMonthTimesheet(
  companyId: string,
  role: UserRole,
  employeeId: string,
  year: number,
  month: number,
  userId?: string
) {
  assertCanViewCompanyAttendance(role);
  if (
    !hasPermission(role as Role, "attendance:view_all") &&
    userId
  ) {
    const allowed = await teamEmployeeIds(companyId, userId);
    if (!allowed.includes(employeeId)) {
      throw new ForbiddenError("You can only view your team's timesheets");
    }
  }
  if (month < 1 || month > 12 || year < 2000 || year > 2100) {
    throw new ValidationError("Invalid month");
  }

  const employee = await employeeRepo.findById(companyId, employeeId);
  if (!employee) throw new NotFoundError("Employee not found");

  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 0));
  const records = await attendanceRepo.listForEmployeeInRange(
    companyId,
    employeeId,
    from,
    to
  );

  const byKey = new Map(
    records.map((r) => [startOfDayUTC(r.date).toISOString().slice(0, 10), r])
  );

  const days: Array<{
    date: Date;
    weekday: string;
    checkIn: Date | null;
    checkOut: Date | null;
    workingHours: number | null;
    overtimeHours: number | null;
    status: string;
    isLate: boolean;
    isEarlyExit: boolean;
  }> = [];

  for (let d = 1; d <= to.getUTCDate(); d++) {
    const date = new Date(Date.UTC(year, month - 1, d));
    const key = date.toISOString().slice(0, 10);
    const rec = byKey.get(key);
    days.push({
      date,
      weekday: date.toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" }),
      checkIn: rec?.checkIn ?? null,
      checkOut: rec?.checkOut ?? null,
      workingHours: rec?.workingHours ?? null,
      overtimeHours: rec?.overtimeHours ?? null,
      status: rec?.status ?? "ABSENT",
      isLate: rec?.isLate ?? false,
      isEarlyExit: rec?.isEarlyExit ?? false,
    });
  }

  const worked = days.filter((d) => d.checkIn);
  const totalHours =
    Math.round(worked.reduce((s, d) => s + (d.workingHours ?? 0), 0) * 100) / 100;
  const totalOt =
    Math.round(worked.reduce((s, d) => s + (d.overtimeHours ?? 0), 0) * 100) / 100;

  return {
    employee,
    year,
    month,
    days,
    summary: {
      presentDays: worked.length,
      lateDays: worked.filter((d) => d.isLate).length,
      absentDays: days.length - worked.length,
      earlyExits: worked.filter((d) => d.isEarlyExit && d.checkOut).length,
      totalHours,
      totalOt,
    },
  };
}

/** Admin/manager adjusts a day's punches (also used when approving exceptions). */
export async function adminAdjustAttendance(
  actor: { id: string; companyId: string; role: UserRole },
  input: {
    employeeId: string;
    date: Date;
    checkIn: Date;
    checkOut?: Date | null;
  }
) {
  const canAll = hasPermission(actor.role as Role, "attendance:view_all");
  const canTeam = hasPermission(actor.role as Role, "attendance:view_team");
  if (!canAll && !canTeam) {
    throw new ForbiddenError("You do not have permission for this action");
  }
  if (!canAll) {
    const me = await employeeRepo.findByUserId(actor.companyId, actor.id);
    const target = await prisma.employee.findFirst({
      where: { id: input.employeeId, companyId: actor.companyId },
      select: { managerId: true },
    });
    if (!me || !target || target.managerId !== me.id) {
      throw new ForbiddenError("You can only adjust attendance for your team");
    }
  }

  const policy = await getWorkPolicy(actor.companyId);
  const date = startOfDayUTC(input.date);
  const late = isLatePunch(policy, input.checkIn);
  await attendanceRepo.upsertCheckIn({
    companyId: actor.companyId,
    employeeId: input.employeeId,
    date,
    checkIn: input.checkIn,
    status: late ? "LATE" : "PRESENT",
    isLate: late,
  });
  if (input.checkOut) {
    const ms = input.checkOut.getTime() - input.checkIn.getTime();
    const workingHours = Math.round((ms / (1000 * 60 * 60)) * 100) / 100;
    const overtimeHours = Math.max(
      0,
      Math.round((workingHours - policy.standardHours) * 100) / 100
    );
    await attendanceRepo.checkOut(actor.companyId, input.employeeId, date, {
      checkOut: input.checkOut,
      workingHours,
      overtimeHours,
      isEarlyExit: workingHours < policy.standardHours,
    });
  }
  await activityRepo.log(actor.companyId, "attendance.adjusted", actor.id, {
    employeeId: input.employeeId,
    date: date.toISOString(),
  });
}
