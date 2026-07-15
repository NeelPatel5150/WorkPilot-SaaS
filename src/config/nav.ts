import type { Role } from "@/lib/permissions";

export type NavIconName =
  | "dashboard"
  | "users"
  | "building"
  | "clock"
  | "calendar"
  | "chart"
  | "settings"
  | "user"
  | "file"
  | "bell"
  | "party"
  | "megaphone"
  | "help"
  | "tasks";

export type NavChild = {
  label: string;
  href: string;
};

export type NavItem = {
  label: string;
  href: string;
  icon: NavIconName;
  roles?: Role[];
  /** Optional nested links (sidebar dropdown). */
  children?: NavChild[];
};

export const adminNav: NavItem[] = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: "dashboard",
    roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "HR", "MANAGER"],
  },
  {
    label: "Employees",
    href: "/admin/employees",
    icon: "users",
    roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "HR"],
    children: [
      { label: "Add employee", href: "/admin/employees/add" },
      { label: "Manage employee", href: "/admin/employees/manage" },
    ],
  },
  {
    label: "Departments",
    href: "/admin/departments",
    icon: "building",
    roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "HR"],
  },
  {
    label: "Workspace",
    href: "/admin/workspace",
    icon: "tasks",
    roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "HR", "MANAGER"],
  },
  {
    label: "Approvals",
    href: "/admin/approvals",
    icon: "calendar",
    roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "HR", "MANAGER"],
  },
  {
    label: "Attendance",
    href: "/admin/attendance",
    icon: "clock",
    roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "HR", "MANAGER"],
  },
  {
    label: "Exceptions",
    href: "/admin/exceptions",
    icon: "clock",
    roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "HR", "MANAGER"],
  },
  {
    label: "Leaves",
    href: "/admin/leaves",
    icon: "calendar",
    roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "HR", "MANAGER"],
  },
  {
    label: "Holidays",
    href: "/admin/holidays",
    icon: "party",
    roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "HR"],
  },
  {
    label: "Announcements",
    href: "/admin/announcements",
    icon: "megaphone",
    roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "HR"],
  },
  {
    label: "Documents",
    href: "/admin/documents",
    icon: "file",
    roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "HR"],
  },
  {
    label: "Payroll",
    href: "/admin/payroll",
    icon: "chart",
    roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "HR"],
  },
  {
    label: "Letters",
    href: "/admin/letters",
    icon: "file",
    roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "HR"],
  },
  {
    label: "Reports",
    href: "/admin/reports",
    icon: "chart",
    roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "HR", "MANAGER"],
  },
  {
    label: "Notifications",
    href: "/admin/notifications",
    icon: "bell",
    roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "HR", "MANAGER"],
  },
  {
    label: "How to use",
    href: "/admin/how-to-use",
    icon: "help",
    roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "HR", "MANAGER"],
  },
  {
    label: "MCP",
    href: "/admin/mcp",
    icon: "settings",
    roles: ["SUPER_ADMIN", "COMPANY_ADMIN"],
  },
  {
    label: "Settings",
    href: "/admin/settings",
    icon: "settings",
    roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "HR"],
  },
];

export const employeeNav: NavItem[] = [
  { label: "Dashboard", href: "/employee/dashboard", icon: "dashboard" },
  { label: "Attendance", href: "/employee/attendance", icon: "clock" },
  { label: "Workspace", href: "/employee/workspace", icon: "tasks" },
  { label: "Projects", href: "/employee/projects", icon: "file" },
  { label: "Leaves", href: "/employee/leaves", icon: "calendar" },
  { label: "Documents", href: "/employee/documents", icon: "file" },
  { label: "Payslips", href: "/employee/payslips", icon: "file" },
  { label: "Notifications", href: "/employee/notifications", icon: "bell" },
  { label: "How to use", href: "/employee/how-to-use", icon: "help" },
  { label: "Profile", href: "/employee/profile", icon: "user" },
];
