/** Format duration in ms as human-readable (e.g. 1h 12m 05s). */
export function formatDuration(ms: number) {
  if (!Number.isFinite(ms) || ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  }
  if (m > 0) {
    return `${m}m ${String(s).padStart(2, "0")}s`;
  }
  return `${s}s`;
}

export function completionDurationMs(
  startedAt: Date | string | null | undefined,
  completedAt: Date | string | null | undefined,
  createdAt?: Date | string | null
) {
  const end = completedAt ? new Date(completedAt).getTime() : null;
  const start = startedAt
    ? new Date(startedAt).getTime()
    : createdAt
      ? new Date(createdAt).getTime()
      : null;
  if (end == null || start == null || Number.isNaN(end) || Number.isNaN(start)) {
    return null;
  }
  return Math.max(0, end - start);
}

/** End of due day (UTC date from DB) for countdown. */
export function dueEndMs(dueDate: Date | string | null | undefined) {
  if (!dueDate) return null;
  const d = new Date(dueDate);
  if (Number.isNaN(d.getTime())) return null;
  // dueDate is stored as date-only; treat as end of that UTC day
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999);
}
