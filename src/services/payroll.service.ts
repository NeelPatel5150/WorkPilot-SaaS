import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/session";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { startOfDayUTC } from "@/lib/utils";
import { notifyUser } from "@/services/notification.service";
import { getWorkPolicy, isWeeklyOff } from "@/services/policy.service";
import type { UserRole } from "@/generated/prisma";

function monthBounds(year: number, month: number) {
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 0));
  return { from, to, calendarDays: to.getUTCDate() };
}

async function assertMonthUnlocked(companyId: string, year: number, month: number) {
  const lock = await prisma.payrollMonthLock.findUnique({
    where: { companyId_year_month: { companyId, year, month } },
  });
  if (lock) throw new ValidationError("This payroll month is locked");
}

export async function listSalarySlipsForCompany(
  companyId: string,
  role: UserRole,
  year: number,
  month: number
) {
  assertPermission(role, "payroll:view");
  return prisma.salarySlip.findMany({
    where: { companyId, year, month },
    include: { employee: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function isMonthLocked(companyId: string, year: number, month: number) {
  const lock = await prisma.payrollMonthLock.findUnique({
    where: { companyId_year_month: { companyId, year, month } },
  });
  return !!lock;
}

export async function listMySalarySlips(
  companyId: string,
  userId: string,
  role: UserRole
) {
  assertPermission(role, "payroll:view");
  const employee = await prisma.employee.findFirst({
    where: { companyId, userId },
  });
  if (!employee) throw new NotFoundError("Employee profile not found");
  return prisma.salarySlip.findMany({
    where: {
      companyId,
      employeeId: employee.id,
      status: { in: ["PUBLISHED", "LOCKED"] },
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
}

export async function getMySalarySlip(
  companyId: string,
  userId: string,
  role: UserRole,
  id: string
) {
  assertPermission(role, "payroll:view");
  const employee = await prisma.employee.findFirst({
    where: { companyId, userId },
  });
  if (!employee) throw new NotFoundError("Employee profile not found");
  const slip = await prisma.salarySlip.findFirst({
    where: {
      id,
      companyId,
      employeeId: employee.id,
      status: { in: ["PUBLISHED", "LOCKED"] },
    },
    include: { employee: true, company: true },
  });
  if (!slip) throw new NotFoundError("Salary slip not found");
  return slip;
}

export async function getAdminSalarySlip(
  companyId: string,
  role: UserRole,
  id: string
) {
  assertPermission(role, "payroll:view");
  const slip = await prisma.salarySlip.findFirst({
    where: { id, companyId },
    include: { employee: true, company: true },
  });
  if (!slip) throw new NotFoundError("Salary slip not found");
  return slip;
}

export type PayrollPreview = {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  basicSalary: number | null;
  year: number;
  month: number;
  calendarDays: number;
  workingDays: number;
  presentDays: number;
  lateDays: number;
  halfDays: number;
  leaveDays: number;
  holidayDays: number;
  weeklyOffDays: number;
  lopDays: number;
  overtimeHours: number;
  totalHours: number;
  earlyExits: number;
};

export async function getEmployeePayrollPreview(
  companyId: string,
  role: UserRole,
  employeeId: string,
  year: number,
  month: number
): Promise<PayrollPreview> {
  assertPermission(role, "payroll:view");
  if (month < 1 || month > 12) throw new ValidationError("Invalid month");

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, companyId },
  });
  if (!employee) throw new NotFoundError("Employee not found");

  const { from, to, calendarDays } = monthBounds(year, month);
  const policy = await getWorkPolicy(companyId);

  const [attendance, leaves, holidays] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        companyId,
        employeeId,
        date: { gte: startOfDayUTC(from), lte: startOfDayUTC(to) },
      },
    }),
    prisma.leaveRequest.findMany({
      where: {
        companyId,
        employeeId,
        status: "APPROVED",
        startDate: { lte: startOfDayUTC(to) },
        endDate: { gte: startOfDayUTC(from) },
      },
    }),
    prisma.holiday.findMany({
      where: {
        companyId,
        date: { gte: startOfDayUTC(from), lte: startOfDayUTC(to) },
      },
    }),
  ]);

  let presentDays = 0;
  let lateDays = 0;
  let halfDays = 0;
  let overtimeHours = 0;
  let totalHours = 0;
  let earlyExits = 0;
  let weeklyOffDays = 0;
  let workingDays = 0;

  for (let d = 1; d <= calendarDays; d++) {
    const date = new Date(Date.UTC(year, month - 1, d));
    if (isWeeklyOff(policy, date)) {
      weeklyOffDays += 1;
      continue;
    }
    workingDays += 1;
  }

  for (const row of attendance) {
    if (row.status === "HALF_DAY") halfDays += 1;
    else if (row.status === "LATE" || row.isLate) {
      lateDays += 1;
      presentDays += 1;
    } else if (row.status === "PRESENT" || row.checkIn) {
      presentDays += 1;
    }
    overtimeHours += row.overtimeHours ?? 0;
    totalHours += row.workingHours ?? 0;
    if (row.isEarlyExit) earlyExits += 1;
  }

  const paidPresent = presentDays + halfDays * 0.5;
  let leaveDays = 0;
  for (const leave of leaves) {
    const s = Math.max(startOfDayUTC(leave.startDate).getTime(), from.getTime());
    const e = Math.min(startOfDayUTC(leave.endDate).getTime(), to.getTime());
    if (e >= s) leaveDays += Math.floor((e - s) / (1000 * 60 * 60 * 24)) + 1;
  }
  const holidayDays = holidays.length;
  const lopDays = Math.max(
    0,
    Math.round((workingDays - paidPresent - leaveDays - holidayDays) * 100) / 100
  );

  return {
    employeeId: employee.id,
    employeeName: `${employee.firstName} ${employee.lastName}`,
    employeeCode: employee.employeeCode,
    basicSalary: employee.basicSalary,
    year,
    month,
    calendarDays,
    workingDays,
    presentDays: paidPresent,
    lateDays,
    halfDays,
    leaveDays,
    holidayDays,
    weeklyOffDays,
    lopDays,
    overtimeHours: Math.round(overtimeHours * 100) / 100,
    totalHours: Math.round(totalHours * 100) / 100,
    earlyExits,
  };
}

