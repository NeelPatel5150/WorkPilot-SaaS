"use client";

import { useState, useTransition } from "react";
import {
  createLeaveTypeAction,
  updateLeaveTypeAction,
} from "@/features/shared/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toastError, toastSuccess } from "@/store/toast";
import { cn } from "@/lib/utils";

export type LeaveTypeRow = {
  id: string;
  name: string;
  code: string | null;
  defaultDays: number;
  requiresProof: boolean;
  carryForward: boolean;
  maxCarryDays: number;
  sandwichRule: boolean;
  isApplicable: boolean;
};

function LeaveTypeEditor({ type }: { type: LeaveTypeRow }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const active = type.isApplicable;

  return (
    <form
      className={cn(
        "grid gap-3 rounded-xl border-2 p-4 sm:grid-cols-2 lg:grid-cols-4",
        active
          ? "border-[var(--border)] bg-[color-mix(in_srgb,var(--success)_8%,white)]"
          : "border-dashed border-[var(--border)] bg-[var(--muted)]/40 opacity-80"
      )}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const fd = new FormData(e.currentTarget);
        fd.set("id", type.id);
        startTransition(async () => {
          const res = await updateLeaveTypeAction(fd);
          if (res && "error" in res) {
            setError(res.error);
            toastError("Leave type not saved", res.error);
          } else {
            toastSuccess("Leave type updated");
          }
        });
      }}
    >
      <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-black">
            {type.name}
            {type.code ? (
              <span className="ml-2 font-mono text-xs font-bold text-[var(--muted-foreground)]">
                ({type.code})
              </span>
            ) : null}
          </p>
          {active ? (
            <Badge className="border-[var(--success)] bg-[var(--success)] text-white">
              Active
            </Badge>
          ) : (
            <Badge className="bg-white text-[var(--muted-foreground)]">
              Inactive
            </Badge>
          )}
        </div>
        <p className="text-xs font-semibold text-[var(--muted-foreground)]">
          {active
            ? "Visible to all employees"
            : "Hidden from all employees"}
        </p>
      </div>

      <div className="space-y-1">
        <Label>Name</Label>
        <Input name="name" required defaultValue={type.name} />
      </div>
      <div className="space-y-1">
        <Label>Code</Label>
        <Input name="code" defaultValue={type.code ?? ""} placeholder="CL" />
      </div>
      <div className="space-y-1">
        <Label>Days / year</Label>
        <Input
          name="defaultDays"
          type="number"
          min={0}
          required
          defaultValue={type.defaultDays}
        />
      </div>
      <div className="space-y-1">
        <Label>Max carry days</Label>
        <Input
          name="maxCarryDays"
          type="number"
          min={0}
          defaultValue={type.maxCarryDays}
        />
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          name="isApplicable"
          value="on"
          defaultChecked={type.isApplicable}
          className="h-4 w-4"
        />
        Active for this company
      </label>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          name="sandwichRule"
          value="on"
          defaultChecked={type.sandwichRule}
          className="h-4 w-4"
        />
        Sandwich rule
      </label>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          name="carryForward"
          value="on"
          defaultChecked={type.carryForward}
          className="h-4 w-4"
        />
        Carry forward
      </label>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          name="requiresProof"
          value="on"
          defaultChecked={type.requiresProof}
          className="h-4 w-4"
        />
        Requires proof
      </label>
      <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        {error ? (
          <p className="text-sm font-semibold text-[var(--destructive)]">{error}</p>
        ) : null}
      </div>
    </form>
  );
}

export function LeaveTypesForm({ types }: { types: LeaveTypeRow[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const activeTypes = types.filter((t) => t.isApplicable);
  const inactiveTypes = types.filter((t) => !t.isApplicable);
  const ordered = [...activeTypes, ...inactiveTypes];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leave types</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border-2 border-[var(--border)] bg-[color-mix(in_srgb,var(--success)_10%,white)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-black">
              Currently active for employees
            </p>
            <Badge className="border-[var(--success)] bg-[var(--success)] text-white">
              {activeTypes.length} active
            </Badge>
          </div>
          {activeTypes.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              No leave types are active. Tick &quot;Active for this company&quot; on a
              type below so employees can apply for it.
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {activeTypes.map((t) => (
                <Badge
                  key={t.id}
                  className="border-[var(--border)] bg-white shadow-[2px_2px_0_0_var(--border)]"
                >
                  {t.code ? `${t.code} · ` : ""}
                  {t.name}
                  <span className="ml-1.5 font-semibold text-[var(--muted-foreground)]">
                    {t.defaultDays}d
                  </span>
                </Badge>
              ))}
            </div>
          )}
          {inactiveTypes.length > 0 ? (
            <p className="mt-3 text-xs font-semibold text-[var(--muted-foreground)]">
              Inactive ({inactiveTypes.length}):{" "}
              {inactiveTypes.map((t) => t.name).join(", ")}
            </p>
          ) : null}
        </div>

        <p className="text-sm text-[var(--muted-foreground)]">
          Active types appear in the employee leave form. Untick Active to hide
          a type from everyone.
        </p>

        <div className="space-y-3">
          {ordered.map((type) => (
            <LeaveTypeEditor key={type.id} type={type} />
          ))}
        </div>

        <form
          className="grid gap-3 rounded-xl border-2 border-dashed border-[var(--border)] p-4 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const fd = new FormData(e.currentTarget);
            const form = e.currentTarget;
            startTransition(async () => {
              const res = await createLeaveTypeAction(fd);
              if (res && "error" in res) {
                setError(res.error);
                toastError("Could not add leave type", res.error);
              } else {
                toastSuccess("Leave type added");
                form.reset();
              }
            });
          }}
        >
          <p className="sm:col-span-2 lg:col-span-4 text-sm font-bold">
            Add leave type
          </p>
          <div className="space-y-1">
            <Label>Name</Label>
            <Input name="name" required placeholder="Maternity Leave" />
          </div>
          <div className="space-y-1">
            <Label>Code</Label>
            <Input name="code" placeholder="ML" />
          </div>
          <div className="space-y-1">
            <Label>Days / year</Label>
            <Input
              name="defaultDays"
              type="number"
              min={0}
              required
              defaultValue={0}
            />
          </div>
          <label className="flex items-end gap-2 pb-2 text-sm font-semibold">
            <input
              type="checkbox"
              name="isApplicable"
              value="on"
              defaultChecked
              className="h-4 w-4"
            />
            Active for this company
          </label>
          <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Adding…" : "Add leave type"}
            </Button>
            {error ? (
              <p className="text-sm font-semibold text-[var(--destructive)]">
                {error}
              </p>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
