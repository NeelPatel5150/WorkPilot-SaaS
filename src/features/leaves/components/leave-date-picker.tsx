"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;
const MONTH_LABEL = new Intl.DateTimeFormat("en-IN", {
  month: "long",
  year: "numeric",
});

function toIso(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function parseIso(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m: m - 1, d };
}

function todayIso() {
  const n = new Date();
  return toIso(n.getFullYear(), n.getMonth(), n.getDate());
}

export function LeaveDatePicker({
  label,
  name,
  value,
  minIso,
  holidayDates,
  weeklyOffs,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  minIso: string;
  holidayDates: string[];
  /** JS weekday numbers: 0=Sun … 6=Sat. Empty = no week offs. */
  weeklyOffs: number[];
  onChange: (iso: string) => void;
}) {
  const min = minIso || todayIso();
  const holidaySet = useMemo(() => new Set(holidayDates), [holidayDates]);
  const offSet = useMemo(() => new Set(weeklyOffs.map(Number)), [weeklyOffs]);

  const initial = value ? parseIso(value) : parseIso(min);
  const [cursor, setCursor] = useState({ y: initial.y, m: initial.m });

  const cells = useMemo(() => {
    const firstDow = new Date(Date.UTC(cursor.y, cursor.m, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(cursor.y, cursor.m + 1, 0)).getUTCDate();
    const grid: ({ iso: string; day: number } | null)[] = [];
    for (let i = 0; i < firstDow; i++) grid.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      grid.push({ iso: toIso(cursor.y, cursor.m, d), day: d });
    }
    return grid;
  }, [cursor]);

  function reasonDisabled(iso: string): string | null {
    if (iso < min) return "Past date";
    const dow = new Date(`${iso}T00:00:00.000Z`).getUTCDay();
    if (offSet.has(dow)) return "Weekly off";
    if (holidaySet.has(iso)) return "Holiday";
    return null;
  }

  function shiftMonth(delta: number) {
    setCursor((c) => {
      const dt = new Date(Date.UTC(c.y, c.m + delta, 1));
      return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() };
    });
  }

  return (
    <div className="space-y-1">
      <p className="text-sm font-bold">{label}</p>
      <input type="hidden" name={name} value={value} required />
      <div className="rounded-xl border-2 border-[var(--border)] bg-white p-3 shadow-[3px_3px_0_0_var(--border)]">
        <div className="mb-2 flex items-center justify-between gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => shiftMonth(-1)}>
            Prev
          </Button>
          <p className="text-sm font-black">
            {MONTH_LABEL.format(new Date(Date.UTC(cursor.y, cursor.m, 1)))}
          </p>
          <Button type="button" size="sm" variant="outline" onClick={() => shiftMonth(1)}>
            Next
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-[var(--muted-foreground)]">
          {WEEKDAY_LABELS.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((cell, idx) => {
            if (!cell) return <span key={`e-${idx}`} />;
            const why = reasonDisabled(cell.iso);
            const selected = value === cell.iso;
            const isOff = why === "Weekly off";
            const isHoliday = why === "Holiday";
            const disabled = !!why;
            return (
              <button
                key={cell.iso}
                type="button"
                disabled={disabled}
                title={why ?? undefined}
                onClick={() => onChange(cell.iso)}
                className={cn(
                  "h-8 rounded-lg border text-xs font-bold transition-colors",
                  selected &&
                    "border-[var(--border)] bg-[var(--primary)] text-white shadow-[2px_2px_0_0_var(--border)]",
                  !selected &&
                    !disabled &&
                    "border-transparent hover:border-[var(--border)] hover:bg-[var(--secondary)]",
                  disabled && "cursor-not-allowed border-transparent opacity-35",
                  isOff && !selected && "bg-[var(--muted)] line-through",
                  isHoliday && !selected && "bg-[color-mix(in_srgb,var(--warning)_25%,white)]"
                )}
              >
                {cell.day}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[10px] text-[var(--muted-foreground)]">
          {value ? `Selected: ${value}` : "Pick a date"}
          {offSet.size > 0
            ? " · Week offs & holidays are blocked"
            : " · Holidays are blocked (no week offs set)"}
        </p>
      </div>
    </div>
  );
}
