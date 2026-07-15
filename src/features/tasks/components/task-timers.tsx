"use client";

import { useEffect, useState } from "react";
import {
  dueEndMs,
  formatDuration,
  completionDurationMs,
} from "@/lib/task-time";

export function TaskDueCountdown({
  dueDate,
}: {
  dueDate: Date | string | null | undefined;
}) {
  const end = dueEndMs(dueDate);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (end == null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [end]);

  if (end == null) return null;

  const remaining = end - now;
  if (remaining <= 0) {
    return (
      <p className="text-xs font-black uppercase tracking-wide text-[var(--destructive)]">
        Overdue
      </p>
    );
  }

  return (
    <p className="text-xs font-black uppercase tracking-wide text-[var(--muted-foreground)]">
      Due in{" "}
      <span className="tabular-nums text-[var(--foreground)]">
        {formatDuration(remaining)}
      </span>
    </p>
  );
}

export function TaskElapsedTimer({
  startedAt,
  running,
}: {
  startedAt: Date | string | null | undefined;
  running: boolean;
}) {
  const start = startedAt ? new Date(startedAt).getTime() : null;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!running || start == null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [running, start]);

  if (start == null || Number.isNaN(start)) return null;

  const elapsed = Math.max(0, (running ? now : now) - start);

  return (
    <p className="text-xs font-black uppercase tracking-wide text-[var(--muted-foreground)]">
      Time{" "}
      <span className="tabular-nums text-[var(--foreground)]">
        {formatDuration(elapsed)}
      </span>
      {running ? " · running" : ""}
    </p>
  );
}

export function TaskCompletedDuration({
  startedAt,
  completedAt,
  createdAt,
}: {
  startedAt?: Date | string | null;
  completedAt?: Date | string | null;
  createdAt?: Date | string | null;
}) {
  const ms = completionDurationMs(startedAt, completedAt, createdAt);
  if (ms == null) return <span className="text-[var(--muted-foreground)]">—</span>;
  return <span className="font-semibold tabular-nums">{formatDuration(ms)}</span>;
}
