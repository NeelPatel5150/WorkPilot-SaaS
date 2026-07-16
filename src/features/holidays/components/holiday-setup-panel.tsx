"use client";

import { useState, useTransition } from "react";
import { importHolidaysAction } from "@/features/shared/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toastError, toastSuccess } from "@/store/toast";
import { listIndiaHolidayPacks } from "@/lib/india-holiday-packs";

type Mode = "manual" | "csv" | "sheet" | "pack";

export function HolidaySetupPanel({
  onDone,
  onSkip,
  onBack,
  compact = false,
}: {
  onDone?: () => void;
  onSkip?: () => void;
  onBack?: () => void;
  compact?: boolean;
}) {
  const [mode, setMode] = useState<Mode>("pack");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [manualRows, setManualRows] = useState([{ name: "", date: "" }]);
  const packs = listIndiaHolidayPacks();

  function holidayImportMessage(res: {
    imported?: number;
    skipped?: number;
    alreadyPresent?: boolean;
  }) {
    if (res.alreadyPresent || (res.imported === 0 && (res.skipped ?? 0) > 0)) {
      return {
        title: "Holidays already on calendar",
        body: "Those dates were already added — you can continue setup.",
      };
    }
    return {
      title: "Holidays imported",
      body: `${res.imported ?? 0} holiday(s) added`,
    };
  }

  function addManualRow() {
    setManualRows((rows) => [...rows, { name: "", date: "" }]);
  }

  return (
    <div className="mt-5 space-y-4">
      {!compact ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          Add company holidays so employees see them and cannot apply leave on those days.
          Pick a state pack, import CSV / Google Sheet, enter manually, or skip.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "pack", label: "India packs" },
            { id: "manual", label: "Enter manually" },
            { id: "csv", label: "CSV upload / paste" },
            { id: "sheet", label: "Google Sheet" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setMode(tab.id);
              setError(null);
            }}
            className={`rounded-full border-2 border-[var(--border)] px-3 py-1 text-xs font-black shadow-[2px_2px_0_0_var(--border)] ${
              mode === tab.id
                ? "bg-[var(--primary)] text-white"
                : "bg-white text-[var(--foreground)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {mode === "pack" ? (
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {packs.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={pending}
                className="rounded-xl border-2 border-[var(--border)] bg-white p-3 text-left shadow-[3px_3px_0_0_var(--border)] hover:bg-[var(--secondary)]/40"
                onClick={() => {
                  setError(null);
                  const fd = new FormData();
                  fd.set("packId", p.id);
                  startTransition(async () => {
                    const res = await importHolidaysAction(fd);
                    if (res && "error" in res) {
                      setError(res.error);
                      toastError("Import failed", res.error);
                      return;
                    }
                    const msg = holidayImportMessage(res ?? {});
                    toastSuccess(msg.title, msg.body);
                    onDone?.();
                  });
                }}
              >
                <p className="font-black">{p.label}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{p.description}</p>
                <p className="mt-1 text-xs font-semibold">{p.holidays.length} dates</p>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {onBack ? (
              <Button type="button" variant="outline" onClick={onBack} disabled={pending}>
                Back
              </Button>
            ) : null}
            {onSkip ? (
              <Button type="button" variant="secondary" onClick={onSkip} disabled={pending}>
                Skip holidays
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {mode === "manual" ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const rows = manualRows
              .map((r) => ({ name: r.name.trim(), date: r.date.trim() }))
              .filter((r) => r.name && r.date);
            if (rows.length === 0) {
              setError("Add at least one holiday name and date");
              return;
            }
            startTransition(async () => {
              const csv = ["name,date", ...rows.map((r) => `${r.name},${r.date}`)].join(
                "\n"
              );
              const fd = new FormData();
              fd.set("csvText", csv);
              const res = await importHolidaysAction(fd);
              if (res && "error" in res) {
                setError(res.error);
                toastError("Could not save holidays", res.error);
                return;
              }
              const msg = holidayImportMessage(res ?? {});
              toastSuccess(msg.title, msg.body);
              onDone?.();
            });
          }}
        >
          <div className="space-y-2">
            {manualRows.map((row, idx) => (
              <div key={idx} className="grid gap-2 sm:grid-cols-2">
                <Input
                  placeholder="Enter holiday name"
                  value={row.name}
                  onChange={(e) =>
                    setManualRows((rows) =>
                      rows.map((r, i) =>
                        i === idx ? { ...r, name: e.target.value } : r
                      )
                    )
                  }
                />
                <Input
                  type="date"
                  value={row.date}
                  onChange={(e) =>
                    setManualRows((rows) =>
                      rows.map((r, i) =>
                        i === idx ? { ...r, date: e.target.value } : r
                      )
                    )
                  }
                />
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addManualRow}>
            Add another holiday
          </Button>
          <div className="flex flex-wrap gap-2 pt-1">
            {onBack ? (
              <Button type="button" variant="outline" disabled={pending} onClick={onBack}>
                Back
              </Button>
            ) : null}
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save holidays & continue"}
            </Button>
            {onSkip ? (
              <Button type="button" variant="secondary" disabled={pending} onClick={onSkip}>
                Skip for now
              </Button>
            ) : null}
          </div>
        </form>
      ) : null}

      {mode === "csv" ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              const res = await importHolidaysAction(fd);
              if (res && "error" in res) {
                setError(res.error);
                toastError("Import failed", res.error);
                return;
              }
              const msg = holidayImportMessage(res ?? {});
              toastSuccess(msg.title, msg.body);
              onDone?.();
            });
          }}
        >
          <div className="space-y-1">
            <Label>Upload CSV</Label>
            <Input name="csvFile" type="file" accept=".csv,text/csv,text/plain" />
            <p className="text-xs text-[var(--muted-foreground)]">
              Columns: <code className="font-mono">name,date</code> (date as YYYY-MM-DD or
              DD/MM/YYYY)
            </p>
          </div>
          <div className="space-y-1">
            <Label>Or paste CSV / sheet cells</Label>
            <Textarea
              name="csvText"
              rows={5}
              placeholder={"name,date\nRepublic Day,2026-01-26\nDiwali,2026-11-08"}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {onBack ? (
              <Button type="button" variant="outline" disabled={pending} onClick={onBack}>
                Back
              </Button>
            ) : null}
            <Button type="submit" disabled={pending}>
              {pending ? "Importing…" : "Import & continue"}
            </Button>
            {onSkip ? (
              <Button type="button" variant="secondary" disabled={pending} onClick={onSkip}>
                Skip for now
              </Button>
            ) : null}
          </div>
        </form>
      ) : null}

      {mode === "sheet" ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              const res = await importHolidaysAction(fd);
              if (res && "error" in res) {
                setError(res.error);
                toastError("Sheet import failed", res.error);
                return;
              }
              const msg = holidayImportMessage(res ?? {});
              toastSuccess(msg.title, msg.body);
              onDone?.();
            });
          }}
        >
          <div className="space-y-1">
            <Label>Google Sheet link</Label>
            <Input
              name="sheetUrl"
              required
              placeholder="Enter Google Sheet URL"
            />
            <p className="text-xs text-[var(--muted-foreground)]">
              Share the sheet as &quot;Anyone with the link&quot; (Viewer). First columns should
              be holiday name and date.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {onBack ? (
              <Button type="button" variant="outline" disabled={pending} onClick={onBack}>
                Back
              </Button>
            ) : null}
            <Button type="submit" disabled={pending}>
              {pending ? "Fetching…" : "Import from sheet & continue"}
            </Button>
            {onSkip ? (
              <Button type="button" variant="secondary" disabled={pending} onClick={onSkip}>
                Skip for now
              </Button>
            ) : null}
          </div>
        </form>
      ) : null}

      {error ? (
        <p className="text-sm font-semibold text-[var(--destructive)]">{error}</p>
      ) : null}
    </div>
  );
}
