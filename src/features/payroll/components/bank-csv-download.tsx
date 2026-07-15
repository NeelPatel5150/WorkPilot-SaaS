"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toastError, toastSuccess } from "@/store/toast";

export function BankCsvDownload({ year, month }: { year: number; month: number }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          try {
            const res = await fetch(
              `/api/payroll/bank-csv?year=${year}&month=${month}`
            );
            if (!res.ok) {
              const text = await res.text();
              toastError("Bank CSV failed", text || res.statusText);
              return;
            }
            const blob = await res.blob();
            const cd = res.headers.get("Content-Disposition") || "";
            const match = cd.match(/filename="?([^"]+)"?/);
            const filename =
              match?.[1] ||
              `bank-salary-${year}-${String(month).padStart(2, "0")}.csv`;
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            toastSuccess("Downloaded", "Bank salary CSV for published/locked slips.");
          } catch (e) {
            toastError(
              "Bank CSV failed",
              e instanceof Error ? e.message : "Download failed"
            );
          }
        });
      }}
    >
      {pending ? "Preparing…" : "Download bank CSV"}
    </Button>
  );
}
