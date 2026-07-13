"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export type HolidayItem = {
  id: string;
  name: string;
  date: Date | string;
};

export function EmployeeHolidayList({ holidays }: { holidays: HolidayItem[] }) {
  const [open, setOpen] = useState(false);
  const upcoming = holidays;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-black">Company holidays</p>
          <p className="text-xs text-[var(--muted-foreground)]">
            You cannot apply leave on these days
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Hide holiday list" : `View holiday list (${upcoming.length})`}
        </Button>
      </div>

      {open ? (
        <Card className="overflow-hidden border-2 border-[var(--border)] shadow-[4px_4px_0_0_var(--border)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Holiday calendar</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {upcoming.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">
                No upcoming holidays yet. Your admin can add them in Holidays.
              </p>
            ) : (
              <ul className="divide-y-2 divide-[var(--border)]">
                {upcoming.map((h) => {
                  const d = new Date(h.date);
                  const weekday = d.toLocaleDateString("en-IN", { weekday: "short" });
                  return (
                    <li
                      key={h.id}
                      className="flex items-center justify-between gap-3 py-3 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-black">{h.name}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {weekday} · holiday (leave blocked)
                        </p>
                      </div>
                      <span className="shrink-0 rounded-lg border-2 border-[var(--border)] bg-white px-2.5 py-1 text-xs font-bold shadow-[2px_2px_0_0_var(--border)]">
                        {formatDate(d)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
