type AuditLog = {
  id: string;
  action: string;
  metadata: unknown;
  createdAt: Date;
  user?: { name: string | null; email: string | null } | null;
};

function formatTs(date: Date) {
  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatMeta(metadata: unknown) {
  if (metadata == null) return null;
  try {
    return JSON.stringify(metadata);
  } catch {
    return String(metadata);
  }
}

export function AuditLogCard({ logs }: { logs: AuditLog[] }) {
  return (
    <div className="overflow-hidden rounded-xl border-2 border-[var(--border)] shadow-[6px_6px_0_0_var(--border)]">
      <div className="flex items-center gap-2 border-b-2 border-[var(--border)] bg-[#1a1b26] px-4 py-2.5">
        <span className="h-3 w-3 rounded-full bg-[#ff5f56]" aria-hidden />
        <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" aria-hidden />
        <span className="h-3 w-3 rounded-full bg-[#27c93f]" aria-hidden />
        <p className="ml-2 font-mono text-xs font-bold tracking-wide text-[#a9b1d6]">
          audit.log · company workspace
        </p>
      </div>

      <div className="max-h-[420px] overflow-y-auto bg-[#0d1117] p-4 font-mono text-[12px] leading-relaxed text-[#c9d1d9] sm:text-[13px]">
        <p className="mb-3 text-[#7ee787]">
          <span className="text-[#79c0ff]">$</span> tail -n {logs.length || 0}{" "}
          ./audit.log
        </p>

        {logs.length === 0 ? (
          <p className="text-[#8b949e]">
            # no activity yet. actions will stream here
            <span className="ml-1 inline-block h-3.5 w-2 animate-pulse bg-[#7ee787] align-middle" />
          </p>
        ) : (
          <ul className="space-y-2.5">
            {logs.map((log, i) => {
              const actor = log.user?.name ?? log.user?.email ?? "system";
              const meta = formatMeta(log.metadata);
              return (
                <li key={log.id} className="break-words">
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                    <span className="shrink-0 text-[#8b949e]">
                      [{String(logs.length - i).padStart(3, "0")}]
                    </span>
                    <span className="shrink-0 text-[#79c0ff]">
                      {formatTs(log.createdAt)}
                    </span>
                    <span className="shrink-0 text-[#d2a8ff]">{actor}</span>
                    <span className="text-[#ffa657]">{log.action}</span>
                  </div>
                  {meta ? (
                    <p className="mt-0.5 pl-8 text-[#8b949e] sm:pl-12">
                      └─ {meta}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-4 text-[#7ee787]">
          <span className="text-[#79c0ff]">$</span>{" "}
          <span className="inline-block h-3.5 w-2 animate-pulse bg-[#7ee787] align-middle" />
        </p>
      </div>
    </div>
  );
}
