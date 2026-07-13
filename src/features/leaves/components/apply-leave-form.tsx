"use client";

import { useMemo, useState, useTransition } from "react";
import { applyLeaveAction } from "@/features/shared/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toastError, toastSuccess } from "@/store/toast";
import { LeaveDatePicker } from "@/features/leaves/components/leave-date-picker";

type LeaveType = { id: string; name: string; sandwichRule?: boolean };
type CoverOption = { id: string; label: string };

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function todayIsoLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function ApplyLeaveForm({
  types,
  coverOptions = [],
  holidayDates = [],
  weeklyOffs = [],
}: {
  types: LeaveType[];
  coverOptions?: CoverOption[];
  /** ISO YYYY-MM-DD holiday dates (blocked). */
  holidayDates?: string[];
  /** JS weekday numbers from work policy (0=Sun … 6=Sat). Empty = all days working. */
  weeklyOffs?: number[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const minDate = useMemo(() => todayIsoLocal(), []);
  const holidaySet = useMemo(() => new Set(holidayDates), [holidayDates]);
  const offSet = useMemo(() => new Set(weeklyOffs.map(Number)), [weeklyOffs]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const weekOffLabel =
    weeklyOffs.length === 0
      ? "No weekly offs (all days are working days)"
      : `Weekly offs: ${weeklyOffs.map((d) => DAY_NAMES[d]).join(", ")}`;

  function dateBlockReason(iso: string): string | null {
    if (iso < minDate) return "Leave cannot start before today";
    const dow = new Date(`${iso}T00:00:00.000Z`).getUTCDay();
    if (offSet.has(dow)) return `${DAY_NAMES[dow]} is a weekly off. No leave needed.`;
    if (holidaySet.has(iso)) return "Selected date is a company holiday. No leave needed.";
    return null;
  }

  function validateDates(start: string, end: string) {
    if (!start || !end) return "Pick start and end dates";
    if (end < start) return "End date must be on or after start date";

    const startMs = new Date(`${start}T00:00:00.000Z`).getTime();
    const endMs = new Date(`${end}T00:00:00.000Z`).getTime();
    for (let t = startMs; t <= endMs; t += 24 * 60 * 60 * 1000) {
      const iso = new Date(t).toISOString().slice(0, 10);
      const reason = dateBlockReason(iso);
      if (reason) return reason;
    }
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Apply leave</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-xs font-semibold text-[var(--muted-foreground)]">
          {weekOffLabel}. Holidays and week offs cannot be selected.
        </p>
        <form
          className="grid gap-3 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const localErr = validateDates(startDate, endDate);
            if (localErr) {
              setError(localErr);
              toastError("Leave not submitted", localErr);
              return;
            }
            setError(null);
            const fd = new FormData(e.currentTarget);
            const form = e.currentTarget;
            startTransition(async () => {
              const res = await applyLeaveAction(fd);
              if (res && "error" in res) {
                setError(res.error);
                toastError("Leave not submitted", res.error);
              } else {
                form.reset();
                setStartDate("");
                setEndDate("");
                toastSuccess("Leave submitted", "Waiting for approval.");
              }
            });
          }}
        >
          <div className="space-y-1 md:col-span-2">
            <Label>Leave type</Label>
            <Select name="leaveTypeId" required defaultValue="">
              <option value="" disabled>
                Select leave type (CL / SL / EL…)
              </option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.sandwichRule ? " (sandwich)" : ""}
                </option>
              ))}
            </Select>
          </div>

          <LeaveDatePicker
            label="Start"
            name="startDate"
            value={startDate}
            minIso={minDate}
            holidayDates={holidayDates}
            weeklyOffs={weeklyOffs}
            onChange={(iso) => {
              setStartDate(iso);
              if (endDate && endDate < iso) setEndDate(iso);
            }}
          />
          <LeaveDatePicker
            label="End"
            name="endDate"
            value={endDate}
            minIso={startDate || minDate}
            holidayDates={holidayDates}
            weeklyOffs={weeklyOffs}
            onChange={setEndDate}
          />

          <div className="flex items-center gap-2 md:col-span-2">
            <input id="isHalfDay" name="isHalfDay" type="checkbox" className="h-4 w-4" />
            <Label htmlFor="isHalfDay">Half day</Label>
          </div>
          {coverOptions.length > 0 ? (
            <div className="space-y-1 md:col-span-2">
              <Label>Who covers while away</Label>
              <Select name="coverEmployeeId" defaultValue="">
                <option value="">Who covers while away? (optional)</option>
                {coverOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
          <div className="space-y-1 md:col-span-2">
            <Label>Reason</Label>
            <Textarea name="reason" placeholder="Enter reason for leave" />
          </div>
          <div className="md:col-span-2 flex items-center gap-3">
            <Button type="submit" disabled={pending || types.length === 0}>
              {pending ? "Submitting…" : "Submit request"}
            </Button>
            {error ? (
              <p className="text-sm font-semibold text-[var(--destructive)]">{error}</p>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
