"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const TABS = [
  { id: "today", label: "Today" },
  { id: "recent", label: "Recent" },
  { id: "payroll", label: "Payroll timesheet" },
] as const;

export type AttendanceTab = (typeof TABS)[number]["id"];

export function AttendanceTabs({
  tab,
  employeeId,
  month,
}: {
  tab: AttendanceTab;
  employeeId?: string;
  month?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {TABS.map((t) => {
        const href =
          t.id === "payroll"
            ? `/admin/attendance?tab=payroll${employeeId ? `&employeeId=${employeeId}` : ""}${
                month ? `&month=${month}` : ""
              }`
            : `/admin/attendance?tab=${t.id}`;
        const active = tab === t.id;
        return (
          <Link
            key={t.id}
            href={href}
            className={cn(
              "rounded-xl border-2 border-[var(--border)] px-4 py-2 text-sm font-black shadow-[3px_3px_0_0_var(--border)] transition-transform hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_var(--border)]",
              active
                ? "nb-nav-active text-white"
                : "bg-white text-[var(--foreground)]"
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}

export function PayrollFilters({
  employees,
  employeeId,
  month,
}: {
  employees: Array<{ id: string; label: string }>;
  employeeId: string;
  month: string;
}) {
  const router = useRouter();

  function go(nextEmployeeId: string, nextMonth: string) {
    const params = new URLSearchParams({
      tab: "payroll",
      employeeId: nextEmployeeId,
      month: nextMonth,
    });
    router.push(`/admin/attendance?${params.toString()}`);
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="payroll-employee">Employee</Label>
        <Select
          id="payroll-employee"
          value={employeeId}
          onChange={(e) => go(e.target.value, month)}
        >
          <option value="">Select employee</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="payroll-month">Month</Label>
        <input
          id="payroll-month"
          type="month"
          className="nb-input flex h-11 w-full px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]"
          value={month}
          onChange={(e) => go(employeeId, e.target.value)}
        />
      </div>
    </div>
  );
}
