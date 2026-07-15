import { prisma } from "@/lib/prisma";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";

function platformEmails(): Set<string> {
  const raw = process.env.PLATFORM_ADMIN_EMAILS || "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isPlatformAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  return platformEmails().has(email.trim().toLowerCase());
}

export function assertPlatformAdmin(email: string) {
  if (!isPlatformAdminEmail(email)) {
    throw new ForbiddenError("Platform admin access required");
  }
}

export async function listTenantsForPlatform(actorEmail: string) {
  assertPlatformAdmin(actorEmail);
  const companies = await prisma.company.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          employees: true,
          users: true,
          salarySlips: true,
        },
      },
    },
  });

  return companies.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    isActive: c.isActive,
    setupComplete: c.setupComplete,
    customDomain: c.customDomain,
    plan: c.plan,
    seatLimit: c.seatLimit,
    trialEndsAt: c.trialEndsAt,
    billingStatus: c.billingStatus,
    primaryColor: c.primaryColor,
    hasLogo: Boolean(c.logoUrl || c.logoData),
    employeeCount: c._count.employees,
    userCount: c._count.users,
    slipCount: c._count.salarySlips,
    createdAt: c.createdAt,
  }));
}

export async function setTenantActive(
  actorEmail: string,
  companyId: string,
  isActive: boolean
) {
  assertPlatformAdmin(actorEmail);
  const updated = await prisma.company.updateMany({
    where: { id: companyId },
    data: { isActive },
  });
  if (updated.count === 0) throw new NotFoundError("Company not found");
  return { success: true, isActive };
}

export async function updateTenantBilling(
  actorEmail: string,
  companyId: string,
  input: {
    plan?: string;
    seatLimit?: number;
    trialEndsAt?: Date | null;
    billingStatus?: string;
  }
) {
  assertPlatformAdmin(actorEmail);
  if (input.plan && !["TRIAL", "STARTER", "GROWTH"].includes(input.plan)) {
    throw new ValidationError("Invalid plan");
  }
  if (
    input.billingStatus &&
    !["OK", "PAST_DUE", "SUSPENDED"].includes(input.billingStatus)
  ) {
    throw new ValidationError("Invalid billing status");
  }
  if (input.seatLimit != null && (!Number.isFinite(input.seatLimit) || input.seatLimit < 1)) {
    throw new ValidationError("Seat limit must be at least 1");
  }

  const updated = await prisma.company.updateMany({
    where: { id: companyId },
    data: {
      ...(input.plan ? { plan: input.plan } : {}),
      ...(input.seatLimit != null ? { seatLimit: Math.floor(input.seatLimit) } : {}),
      ...(input.trialEndsAt !== undefined ? { trialEndsAt: input.trialEndsAt } : {}),
      ...(input.billingStatus ? { billingStatus: input.billingStatus } : {}),
      ...(input.billingStatus === "SUSPENDED" ? { isActive: false } : {}),
      ...(input.billingStatus === "OK" ? { isActive: true } : {}),
    },
  });
  if (updated.count === 0) throw new NotFoundError("Company not found");
  return { success: true };
}

/** Seat check for employee invites — uses active-ish headcount vs seatLimit. */
export async function assertSeatAvailable(companyId: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { seatLimit: true, billingStatus: true, isActive: true, plan: true, trialEndsAt: true },
  });
  if (!company) throw new NotFoundError("Company not found");
  if (!company.isActive || company.billingStatus === "SUSPENDED") {
    throw new ValidationError("This company account is suspended");
  }
  if (
    company.plan === "TRIAL" &&
    company.trialEndsAt &&
    company.trialEndsAt.getTime() < Date.now() &&
    company.billingStatus !== "OK"
  ) {
    // soft: still allow if status OK after trial marked paid; block only when past-due
  }
  if (company.billingStatus === "PAST_DUE") {
    throw new ValidationError("Billing is past due — contact support before adding seats");
  }

  const occupied = await prisma.employee.count({
    where: {
      companyId,
      employmentStatus: { in: ["ACTIVE", "ON_NOTICE"] },
    },
  });
  if (occupied >= company.seatLimit) {
    throw new ValidationError(
      `Seat limit reached (${company.seatLimit}). Upgrade the plan to add more employees.`
    );
  }
}
