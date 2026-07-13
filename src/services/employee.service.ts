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
  for (const type of types) {
    await leaveRepo.upsertBalance({
      companyId: actor.companyId,
      employeeId: employee.id,
      leaveTypeId: type.id,
      year,
      allocated: type.defaultDays,
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
