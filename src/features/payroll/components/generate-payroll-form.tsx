"use client";

import { useEffect, useState, useTransition } from "react";
import {
  generatePayrollAction,
  getPayrollPreviewAction,
} from "@/features/shared/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toastError, toastSuccess } from "@/store/toast";

type EmployeeOption = {
  id: string;
  label: string;
  basicSalary: number | null;
};

type Preview = {
  employeeName: string;
  employeeCode: string;
  basicSalary: number | null;
  calendarDays: number;
  workingDays?: number;
  presentDays: number;
  lateDays: number;
  halfDays: number;
  leaveDays: number;
  holidayDays: number;
  weeklyOffDays?: number;
  lopDays?: number;
  absentDays?: number;
  overtimeHours: number;
  totalHours: number;
  earlyExits: number;
};

export function GeneratePayrollForm({
  defaultMonth,
  employees,
}: {
  defaultMonth: string;
  employees: EmployeeOption[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [previewPending, startPreview] = useTransition();
  const [month, setMonth] = useState(defaultMonth);
  const [employeeId, setEmployeeId] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [defaultBasic, setDefaultBasic] = useState("15000");

  useEffect(() => {
    if (!employeeId || !/^\d{4}-\d{2}$/.test(month)) {
      setPreview(null);
      return;
    }
    const emp = employees.find((e) => e.id === employeeId);
    if (emp?.basicSalary && emp.basicSalary > 0) {
      setDefaultBasic(String(emp.basicSalary));
    }
    startPreview(async () => {
      const res = await getPayrollPreviewAction(employeeId, month);
      if (res && "error" in res) {
        setPreview(null);
        return;
      }
      if (res && "preview" in res) setPreview(res.preview);
    });
  }, [employeeId, month, employees]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate salary slips</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              const res = await generatePayrollAction(fd);
              if (res && "error" in res) {
                setError(res.error);
                toastError("Payroll failed", res.error);
                return;
              }
              if (res && "count" in res) {
                toastSuccess(
                  res.status === "PUBLISHED" ? "Payslips published" : "Payslips drafted",
                  `${res.count} slip(s) for ${res.month}/${res.year}`
                );
              }
            });
          }}
        >
          <div className="space-y-1 sm:col-span-2 lg:col-span-3">
            <Label>Employee</Label>
            <Select
              name="employeeId"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            >
              <option value="">All active employees</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Month</Label>
            <Input
              name="month"
              type="month"
              value={month}
              required
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Basic salary</Label>
            <Input
              name="defaultBasic"
              type="number"
              min={0}
              step="0.01"
              value={defaultBasic}
              onChange={(e) => setDefaultBasic(e.target.value)}
            />
            <p className="text-[10px] text-[var(--muted-foreground)]">
              Used when employee has no saved basic
            </p>
          </div>
          <div className="space-y-1">
            <Label>Allowances</Label>
            <Input name="allowances" type="number" min={0} step="0.01" defaultValue={0} />
          </div>
          <div className="space-y-1">
            <Label>Deductions</Label>
            <Input name="deductions" type="number" min={0} step="0.01" defaultValue={0} />
          </div>
          <div className="space-y-1">
            <Label>PF %</Label>
            <Input name="pfPercent" type="number" min={0} step="0.01" defaultValue={12} />
          </div>
          <div className="space-y-1">
            <Label>ESI %</Label>
            <Input name="esiPercent" type="number" min={0} step="0.01" defaultValue={0.75} />
          </div>
          <div className="space-y-1">
            <Label>TDS</Label>
            <Input name="tds" type="number" min={0} step="0.01" defaultValue={0} />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-3">
            <input id="publish" name="publish" type="checkbox" value="1" className="h-4 w-4" />
            <Label htmlFor="publish">Publish slips (notify employees)</Label>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <Button type="submit" disabled={pending}>
              {pending
                ? "Generating…"
                : employeeId
                  ? "Generate slip for this employee"
                  : "Generate & notify all"}
            </Button>
            {error ? (
              <p className="mt-2 text-sm font-semibold text-[var(--destructive)]">{error}</p>
            ) : null}
          </div>
        </form>

        {employeeId ? (
          <div
            className="rounded-xl border-2 border-[var(--border)] p-4 shadow-[4px_4px_0_0_var(--border)]"
            style={{ backgroundImage: "var(--card-shine)" }}
          >
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
              Attendance summary {previewPending ? "· loading…" : ""}
            </p>
            {preview ? (
              <>
                <p className="mt-1 text-lg font-black">
                  {preview.employeeName}{" "}
                  <span className="text-sm font-bold text-[var(--muted-foreground)]">
                    ({preview.employeeCode})
                  </span>
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: "Calendar days", value: preview.calendarDays },
                    ...(preview.workingDays != null
                      ? [{ label: "Working days", value: preview.workingDays }]
                      : []),
                    { label: "Present (paid)", value: preview.presentDays },
                    { label: "On leave", value: preview.leaveDays },
                    ...(preview.lopDays != null
                      ? [{ label: "LOP days", value: preview.lopDays }]
                      : preview.absentDays != null
                        ? [{ label: "Absent (est.)", value: preview.absentDays }]
                        : []),
                    ...(preview.weeklyOffDays != null
                      ? [{ label: "Weekly offs", value: preview.weeklyOffDays }]
                      : []),
                    { label: "Late days", value: preview.lateDays },
                    { label: "Half days", value: preview.halfDays },
                    { label: "Holidays", value: preview.holidayDays },
                    { label: "Early exits", value: preview.earlyExits },
                    { label: "OT hours", value: preview.overtimeHours },
                    { label: "Hours worked", value: preview.totalHours },
                    {
                      label: "Saved basic",
                      value: preview.basicSalary ?? "-",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-lg border-2 border-[var(--border)]/40 bg-white/80 px-3 py-2"
                    >
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
                        {item.label}
                      </p>
                      <p className="text-lg font-black">{item.value}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-[var(--muted-foreground)]">
                  Review these numbers, adjust basic / allowances / deductions, then generate the
                  slip.
                </p>
              </>
            ) : !previewPending ? (
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                No attendance data for this month yet.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-[var(--muted-foreground)]">
            Select one employee to preview present / leave / absent days before generating, or leave
            as “All” to run payroll for everyone.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
