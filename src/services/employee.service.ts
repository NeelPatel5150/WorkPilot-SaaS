import { hashPassword, verifyPassword } from "better-auth/crypto";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { employeeRepo } from "@/repositories/employee.repository";
import { leaveRepo } from "@/repositories/leave.repository";
import { activityRepo } from "@/repositories/activity.repository";
import { assertPermission } from "@/lib/session";
import { hasAnyPermission, type Role } from "@/lib/permissions";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { sendEmployeeInviteEmail } from "@/lib/invite-email";
import { isEmployeeScopedLeave } from "@/lib/leave-catalog";
import type { UserRole } from "@/generated/prisma";

export async function listEmployees(companyId: string, role: UserRole) {
  // Attendance / payroll / leave admin screens also need a roster picker
  if (
    !hasAnyPermission(role as Role, [
      "employees:view",
      "attendance:view_all",
      "attendance:view_team",
      "payroll:manage",
      "leave:approve_all",
      "leave:approve_team",
    ])
  ) {
    throw new ForbiddenError("You do not have permission for this action");
  }
  return employeeRepo.list(companyId);
}

/** Lightweight roster for leave cover picker (any authenticated company user). */
export async function listCoverCandidates(companyId: string, excludeUserId?: string) {
  const rows = await prisma.employee.findMany({
    where: {
      companyId,
      employmentStatus: "ACTIVE",
      user: { isActive: true },
      ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      employeeCode: true,
    },
    orderBy: { firstName: "asc" },
  });
  return rows.map((e) => ({
    id: e.id,
    label: `${e.firstName} ${e.lastName} · ${e.employeeCode}`,
  }));
}

export async function nextEmployeeCode(companyId: string) {
  const employees = await prisma.employee.findMany({
    where: { companyId },
    select: { employeeCode: true },
  });

  let max = 0;
  for (const e of employees) {
    const match = e.employeeCode.match(/(\d+)$/);
    if (match) max = Math.max(max, Number.parseInt(match[1], 10));
  }
  return `EMP${String(max + 1).padStart(3, "0")}`;
}

export function generateTempPassword(length = 10) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

export async function createEmployee(
  actor: { id: string; companyId: string; role: UserRole },
  input: {
    email: string;
    firstName: string;
    lastName: string;
    designation?: string;
    departmentId?: string;
    role?: UserRole;
    phone?: string;
  }
) {
  assertPermission(actor.role, "employees:manage");
  const { assertSeatAvailable } = await import("@/services/platform.service");
  await assertSeatAvailable(actor.companyId);

  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new ValidationError("Email already in use");

  const company = await prisma.company.findUnique({ where: { id: actor.companyId } });
  if (!company) throw new NotFoundError("Company not found");

  const employeeCode = await nextEmployeeCode(actor.companyId);
  const tempPassword = generateTempPassword();
  const role = input.role ?? "EMPLOYEE";
  const password = await hashPassword(tempPassword);

  const user = await prisma.user.create({
    data: {
      name: `${input.firstName} ${input.lastName}`,
      email: input.email,
      emailVerified: true,
      companyId: actor.companyId,
      role,
      mustChangePassword: true,
      accounts: {
        create: {
          accountId: input.email,
          providerId: "credential",
          password,
        },
      },
    },
  });

  const employee = await employeeRepo.create({
    companyId: actor.companyId,
    userId: user.id,
    employeeCode,
    firstName: input.firstName,
    lastName: input.lastName,
    designation: input.designation,
    departmentId: input.departmentId || null,
    phone: input.phone,
    joiningDate: new Date(),
  });

  const year = new Date().getFullYear();
  const types = await leaveRepo.listTypes(actor.companyId, { applicableOnly: true });
  const { isEmployeeScopedLeave } = await import("@/lib/leave-catalog");
  for (const type of types) {
    await leaveRepo.upsertBalance({
      companyId: actor.companyId,
      employeeId: employee.id,
      leaveTypeId: type.id,
      year,
      allocated: isEmployeeScopedLeave(type.code) ? 0 : type.defaultDays,
      used: 0,
    });
  }

  const { createInviteToken } = await import("@/lib/invite-token");
  const { getTenantAcceptUrl } = await import("@/lib/tenant-url");
  const inviteToken = await createInviteToken(input.email);
  const acceptUrl = getTenantAcceptUrl(company, input.email, inviteToken);

  await sendEmployeeInviteEmail({
    companyId: actor.companyId,
    company: {
      id: company.id,
      name: company.name,
      primaryColor: company.primaryColor,
      secondaryColor: company.secondaryColor,
      logoUrl: company.logoUrl,
      slug: company.slug,
      customDomain: company.customDomain,
    },
    employeeName: `${input.firstName} ${input.lastName}`,
    employeeCode,
    email: input.email,
    tempPassword,
    inviteToken,
  });

  await activityRepo.log(actor.companyId, "employee.created", actor.id, {
    employeeId: employee.id,
  });

  return {
    employee,
    employeeCode,
    tempPassword,
    email: input.email,
    inviteSent: true,
    acceptUrl,
  };
}

