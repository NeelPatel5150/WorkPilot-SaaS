/**
 * Role-Based Access Control (RBAC)
 * --------------------------------
 * Static defaults per role. Company Admins can extend/override these via
 * the `roles.permissions` JSON column (custom roles table) - this file
 * only defines the baseline used when a company hasn't customized roles.
 */

export type Permission =
  | "attendance:view_own"
  | "attendance:view_team"
  | "attendance:view_all"
  | "attendance:mark"
  | "leave:apply"
  | "leave:view_own"
  | "leave:approve_team"
  | "leave:approve_all"
  | "employees:view"
  | "employees:manage"
  | "departments:manage"
  | "payroll:view"
  | "payroll:manage"
  | "reports:view"
  | "settings:manage"
  | "branding:manage"
  | "roles:manage"
  | "tasks:manage"
  | "tasks:view_own";

export type Role = "SUPER_ADMIN" | "COMPANY_ADMIN" | "HR" | "MANAGER" | "EMPLOYEE";

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    "attendance:view_own",
    "attendance:view_all",
    "leave:apply",
    "leave:view_own",
    "leave:approve_all",
    "employees:view",
    "employees:manage",
    "departments:manage",
    "payroll:view",
    "payroll:manage",
    "reports:view",
    "settings:manage",
    "branding:manage",
    "roles:manage",
    "tasks:manage",
    "tasks:view_own",
  ],
  COMPANY_ADMIN: [
    "attendance:view_own",
    "attendance:view_all",
    "leave:apply",
    "leave:view_own",
    "leave:approve_all",
    "employees:view",
    "employees:manage",
    "departments:manage",
    "payroll:view",
    "payroll:manage",
    "reports:view",
    "settings:manage",
    "branding:manage",
    "roles:manage",
    "tasks:manage",
    "tasks:view_own",
  ],
  HR: [
    "attendance:view_own",
    "attendance:view_all",
    "attendance:mark",
    "leave:apply",
    "leave:view_own",
    "leave:approve_all",
    "employees:view",
    "employees:manage",
    "departments:manage",
    "payroll:view",
    "payroll:manage",
    "reports:view",
    "settings:manage",
    "tasks:manage",
    "tasks:view_own",
  ],
  MANAGER: [
    "attendance:view_team",
    "attendance:mark",
    "leave:apply",
    "leave:view_own",
    "leave:approve_team",
    "employees:view",
    "reports:view",
    "tasks:manage",
    "tasks:view_own",
  ],
  EMPLOYEE: [
    "attendance:view_own",
    "attendance:mark",
    "leave:apply",
    "leave:view_own",
    "payroll:view",
    "tasks:view_own",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  const granted = ROLE_PERMISSIONS[role] ?? [];
  if (granted.includes(permission)) return true;
  // manage implies view for the same resource (e.g. payroll:manage → payroll:view)
  if (permission.endsWith(":view") || permission.endsWith(":view_own")) {
    const manage = permission.replace(/:view(_own)?$/, ":manage") as Permission;
    if (granted.includes(manage)) return true;
  }
  return false;
}

export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}
