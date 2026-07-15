"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { updateEmployeeLeaveBalanceAction } from "@/features/shared/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toastError, toastSuccess } from "@/store/toast";

type BalanceRow = {
  id: string;
  leaveTypeId: string;
  allocated: number;
  used: number;
  remaining: number;
  leaveType: { name: string; code: string | null };
  hasRecord: boolean;
};

export function EmployeeLeaveBalancesForm({
  employeeId,
  year,
  balances,
}: {
  employeeId: string;
  year: number;
  balances: BalanceRow[];
}) {
  const [pending, startTransition] = useTransition();
  const [leaveTypeId, setLeaveTypeId] = useState(balances[0]?.leaveTypeId ?? "");
  const [allocatedDraft, setAllocatedDraft] = useState(
    String(balances[0]?.allocated ?? 0)
  );

  const selected = useMemo(
    () => balances.find((b) => b.leaveTypeId === leaveTypeId) ?? null,
    [balances, leaveTypeId]
  );

  useEffect(() => {
    if (!leaveTypeId && balances[0]) {
      setLeaveTypeId(balances[0].leaveTypeId);
      setAllocatedDraft(String(balances[0].allocated));
      return;
    }
    const row = balances.find((b) => b.leaveTypeId === leaveTypeId);
    if (row) setAllocatedDraft(String(row.allocated));
  }, [balances, leaveTypeId]);

  const used = selected?.used ?? 0;
  const allocatedNum = Number(allocatedDraft);
  const remaining = Number.isFinite(allocatedNum)
    ? Math.max(0, allocatedNum - used)
    : selected?.remaining ?? 0;

  function selectType(id: string) {
    setLeaveTypeId(id);
    const row = balances.find((b) => b.leaveTypeId === id);
    setAllocatedDraft(String(row?.allocated ?? 0));
  }

  if (balances.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leave balance ({year})</CardTitle>
          <CardDescription>
            No leave types are enabled yet. Add them under Admin → Settings.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leave balance ({year})</CardTitle>
        <CardDescription>
          Choose a leave type, set the yearly total only. Used days come from approved
          requests; balance is total minus used.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="overflow-x-auto rounded-xl border-2 border-[var(--border)]">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="border-b-2 border-[var(--border)] bg-[var(--secondary)]/50 text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr>
                <th className="px-3 py-2">Leave</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-right">Used</th>
                <th className="px-3 py-2 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {balances.map((b) => (
                <tr
                  key={b.leaveTypeId}
                  className="border-b border-[var(--border)] last:border-0"
                >
                  <td className="px-3 py-2.5 font-semibold">
                    {b.leaveType.name}
                    {b.leaveType.code ? (
                      <span className="ml-1.5 text-xs font-bold text-[var(--muted-foreground)]">
                        {b.leaveType.code}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{b.allocated}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-[var(--muted-foreground)]">
                    {b.used}
                  </td>
                  <td className="px-3 py-2.5 text-right font-black tabular-nums">
                    {b.remaining}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form
          className="grid items-end gap-3 sm:grid-cols-[1.4fr_0.8fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            if (!selected) return;
            const fd = new FormData();
            fd.set("employeeId", employeeId);
            fd.set("leaveTypeId", selected.leaveTypeId);
            fd.set("year", String(year));
            fd.set("allocated", allocatedDraft);
            startTransition(async () => {
              const res = await updateEmployeeLeaveBalanceAction(fd);
              if (res && "error" in res) {
                toastError("Leave update failed", res.error);
              } else {
                toastSuccess(
                  "Saved",
                  `${selected.leaveType.name}: total ${allocatedDraft}, balance ${remaining}`
                );
              }
            });
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="leave-type">Leave type</Label>
            <Select
              id="leave-type"
              value={leaveTypeId}
              onChange={(e) => selectType(e.target.value)}
            >
              {balances.map((b) => (
                <option key={b.leaveTypeId} value={b.leaveTypeId}>
                  {b.leaveType.name}
                  {b.leaveType.code ? ` (${b.leaveType.code})` : ""}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="leave-allocated">Edit total only</Label>
            <Input
              id="leave-allocated"
              name="allocated"
              type="number"
              min={used}
              step="0.5"
              required
              value={allocatedDraft}
              onChange={(e) => setAllocatedDraft(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={pending || !selected}>
            {pending ? "Saving…" : "Save total"}
          </Button>
        </form>

        {selected ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            <span className="font-bold text-[var(--foreground)]">
              {selected.leaveType.name}:
            </span>{" "}
            total{" "}
            <span className="font-semibold text-[var(--foreground)] tabular-nums">
              {Number.isFinite(allocatedNum) ? allocatedNum : selected.allocated}
            </span>
            {" − "}
            used{" "}
            <span className="font-semibold text-[var(--foreground)] tabular-nums">{used}</span>
            {" = "}
            balance{" "}
            <span className="font-black text-[var(--foreground)] tabular-nums">{remaining}</span>
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