export async function getInviteContext(email: string, token?: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: {
      company: true,
      employee: true,
    },
  });
  if (!user?.company || !user.mustChangePassword) return null;

  let tokenValid = false;
  if (token) {
    const { verifyInviteToken } = await import("@/lib/invite-token");
    tokenValid = await verifyInviteToken(email, token);
  }

  return {
    email: user.email,
    name: user.name,
    employeeCode: user.employee?.employeeCode ?? null,
    tokenValid,
    company: {
      name: user.company.name,
      primaryColor: user.company.primaryColor,
      secondaryColor: user.company.secondaryColor,
      logoUrl: user.company.logoUrl,
    },
  };
}

export async function acceptEmployeeInvite(input: {
  email: string;
  tempPassword?: string;
  inviteToken?: string;
  newPassword: string;
}) {
  const email = input.email.toLowerCase().trim();
  if (input.newPassword.length < 8) {
    throw new ValidationError("New password must be at least 8 characters");
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      accounts: { where: { providerId: "credential" } },
    },
  });
  if (!user || !user.mustChangePassword) {
    throw new ValidationError("Invite not found or already accepted");
  }

  const account = user.accounts[0];
  if (!account?.password) throw new ValidationError("Account is not ready");

  const { verifyInviteToken, consumeInviteToken } = await import("@/lib/invite-token");
  const tokenOk = input.inviteToken
    ? await verifyInviteToken(email, input.inviteToken)
    : false;

  if (tokenOk) {
    // Secure invite link: no default password required
  } else if (input.tempPassword) {
    if (input.newPassword === input.tempPassword) {
      throw new ValidationError("Choose a new password different from the default");
    }
    const ok = await verifyPassword({
      hash: account.password,
      password: input.tempPassword,
    });
    if (!ok) throw new ValidationError("Default password is incorrect");
  } else {
    throw new ValidationError("Invalid or expired invite link. Use the email button or default password.");
  }

  const hashed = await hashPassword(input.newPassword);
  await prisma.$transaction([
    prisma.account.update({
      where: { id: account.id },
      data: { password: hashed },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { mustChangePassword: false },
    }),
  ]);

  await consumeInviteToken(email);

  if (user.companyId) {
    await activityRepo.log(user.companyId, "employee.invite_accepted", user.id, {
      userId: user.id,
    });
  }

  return { email: user.email };
}

export async function getEmployeeOrThrow(companyId: string, id: string) {
  const employee = await employeeRepo.findById(companyId, id);
  if (!employee) throw new NotFoundError("Employee not found");
  return employee;
}

export async function listEmployeesFiltered(
  companyId: string,
  role: UserRole,
  filters: {
    q?: string;
    departmentId?: string;
    status?: "ACTIVE" | "ON_NOTICE" | "RESIGNED" | "TERMINATED" | "ALL";
  }
) {
  if (
    !hasAnyPermission(role as Role, [
      "employees:view",
      "employees:manage",
      "attendance:view_all",
      "attendance:view_team",
      "payroll:manage",
      "leave:approve_all",
      "leave:approve_team",
    ])
  ) {
    throw new ForbiddenError("You do not have permission for this action");
  }
  return employeeRepo.listFiltered(companyId, filters);
}

