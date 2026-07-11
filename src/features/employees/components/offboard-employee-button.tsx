"use client";

import { useState, useTransition } from "react";
import {
  offboardEmployeeAction,
  reactivateEmployeeAction,
} from "@/features/shared/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { toastError, toastSuccess } from "@/store/toast";

export function OffboardEmployeeButton({
  employeeId,
  name,
  active,
  status,
}: {
  employeeId: string;
  name: string;
  active: boolean;
  status: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!active) {
    return (
      <div className="flex flex-col items-end gap-1">
        <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
          {status.replace(/_/g, " ")}
        </span>
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const fd = new FormData();
              fd.set("employeeId", employeeId);
              const res = await reactivateEmployeeAction(fd);
              if (res && "error" in res) toastError("Activate failed", res.error);
              else toastSuccess("Activated", `${name} can sign in again.`);
            })
          }
        >
          {pending ? "…" : "Activate"}
        </Button>
      </div>
    );
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Offboard
      </Button>
    );
  }

  return (
    <form
      className="flex min-w-[220px] flex-col gap-2 rounded-lg border-2 border-[var(--border)] bg-white p-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set("employeeId", employeeId);
        startTransition(async () => {
          const res = await offboardEmployeeAction(fd);
          if (res && "error" in res) toastError("Offboard failed", res.error);
          else {
            toastSuccess("Access revoked", `${name} can no longer sign in.`);
            setOpen(false);
          }
        });
      }}
    >
      <div className="space-y-1">
        <Label>Status</Label>
        <Select name="status" defaultValue="RESIGNED">
          <option value="RESIGNED">Resigned</option>
          <option value="TERMINATED">Terminated</option>
          <option value="ON_NOTICE">On notice</option>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Exit reason</Label>
        <Input name="exitReason" placeholder="e.g. Better opportunity / end of contract" />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "…" : "Confirm & kill access"}
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
