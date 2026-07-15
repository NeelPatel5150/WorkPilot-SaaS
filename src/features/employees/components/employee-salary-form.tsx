"use client";

import { useState, useTransition } from "react";
import { adjustEmployeeSalaryAction } from "@/features/shared/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toastError, toastSuccess } from "@/store/toast";

function formatMoney(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "Not set";
  return n.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}

export function EmployeeSalaryForm({
  employeeId,
  basicSalary,
}: {
  employeeId: string;
  basicSalary: number | null;
}) {
  const [pending, startTransition] = useTransition();
  const [current, setCurrent] = useState(basicSalary);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Salary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border-2 border-[var(--border)] bg-[var(--secondary)]/40 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
            Current basic
          </p>
          <p className="text-2xl font-black">{formatMoney(current)}</p>
        </div>

        <form
          className="grid gap-3 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            fd.set("employeeId", employeeId);
            startTransition(async () => {
              const res = await adjustEmployeeSalaryAction(fd);
              if (res && "error" in res) toastError("Salary update failed", res.error);
              else if (res && "next" in res) {
                setCurrent(res.next);
                toastSuccess("Salary updated", formatMoney(res.next));
              }
            });
          }}
        >
          <div className="space-y-1">
            <Label>Action</Label>
            <Select name="mode" defaultValue="set">
              <option value="set">Set exact amount</option>
              <option value="increment">Increment (+)</option>
              <option value="decrement">Decrement (-)</option>
            </Select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Amount (INR)</Label>
            <Input
              name="amount"
              type="number"
              min="0"
              step="1"
              required
              placeholder="e.g. 5000"
              defaultValue={basicSalary ?? ""}
            />
          </div>
          <div className="sm:col-span-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Updating…" : "Update salary"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