export async function updateEmployeeProfile(
  actor: { id: string; companyId: string; role: UserRole },
  employeeId: string,
  input: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    emergencyContact?: string;
    designation?: string;
    departmentId?: string | null;
    role?: UserRole;
    joiningDate?: string;
  }
) {
  assertPermission(actor.role, "employees:manage");
  const employee = await getEmployeeOrThrow(actor.companyId, employeeId);

  const email = input.email.toLowerCase().trim();
  if (!email) throw new ValidationError("Email is required");

  if (email !== employee.user.email) {
    const taken = await prisma.user.findUnique({ where: { email } });
    if (taken && taken.id !== employee.userId) {
      throw new ValidationError("Email already in use");
    }
  }

  if (
    (employee.user.role === "COMPANY_ADMIN" || employee.user.role === "SUPER_ADMIN") &&
    input.role &&
    input.role !== employee.user.role
  ) {
    throw new ValidationError("Cannot change admin account role here");
  }

  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (!firstName || !lastName) throw new ValidationError("Name is required");

  await employeeRepo.update(actor.companyId, employeeId, {
    firstName,
    lastName,
    phone: input.phone?.trim() || null,
    emergencyContact: input.emergencyContact?.trim() || null,
    designation: input.designation?.trim() || null,
    departmentId: input.departmentId || null,
    ...(input.joiningDate
      ? { joiningDate: new Date(`${input.joiningDate}T00:00:00.000Z`) }
      : {}),
  });

  const name = `${firstName} ${lastName}`;
  await prisma.user.update({
    where: { id: employee.userId },
    data: {
      name,
      email,
      ...(input.role &&
      employee.user.role !== "COMPANY_ADMIN" &&
      employee.user.role !== "SUPER_ADMIN"
        ? { role: input.role }
        : {}),
    },
  });

  await activityRepo.log(actor.companyId, "employee.updated", actor.id, {
    employeeId,
  });

  return getEmployeeOrThrow(actor.companyId, employeeId);
}

export async function adjustEmployeeSalary(
  actor: { id: string; companyId: string; role: UserRole },
  employeeId: string,
  input: {
    mode: "set" | "increment" | "decrement";
    amount: number;
  }
) {
  assertPermission(actor.role, "employees:manage");
  if (!Number.isFinite(input.amount) || input.amount < 0) {
    throw new ValidationError("Enter a valid amount");
  }

  const employee = await getEmployeeOrThrow(actor.companyId, employeeId);
  const current = employee.basicSalary ?? 0;
  let next = current;
  if (input.mode === "set") next = input.amount;
  else if (input.mode === "increment") next = current + input.amount;
  else next = Math.max(0, current - input.amount);

  if (Math.abs(next - current) < 0.0001) {
    return { previous: current, next };
  }

  await prisma.$transaction([
    prisma.salaryRevision.create({
      data: {
        companyId: actor.companyId,
        employeeId,
        previousBasic: current,
        newBasic: next,
        effectiveFrom: new Date(),
        note: input.mode === "set" ? "Set" : input.mode === "increment" ? "Increment" : "Decrement",
        changedByUserId: actor.id,
      },
    }),
    prisma.employee.updateMany({
      where: { id: employeeId, companyId: actor.companyId },
      data: { basicSalary: next },
    }),
  ]);

  await activityRepo.log(actor.companyId, "employee.salary_updated", actor.id, {
    employeeId,
    mode: input.mode,
    amount: input.amount,
    previous: current,
    next,
  });

  return { previous: current, next };
}

