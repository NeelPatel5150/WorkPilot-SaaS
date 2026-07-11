"use client";

import { useState, useTransition } from "react";
import { applyLeaveAction } from "@/features/shared/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toastError, toastSuccess } from "@/store/toast";

type LeaveType = { id: string; name: string; sandwichRule?: boolean };
type CoverOption = { id: string; label: string };

export function ApplyLeaveForm({
  types,
  coverOptions = [],
}: {
  types: LeaveType[];
  coverOptions?: CoverOption[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Apply leave</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-3 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
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
          <div className="space-y-1">
            <Label>Start</Label>
            <Input name="startDate" type="date" required placeholder="YYYY-MM-DD" />
          </div>
          <div className="space-y-1">
            <Label>End</Label>
            <Input name="endDate" type="date" required placeholder="YYYY-MM-DD" />
          </div>
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
            <Textarea
              name="reason"
              placeholder="e.g. Family function in Ahmedabad — back on Monday"
            />
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
