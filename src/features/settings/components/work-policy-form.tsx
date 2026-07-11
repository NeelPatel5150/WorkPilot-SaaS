"use client";

import { useState, useTransition } from "react";
import { updateWorkPolicyAction } from "@/features/shared/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toastError, toastSuccess } from "@/store/toast";

const WEEKDAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
] as const;

export type WorkPolicyFormValues = {
  workStartHour: number;
  workStartMinute: number;
  graceMinutes: number;
  standardHours: number;
  weeklyOffs: number[];
  officeLat: number | null;
  officeLng: number | null;
  geofenceRadiusM: number;
  officeIpAllowlist: string | null;
};

export function WorkPolicyForm({ policy }: { policy: WorkPolicyFormValues }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const offs = new Set(policy.weeklyOffs.map(Number));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Work policy</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              const res = await updateWorkPolicyAction(fd);
              if (res && "error" in res) {
                setError(res.error);
                toastError("Policy not saved", res.error);
              } else {
                toastSuccess("Work policy saved");
              }
            });
          }}
        >
          <div className="space-y-1">
            <Label>Work start hour (0–23)</Label>
            <Input
              name="workStartHour"
              type="number"
              min={0}
              max={23}
              required
              defaultValue={policy.workStartHour}
              placeholder="e.g. 10"
            />
          </div>
          <div className="space-y-1">
            <Label>Work start minute</Label>
            <Input
              name="workStartMinute"
              type="number"
              min={0}
              max={59}
              required
              defaultValue={policy.workStartMinute}
              placeholder="e.g. 0"
            />
          </div>
          <div className="space-y-1">
            <Label>Grace minutes</Label>
            <Input
              name="graceMinutes"
              type="number"
              min={0}
              required
              defaultValue={policy.graceMinutes}
              placeholder="e.g. 15"
            />
          </div>
          <div className="space-y-1">
            <Label>Standard hours / day</Label>
            <Input
              name="standardHours"
              type="number"
              min={1}
              max={24}
              step="0.5"
              required
              defaultValue={policy.standardHours}
              placeholder="e.g. 8"
            />
          </div>
          <div className="space-y-2 sm:col-span-2 lg:col-span-3">
            <Label>Weekly offs</Label>
            <div className="flex flex-wrap gap-3">
              {WEEKDAYS.map((d) => (
                <label key={d.value} className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    name="weeklyOff"
                    value={d.value}
                    defaultChecked={offs.has(d.value)}
                    className="h-4 w-4"
                  />
                  {d.label}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label>Office latitude</Label>
            <Input
              name="officeLat"
              type="number"
              step="any"
              defaultValue={policy.officeLat ?? ""}
              placeholder="e.g. 23.0225"
            />
          </div>
          <div className="space-y-1">
            <Label>Office longitude</Label>
            <Input
              name="officeLng"
              type="number"
              step="any"
              defaultValue={policy.officeLng ?? ""}
              placeholder="e.g. 72.5714"
            />
          </div>
          <div className="space-y-1">
            <Label>Geofence radius (m)</Label>
            <Input
              name="geofenceRadiusM"
              type="number"
              min={0}
              defaultValue={policy.geofenceRadiusM}
              placeholder="e.g. 200"
            />
            <p className="text-[10px] text-[var(--muted-foreground)]">0 disables geofence</p>
          </div>
          <div className="space-y-1 sm:col-span-2 lg:col-span-3">
            <Label>Office IP allowlist</Label>
            <Input
              name="officeIpAllowlist"
              defaultValue={policy.officeIpAllowlist ?? ""}
              placeholder="e.g. 203.0.113.,198.51.100.10"
            />
            <p className="text-xs text-[var(--muted-foreground)]">
              Comma-separated IPs or prefixes. Empty = allow all.
            </p>
          </div>
          <div className="sm:col-span-2 lg:col-span-3 flex items-center gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save work policy"}
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
