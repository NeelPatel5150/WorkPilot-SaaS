"use client";

import { useState, useTransition } from "react";
import {
  publishSlipAction,
  lockPayrollMonthAction,
  updateSalarySlipAction,
} from "@/features/shared/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toastError, toastSuccess } from "@/store/toast";

type Slip = {
  id: string;
  status: string;
  basic: number;
  allowances: number;
  deductions: number;
  pf: number;
  esi: number;
  tds: number;
  lopDays: number;
  netPay: number;
  year: number;
  month: number;
};

export function PayrollSlipActions({ slip }: { slip: Slip }) {
  const [edit, setEdit] = useState(false);
  const [pending, startTransition] = useTransition();
  const monthVal = `${slip.year}-${String(slip.month).padStart(2, "0")}`;
  const locked = slip.status === "LOCKED";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={`/api/payslips/${slip.id}/print`}
        target="_blank"
        rel="noreferrer"
        className="text-xs font-bold underline"
      >
        PDF / Print
      </a>
      {slip.status === "DRAFT" ? (
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await publishSlipAction(slip.id);
              if (res && "error" in res) toastError("Publish failed", res.error);
              else toastSuccess("Published", "Employee notified.");
            })
          }
        >
          Publish
        </Button>
      ) : null}
      {!locked ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => setEdit((v) => !v)}
        >
          {edit ? "Close edit" : "Edit"}
        </Button>
      ) : null}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData();
          fd.set("month", monthVal);
          startTransition(async () => {
            const res = await lockPayrollMonthAction(fd);
            if (res && "error" in res) toastError("Lock failed", res.error);
            else toastSuccess("Month locked", "No further edits.");
          });
        }}
      >
        <Button type="submit" size="sm" variant="secondary" disabled={pending || locked}>
          Lock month
        </Button>
      </form>

      {edit && !locked ? (
        <form
          className="mt-2 grid w-full gap-2 rounded-lg border-2 border-[var(--border)] bg-white p-3 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            fd.set("id", slip.id);
            startTransition(async () => {
              const res = await updateSalarySlipAction(fd);
              if (res && "error" in res) toastError("Update failed", res.error);
              else {
                toastSuccess("Slip updated", `Net recalculated.`);
                setEdit(false);
              }
            });
          }}
        >
          {(
            [
              ["basic", "Basic", slip.basic],
              ["allowances", "Allowances", slip.allowances],
              ["deductions", "Deductions", slip.deductions],
              ["pf", "PF", slip.pf],
              ["esi", "ESI", slip.esi],
              ["tds", "TDS", slip.tds],
              ["lopDays", "LOP days", slip.lopDays],
            ] as const
          ).map(([name, label, val]) => (
            <div key={name} className="space-y-1">
              <Label>{label}</Label>
              <Input name={name} type="number" step="0.01" defaultValue={val} />
            </div>
          ))}
          <div className="sm:col-span-3">
            <Button type="submit" size="sm" disabled={pending}>
              Save slip
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
