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
  | "help";

export type NavItem = {
  label: string;
  href: string;
  icon: NavIconName;
  roles?: Role[];
};

export const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: "dashboard" },
  { label: "Employees", href: "/admin/employees", icon: "users" },
  { label: "Departments", href: "/admin/departments", icon: "building" },
  { label: "Attendance", href: "/admin/attendance", icon: "clock" },
  { label: "Exceptions", href: "/admin/exceptions", icon: "clock" },
  { label: "Leaves", href: "/admin/leaves", icon: "calendar" },
  { label: "Holidays", href: "/admin/holidays", icon: "party" },
  { label: "Announcements", href: "/admin/announcements", icon: "megaphone" },
  { label: "Documents", href: "/admin/documents", icon: "file" },
  { label: "Payroll", href: "/admin/payroll", icon: "chart" },
  { label: "Reports", href: "/admin/reports", icon: "chart" },
  { label: "Notifications", href: "/admin/notifications", icon: "bell" },
  { label: "Audit", href: "/admin/audit", icon: "settings" },
  { label: "How to use", href: "/admin/how-to-use", icon: "help" },
  { label: "Settings", href: "/admin/settings", icon: "settings" },
];

export const employeeNav: NavItem[] = [
  { label: "Dashboard", href: "/employee/dashboard", icon: "dashboard" },
  { label: "Attendance", href: "/employee/attendance", icon: "clock" },
  { label: "Leaves", href: "/employee/leaves", icon: "calendar" },
  { label: "Documents", href: "/employee/documents", icon: "file" },
  { label: "Payslips", href: "/employee/payslips", icon: "file" },
  { label: "Notifications", href: "/employee/notifications", icon: "bell" },
  { label: "How to use", href: "/employee/how-to-use", icon: "help" },
  { label: "Profile", href: "/employee/profile", icon: "user" },
];