export async function generateMonthPayroll(
  actor: { id: string; companyId: string; role: UserRole },
  input: {
    year: number;
    month: number;
    defaultBasic?: number;
    allowances?: number;
    deductions?: number;
    pfPercent?: number;
    esiPercent?: number;
    tds?: number;
    employeeId?: string | null;
    publish?: boolean;
  }
) {
  assertPermission(actor.role, "payroll:manage");
  const { year, month } = input;
  if (month < 1 || month > 12) throw new ValidationError("Invalid month");
  await assertMonthUnlocked(actor.companyId, year, month);

  const employees = await prisma.employee.findMany({
    where: {
      companyId: actor.companyId,
      employmentStatus: { in: ["ACTIVE", "ON_NOTICE"] },
      ...(input.employeeId ? { id: input.employeeId } : {}),
    },
    include: { user: true },
  });
  if (input.employeeId && employees.length === 0) {
    throw new NotFoundError("Employee not found");
  }

  const defaultBasic = input.defaultBasic ?? 0;
  const allowances = input.allowances ?? 0;
  const extraDed = input.deductions ?? 0;
  const pfPercent = input.pfPercent ?? 12;
  const esiPercent = input.esiPercent ?? 0.75;
  const tds = input.tds ?? 0;
  const status = input.publish ? "PUBLISHED" : "DRAFT";
  const created: string[] = [];

  for (const emp of employees) {
    const preview = await getEmployeePayrollPreview(
      actor.companyId,
      actor.role,
      emp.id,
      year,
      month
    );
    const basic = emp.basicSalary && emp.basicSalary > 0 ? emp.basicSalary : defaultBasic;
    if (basic <= 0) continue;

    const dayRate = basic / Math.max(preview.workingDays, 1);
    // India SME: monthly basic, deduct LOP days (don't also pro-rate on present only)
    const lopDeduction = Math.round(dayRate * preview.lopDays * 100) / 100;
    const otPay =
      Math.round(preview.overtimeHours * (dayRate / 8) * 1.5 * 100) / 100;
    const taxableBase = Math.max(0, basic - lopDeduction);
    const pf = Math.round(((taxableBase * pfPercent) / 100) * 100) / 100;
    const esi = Math.round(((taxableBase * esiPercent) / 100) * 100) / 100;
    const net =
      Math.round(
        (basic + allowances + otPay - lopDeduction - extraDed - pf - esi - tds) * 100
      ) / 100;

    const slip = await prisma.salarySlip.upsert({
      where: { employeeId_year_month: { employeeId: emp.id, year, month } },
      create: {
        companyId: actor.companyId,
        employeeId: emp.id,
        year,
        month,
        basic,
        allowances,
        deductions: extraDed + lopDeduction,
        lopDays: preview.lopDays,
        pf,
        esi,
        tds,
        netPay: Math.max(0, net),
        presentDays: preview.presentDays,
        workingDays: preview.workingDays,
        overtimeHours: preview.overtimeHours,
        status,
      },
      update: {
        basic,
        allowances,
        deductions: extraDed + lopDeduction,
        lopDays: preview.lopDays,
        pf,
        esi,
        tds,
        netPay: Math.max(0, net),
        presentDays: preview.presentDays,
        workingDays: preview.workingDays,
        overtimeHours: preview.overtimeHours,
        status,
      },
    });
    created.push(slip.id);

    if (status === "PUBLISHED" && emp.userId) {
      await notifyUser({
        companyId: actor.companyId,
        userId: emp.userId,
        title: "Salary slip ready",
        message: `Your salary slip for ${month}/${year} is available.`,
        channels: ["in_app", "email", "push"],
      });
    }
  }

  return { count: created.length, year, month, status };
}