export async function listSalaryRevisions(
  companyId: string,
  role: UserRole,
  employeeId: string
) {
  assertPermission(role, "employees:view");
  await getEmployeeOrThrow(companyId, employeeId);
  return prisma.salaryRevision.findMany({
    where: { companyId, employeeId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function updateEmployeeBankDetails(
  actor: { id: string; companyId: string; role: UserRole },
  employeeId: string,
  input: {
    bankAccountName?: string | null;
    bankName?: string | null;
    bankAccountNumber?: string | null;
    bankIfsc?: string | null;
    panNumber?: string | null;
    uanNumber?: string | null;
    pfEligible?: boolean;
    esiEligible?: boolean;
  }
) {
  assertPermission(actor.role, "employees:manage");
  await getEmployeeOrThrow(actor.companyId, employeeId);

  const normalize = (v: string | null | undefined) => {
    if (v == null) return null;
    const t = v.trim();
    return t || null;
  };

  await employeeRepo.update(actor.companyId, employeeId, {
    bankAccountName: normalize(input.bankAccountName),
    bankName: normalize(input.bankName),
    bankAccountNumber: normalize(input.bankAccountNumber),
    bankIfsc: normalize(input.bankIfsc)?.toUpperCase() ?? null,
    panNumber: normalize(input.panNumber)?.toUpperCase() ?? null,
    uanNumber: normalize(input.uanNumber),
    ...(typeof input.pfEligible === "boolean" ? { pfEligible: input.pfEligible } : {}),
    ...(typeof input.esiEligible === "boolean" ? { esiEligible: input.esiEligible } : {}),
  });

  await activityRepo.log(actor.companyId, "employee.bank_updated", actor.id, {
    employeeId,
  });

  return getEmployeeOrThrow(actor.companyId, employeeId);
}

export async function updateOwnBankDetails(
  actor: { id: string; companyId: string; role: UserRole },
  input: {
    bankAccountName?: string | null;
    bankName?: string | null;
    bankAccountNumber?: string | null;
    bankIfsc?: string | null;
    panNumber?: string | null;
    uanNumber?: string | null;
  }
) {
  const employee = await employeeRepo.findByUserId(actor.companyId, actor.id);
  if (!employee) throw new NotFoundError("Employee profile not found");

  const normalize = (v: string | null | undefined) => {
    if (v == null) return null;
    const t = v.trim();
    return t || null;
  };

  await employeeRepo.update(actor.companyId, employee.id, {
    bankAccountName: normalize(input.bankAccountName),
    bankName: normalize(input.bankName),
    bankAccountNumber: normalize(input.bankAccountNumber),
    bankIfsc: normalize(input.bankIfsc)?.toUpperCase() ?? null,
    panNumber: normalize(input.panNumber)?.toUpperCase() ?? null,
    uanNumber: normalize(input.uanNumber),
  });

  await activityRepo.log(actor.companyId, "employee.bank_self_updated", actor.id, {
    employeeId: employee.id,
  });

  return getEmployeeOrThrow(actor.companyId, employee.id);
}

export async function updateEmployeeLeaveBalance(
  actor: { id: string; companyId: string; role: UserRole },
  employeeId: string,
  input: {
    leaveTypeId: string;
    year: number;
    allocated: number;
  }
) {
  assertPermission(actor.role, "employees:manage");
  await getEmployeeOrThrow(actor.companyId, employeeId);

  const type = await leaveRepo.findType(actor.companyId, input.leaveTypeId);
  if (!type || !type.isApplicable) throw new NotFoundError("Leave type not found");

  if (!Number.isFinite(input.allocated) || input.allocated < 0) {
    throw new ValidationError("Allocated days cannot be negative");
  }

  const existing = await leaveRepo.getBalance(
    actor.companyId,
    employeeId,
    input.leaveTypeId,
    input.year
  );
  const used = existing?.used ?? 0;
  if (input.allocated < used) {
    throw new ValidationError(
      `Allocated days cannot be less than used (${used}). Used is set by approved leaves.`
    );
  }

  await leaveRepo.upsertBalance({
    companyId: actor.companyId,
    employeeId,
    leaveTypeId: input.leaveTypeId,
    year: input.year,
    allocated: input.allocated,
  });

  await activityRepo.log(actor.companyId, "employee.leave_balance_updated", actor.id, {
    employeeId,
    leaveTypeId: input.leaveTypeId,
    year: input.year,
    allocated: input.allocated,
  });

  return leaveRepo.listBalances(actor.companyId, employeeId, input.year);
}

export async function listEmployeeLeaveBalances(
  companyId: string,
  role: UserRole,
  employeeId: string,
  year?: number
) {
  if (
    !hasAnyPermission(role as Role, [
      "employees:view",
      "employees:manage",
      "leave:approve_all",
      "leave:approve_team",
    ])
  ) {
    throw new ForbiddenError("You do not have permission for this action");
  }
  await getEmployeeOrThrow(companyId, employeeId);
  const y = year ?? new Date().getFullYear();
  const [types, balances] = await Promise.all([
    leaveRepo.listTypes(companyId, { applicableOnly: true }),
    leaveRepo.listBalances(companyId, employeeId, y),
  ]);
  const byType = new Map(balances.map((b) => [b.leaveTypeId, b]));

  return types.map((type) => {
    const row = byType.get(type.id);
    const allocated = row?.allocated ?? (isEmployeeScopedLeave(type.code) ? 0 : type.defaultDays);
    const used = row?.used ?? 0;
    return {
      id: row?.id ?? `new-${type.id}`,
      leaveTypeId: type.id,
      allocated,
      used,
      remaining: Math.max(0, allocated - used),
      leaveType: { name: type.name, code: type.code },
      hasRecord: Boolean(row),
    };
  });
}

