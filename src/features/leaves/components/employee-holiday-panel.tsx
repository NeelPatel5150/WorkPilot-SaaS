"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export type HolidayItem = {
  id: string;
  name: string;
  date: string | Date;
};

export function EmployeeHolidayPanel({ holidays }: { holidays: HolidayItem[] }) {
  const [open, setOpen] = useState(false);
  const upcoming = holidays.filter((h) => {
    const d = new Date(h.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d >= today;
  });
  const past = holidays.filter((h) => {
    const d = new Date(h.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
  });

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        View holiday list
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Company holiday list"
          onClick={() => setOpen(false)}
        >
          <Card
            className="max-h-[85vh] w-full max-w-lg overflow-hidden shadow-[8px_8px_0_0_var(--border)]"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle>Company holidays</CardTitle>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  You cannot apply leave on these dates.
                </p>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
            </CardHeader>
            <CardContent className="max-h-[60vh] space-y-4 overflow-y-auto">
              {holidays.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">
                  No holidays published yet. Ask HR if a day off is missing.
                </p>
              ) : (
                <>
                  <section>
                    <p className="mb-2 text-xs font-black uppercase tracking-wide text-[var(--muted-foreground)]">
                      Upcoming ({upcoming.length})
                    </p>
                    {upcoming.length === 0 ? (
                      <p className="text-sm text-[var(--muted-foreground)]">No upcoming holidays.</p>
                    ) : (
                      <ul className="space-y-2">
                        {upcoming.map((h) => (
                          <li
                            key={h.id}
                            className="flex items-center justify-between gap-3 rounded-xl border-2 border-[var(--border)] bg-[color-mix(in_srgb,var(--warning)_12%,white)] px-3 py-2"
                          >
                            <span className="font-bold">{h.name}</span>
                            <span className="shrink-0 text-sm font-semibold">
                              {formatDate(h.date)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                  {past.length > 0 ? (
                    <section>
                      <p className="mb-2 text-xs font-black uppercase tracking-wide text-[var(--muted-foreground)]">
                        Earlier this year ({past.length})
                      </p>
                      <ul className="space-y-2 opacity-70">
                        {past.map((h) => (
                          <li
                            key={h.id}
                            className="flex items-center justify-between gap-3 rounded-xl border-2 border-dashed border-[var(--border)] px-3 py-2"
                          >
                            <span className="font-semibold">{h.name}</span>
                            <span className="shrink-0 text-sm">{formatDate(h.date)}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  );
}
