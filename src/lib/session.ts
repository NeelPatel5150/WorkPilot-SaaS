import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/generated/prisma";
import { hasPermission, type Permission, type Role } from "@/lib/permissions";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireSession() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

export async function requireUser() {
  const session = await requireSession();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      employee: true,
      company: true,
    },
  });

  if (!user || !user.isActive) {
    redirect("/login");
  }

  if (!user.companyId || !user.company) {
    redirect("/register");
  }

  return user;
}

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