export async function updateSalarySlip(
  actor: { id: string; companyId: string; role: UserRole },
  id: string,
  patch: {
    basic?: number;
    allowances?: number;
    deductions?: number;
    pf?: number;
    esi?: number;
    tds?: number;
    lopDays?: number;
    notes?: string;
  }
) {
  assertPermission(actor.role, "payroll:manage");
  const slip = await prisma.salarySlip.findFirst({
    where: { id, companyId: actor.companyId },
  });
  if (!slip) throw new NotFoundError("Slip not found");
  await assertMonthUnlocked(actor.companyId, slip.year, slip.month);
  if (slip.status === "LOCKED") throw new ValidationError("Slip is locked");

  const basic = patch.basic ?? slip.basic;
  const allowances = patch.allowances ?? slip.allowances;
  const deductions = patch.deductions ?? slip.deductions;
  const pf = patch.pf ?? slip.pf;
  const esi = patch.esi ?? slip.esi;
  const tds = patch.tds ?? slip.tds;
  const lopDays = patch.lopDays ?? slip.lopDays;
  const dayRate = basic / Math.max(slip.workingDays, 1);
  const lopDeduction = dayRate * lopDays;
  // If deductions already include LOP from generate, prefer explicit pf/esi/tds edit path:
  // net = basic + allowances + ot - lop - otherDeductions - pf - esi - tds
  // `deductions` field stores "other + lop" from generate; when editing lopDays, rebuild other portion.
  const otherDed =
    patch.deductions != null
      ? patch.deductions
      : Math.max(0, slip.deductions - dayRate * slip.lopDays);
  const otPay = slip.overtimeHours * (dayRate / 8) * 1.5;
  const net =
    Math.round(
      (basic + allowances + otPay - lopDeduction - otherDed - pf - esi - tds) * 100
    ) / 100;

  return prisma.salarySlip.update({
    where: { id },
    data: {
      basic,
      allowances,
      deductions: otherDed + lopDeduction,
      pf,
      esi,
      tds,
      lopDays,
      notes: patch.notes ?? slip.notes,
      netPay: Math.max(0, net),
      status: "DRAFT",
    },
  });
}

export async function publishSalarySlip(
  actor: { id: string; companyId: string; role: UserRole },
  id: string
) {
  assertPermission(actor.role, "payroll:manage");
  const slip = await prisma.salarySlip.findFirst({
    where: { id, companyId: actor.companyId },
    include: { employee: true },
  });
  if (!slip) throw new NotFoundError("Slip not found");
  await assertMonthUnlocked(actor.companyId, slip.year, slip.month);

  await prisma.salarySlip.update({
    where: { id },
    data: { status: "PUBLISHED" },
  });

  if (slip.employee.userId) {
    await notifyUser({
      companyId: actor.companyId,
      userId: slip.employee.userId,
      title: "Salary slip published",
      message: `Your ${slip.month}/${slip.year} payslip is ready.`,
      channels: ["in_app", "email", "push"],
    });
  }
}

export async function lockPayrollMonth(
  actor: { id: string; companyId: string; role: UserRole },
  year: number,
  month: number
) {
  assertPermission(actor.role, "payroll:manage");
  await prisma.payrollMonthLock.upsert({
    where: { companyId_year_month: { companyId: actor.companyId, year, month } },
    create: {
      companyId: actor.companyId,
      year,
      month,
      lockedById: actor.id,
    },
    update: { lockedAt: new Date(), lockedById: actor.id },
  });
  await prisma.salarySlip.updateMany({
    where: { companyId: actor.companyId, year, month },
    data: { status: "LOCKED" },
  });
}
