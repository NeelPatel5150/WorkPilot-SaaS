import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  requireUserSelect,
  type RequireUserResult,
} from "@/lib/company-shell";
import type { UserRole } from "@/generated/prisma";
import { hasPermission, type Permission, type Role } from "@/lib/permissions";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";

export type { RequireUserResult };

/** Deduped per request — layout + page share one session/DB hit. */
export const getSession = cache(async () => {
  try {
    return await auth.api.getSession({ headers: await headers() });
  } catch (error) {
    // Misconfigured auth env (e.g. missing BETTER_AUTH_SECRET on Vercel)
    // must not 500 public pages — login will still fail until env is fixed.
    console.error("[auth] getSession failed:", error);
    return null;
  }
});

export async function requireSession() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

/** Deduped per request — admin layout and page both call this. */
export const requireUser = cache(async (): Promise<RequireUserResult> => {
  const session = await requireSession();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: requireUserSelect,
  });

  if (!user || !user.isActive) {
    redirect("/login");
  }

  if (!user.companyId || !user.company) {
    redirect("/register");
  }

  return user;
});

export async function requirePermission(permission: Permission) {
  const user = await requireUser();
  if (!hasPermission(user.role as Role, permission)) {
    throw new ForbiddenError("You do not have permission for this action");
  }
  return user;
}

export function assertPermission(role: UserRole, permission: Permission) {
  if (!hasPermission(role as Role, permission)) {
    throw new ForbiddenError("You do not have permission for this action");
  }
}

export function assertAuth(condition: unknown): asserts condition {
  if (!condition) throw new UnauthorizedError();
}

export function isAdminRole(role: UserRole) {
  return role === "SUPER_ADMIN" || role === "COMPANY_ADMIN" || role === "HR";
}

export function portalHomeForRole(role: UserRole) {
  if (role === "EMPLOYEE") return "/employee/dashboard";
  return "/admin/dashboard";
}
