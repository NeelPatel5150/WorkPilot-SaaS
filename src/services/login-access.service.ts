import { prisma } from "@/lib/prisma";
import type { EmploymentStatus } from "@/generated/prisma";

export type LoginBlockReason =
  | "RESIGNED"
  | "TERMINATED"
  | "ON_NOTICE"
  | "INACTIVE";

export type LoginAccessResult =
  | { allowed: true }
  | {
      allowed: false;
      reason: LoginBlockReason;
      title: string;
      message: string;
      employeeName: string;
      companyName: string;
      statusLabel: string;
    };

const COPY: Record<
  LoginBlockReason,
  { title: string; statusLabel: string; message: (company: string) => string }
> = {
  RESIGNED: {
    title: "Access closed — resigned",
    statusLabel: "Resigned",
    message: (company) =>
      `Your employment with ${company} is marked as resigned, so portal login is disabled. If this is a mistake, ask your HR admin to reactivate your account.`,
  },
  TERMINATED: {
    title: "Access closed — terminated",
    statusLabel: "Terminated",
    message: (company) =>
      `Your account with ${company} was terminated, so you cannot sign in. Contact HR if you believe this is incorrect.`,
  },
  ON_NOTICE: {
    title: "Login paused — notice period",
    statusLabel: "On notice",
    message: (company) =>
      `You're on notice period at ${company}. Portal login stays locked until HR reactivates access.`,
  },
  INACTIVE: {
    title: "Account deactivated",
    statusLabel: "Inactive",
    message: (company) =>
      `Your ${company} portal account is deactivated. Ask an admin to activate it again.`,
  },
};

function blockReasonFromStatus(
  status: EmploymentStatus | null | undefined,
  isActive: boolean
): LoginBlockReason | null {
  if (status === "RESIGNED") return "RESIGNED";
  if (status === "TERMINATED") return "TERMINATED";
  if (status === "ON_NOTICE") return "ON_NOTICE";
  if (!isActive) return "INACTIVE";
  return null;
}

/** Pre-auth check so blocked employees get a clear reason instead of a vague failure. */
export async function checkLoginAccess(email: string): Promise<LoginAccessResult> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return { allowed: true };

  const user = await prisma.user.findFirst({
    where: { email: { equals: normalized, mode: "insensitive" } },
    include: {
      employee: true,
      company: { select: { name: true } },
    },
  });

  // Unknown email — let better-auth handle invalid credentials (don't leak accounts)
  if (!user) return { allowed: true };

  const reason = blockReasonFromStatus(
    user.employee?.employmentStatus,
    user.isActive
  );
  if (!reason) return { allowed: true };

  const copy = COPY[reason];
  const companyName = user.company?.name ?? "your company";
  const employeeName = user.employee
    ? `${user.employee.firstName} ${user.employee.lastName}`.trim()
    : user.name;

  return {
    allowed: false,
    reason,
    title: copy.title,
    message: copy.message(companyName),
    employeeName,
    companyName,
    statusLabel: copy.statusLabel,
  };
}
