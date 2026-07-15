"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatTime } from "@/lib/utils";
import { toastSuccess } from "@/store/toast";

type DayRow = {
  date: string;
  weekday: string;
  checkIn: string | null;
  checkOut: string | null;
  workingHours: number | null;
  overtimeHours: number | null;
  status: string;
  isLate: boolean;
};

type Summary = {
  presentDays: number;
  absentDays: number;
  lateDays: number;
  earlyExits: number;
  totalHours: number;
  totalOt: number;
};

export function EmployeeAttendancePanel({
  month,
  monthLabel,
  timezone,
  summary,
  days,
  employeeName,
  employeeCode,
}: {
  month: string;
  monthLabel: string;
  timezone?: string;
  summary: Summary;
  days: DayRow[];
  employeeName: string;
  employeeCode: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function downloadCsv() {
    const header = [
      "Date",
      "Weekday",
      "Check in",
      "Check out",
      "Hours",
      "OT",
      "Status",
      "Late",
    ];
    const lines = days.map((d) =>
      [
        d.date.slice(0, 10),
        d.weekday,
        d.checkIn ? formatTime(d.checkIn, timezone) : "",
        d.checkOut ? formatTime(d.checkOut, timezone) : "",
        d.workingHours ?? "",
        d.overtimeHours ?? "",
        d.status,
        d.isLate ? "yes" : "no",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${employeeCode}-${month}-attendance.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toastSuccess("Downloaded", `${employeeName} · ${monthLabel}`);
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <CardTitle>Attendance report</CardTitle>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {monthLabel} · working days only (weekly offs & holidays hidden)
          </p>
        </div>
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const nextMonth = String(fd.get("month") || month);
            const params = new URLSearchParams(searchParams.toString());
            params.set("month", nextMonth);
            startTransition(() => {
              router.push(`${pathname}?${params.toString()}#attendance`);
            });
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="att-month">Month</Label>
            <Input
              id="att-month"
              name="month"
              type="month"
              defaultValue={month}
              required
            />
          </div>
          <Button type="submit" variant="outline" disabled={pending}>
            {pending ? "…" : "View"}
          </Button>
          <Button type="button" onClick={downloadCsv}>
            Download CSV
          </Button>
        </form>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatMini label="Present" value={summary.presentDays} />
          <StatMini label="Absent" value={summary.absentDays} />
          <StatMini label="Hours" value={summary.totalHours} />
          <StatMini
            label="OT / Late"
            value={`${summary.totalOt} / ${summary.lateDays}`}
          />
        </div>

        <div className="overflow-x-auto rounded-xl border-2 border-[var(--border)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>In</TableHead>
                <TableHead>Out</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {days.map((d) => (
                <TableRow key={d.date}>
                  <TableCell>
                    <div>
                      <p className="font-bold">{formatDate(d.date, timezone)}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {d.weekday}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{formatTime(d.checkIn, timezone)}</TableCell>
                  <TableCell>{formatTime(d.checkOut, timezone)}</TableCell>
                  <TableCell>{d.workingHours ?? "-"}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        d.isLate ? "bg-[var(--warning)] text-black" : undefined
                      }
                    >
                      {d.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function StatMini({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border-2 border-[var(--border)] bg-white px-3 py-2 shadow-[2px_2px_0_0_var(--border)]">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className="text-lg font-black">{value}</p>
    </div>
  );
}
