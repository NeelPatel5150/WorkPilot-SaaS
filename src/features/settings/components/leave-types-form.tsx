"use client";

import { useMemo, useState, useTransition } from "react";
import {
  addCatalogLeaveTypeAction,
  createLeaveTypeAction,
  disableLeaveTypeAction,
  updateLeaveTypeAction,
} from "@/features/shared/actions";
import { LEAVE_CATALOG, isEmployeeScopedLeave } from "@/lib/leave-catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
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

function LeaveTypeEditor({
  type,
  onDisabled,
}: {
  type: LeaveTypeRow;
  onDisabled?: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const employeeScoped = isEmployeeScopedLeave(type.code);
  const isCl = (type.code || "").toUpperCase() === "CL";

  return (
    <form
      className={cn(
        "grid gap-3 rounded-xl border-2 border-[var(--border)] bg-white p-4 sm:grid-cols-2 lg:grid-cols-4"
      )}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const fd = new FormData(e.currentTarget);
        fd.set("id", type.id);
        fd.set("isApplicable", "on");
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
      <div className="flex flex-wrap items-start justify-between gap-2 sm:col-span-2 lg:col-span-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-black">
              {type.name}
              {type.code ? (
                <span className="ml-2 font-mono text-xs font-bold text-[var(--muted-foreground)]">
                  ({type.code})
                </span>
              ) : null}
            </p>
            <Badge className="border-[var(--success)] bg-[var(--success)] text-white">
              Enabled
            </Badge>
            {employeeScoped ? (
              <Badge className="bg-[var(--secondary)] text-[var(--foreground)]">
                Per employee
              </Badge>
            ) : (
              <Badge className="bg-white text-[var(--muted-foreground)]">
                Company pack
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            {employeeScoped
              ? "Enabled for the company. Grant days per person in Manage employee."
              : "Yearly allotment applies to employees when they join (or when you added this type)."}
          </p>
        </div>
        {!isCl ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => {
              const fd = new FormData();
              fd.set("id", type.id);
              startTransition(async () => {
                const res = await disableLeaveTypeAction(fd);
                if (res && "error" in res) {
                  toastError("Could not remove", res.error);
                } else {
                  toastSuccess("Removed from company pack");
                  onDisabled?.();
                }
              });
            }}
          >
            Remove
          </Button>
        ) : (
          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
            Required
          </p>
        )}
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
        <Label>{employeeScoped ? "Default days (usually 0)" : "Days / year"}</Label>
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
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-4">
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
  const [showCustom, setShowCustom] = useState(false);
  const [catalogKey, setCatalogKey] = useState("");

  const enabled = useMemo(
    () => types.filter((t) => t.isApplicable),
    [types]
  );

  const enabledCodes = useMemo(() => {
    const set = new Set(
      enabled.map((t) => (t.code || "").toUpperCase()).filter(Boolean)
    );
    return set;
  }, [enabled]);

  const availableCatalog = useMemo(
    () =>
      LEAVE_CATALOG.filter(
        (p) => p.code !== "CL" && !enabledCodes.has(p.code.toUpperCase())
      ),
    [enabledCodes]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leave types</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-xl border-2 border-[var(--border)] bg-[color-mix(in_srgb,var(--primary)_6%,white)] p-4">
          <p className="text-sm font-black">How leave types work</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--muted-foreground)]">
            <li>
              <span className="font-semibold text-[var(--foreground)]">Casual Leave (CL)</span>{" "}
              is always included. Everything else is opt-in.
            </li>
            <li>
              Use the dropdown below to add Sick Leave, Earned Leave, WFH, or Comp Off
              only if your company uses them.
            </li>
            <li>
              <span className="font-semibold text-[var(--foreground)]">Comp Off</span> is
              enabled for the company first, then you grant days per employee in Manage
              employee (not a fixed company allotment).
            </li>
          </ul>
        </div>

        <div className="rounded-xl border-2 border-[var(--border)] bg-white p-4 shadow-[3px_3px_0_0_var(--border)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-black">Your company pack</p>
            <Badge className="border-[var(--success)] bg-[var(--success)] text-white">
              {enabled.length} enabled
            </Badge>
          </div>
          {enabled.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              No leave types yet. CL should appear after company setup.
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {enabled.map((t) => (
                <Badge
                  key={t.id}
                  className="border-[var(--border)] bg-white shadow-[2px_2px_0_0_var(--border)]"
                >
                  {t.code ? `${t.code} · ` : ""}
                  {t.name}
                  {isEmployeeScopedLeave(t.code) ? (
                    <span className="ml-1.5 text-[var(--muted-foreground)]">per emp</span>
                  ) : (
                    <span className="ml-1.5 font-semibold text-[var(--muted-foreground)]">
                      {t.defaultDays}d
                    </span>
                  )}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {availableCatalog.length > 0 ? (
          <form
            className="grid gap-3 rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--muted)]/30 p-4 sm:grid-cols-[1fr_auto] sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              if (!catalogKey) {
                setError("Select a leave type to add");
                return;
              }
              const fd = new FormData();
              fd.set("catalogKey", catalogKey);
              startTransition(async () => {
                const res = await addCatalogLeaveTypeAction(fd);
                if (res && "error" in res) {
                  setError(res.error);
                  toastError("Could not add leave type", res.error);
                } else {
                  toastSuccess("Leave type added to your company");
                  setCatalogKey("");
                }
              });
            }}
          >
            <div className="space-y-1">
              <Label htmlFor="catalog-leave">Add leave type for this company</Label>
              <Select
                id="catalog-leave"
                value={catalogKey}
                onChange={(e) => setCatalogKey(e.target.value)}
              >
                <option value="">Choose from catalog…</option>
                {availableCatalog.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.code} · {p.name}
                    {p.scope === "employee" ? " (per employee)" : ` (${p.defaultDays}d)`}
                  </option>
                ))}
              </Select>
              {catalogKey ? (
                <p className="text-xs text-[var(--muted-foreground)]">
                  {availableCatalog.find((p) => p.key === catalogKey)?.description}
                </p>
              ) : (
                <p className="text-xs text-[var(--muted-foreground)]">
                  Only selected types will appear for employees and payroll.
                </p>
              )}
            </div>
            <Button type="submit" disabled={pending || !catalogKey}>
              {pending ? "Adding…" : "Add to company"}
            </Button>
            {error ? (
              <p className="text-sm font-semibold text-[var(--destructive)] sm:col-span-2">
                {error}
              </p>
            ) : null}
          </form>
        ) : (
          <p className="text-sm text-[var(--muted-foreground)]">
            All standard leave types are already enabled. You can still add a custom
            type below.
          </p>
        )}

        <div className="space-y-3">
          <p className="text-sm font-black">Configure enabled types</p>
          {enabled.map((type) => (
            <LeaveTypeEditor key={type.id} type={type} />
          ))}
        </div>

        <div className="border-t-2 border-[var(--border)]/40 pt-4">
          <button
            type="button"
            className="text-sm font-bold underline"
            onClick={() => setShowCustom((v) => !v)}
          >
            {showCustom ? "Hide custom leave type" : "Add a custom leave type"}
          </button>
          {showCustom ? (
            <form
              className="mt-3 grid gap-3 rounded-xl border-2 border-dashed border-[var(--border)] p-4 sm:grid-cols-2 lg:grid-cols-4"
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
                    toastSuccess("Custom leave type added");
                    form.reset();
                    setShowCustom(false);
                  }
                });
              }}
            >
              <p className="text-sm font-bold sm:col-span-2 lg:col-span-4">
                Custom leave type
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
              <div className="flex items-end">
                <Button type="submit" disabled={pending}>
                  {pending ? "Adding…" : "Add custom"}
                </Button>
              </div>
            </form>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
