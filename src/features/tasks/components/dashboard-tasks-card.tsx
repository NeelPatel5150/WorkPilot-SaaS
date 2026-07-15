"use client";

import Link from "next/link";
import { useTransition, useState } from "react";
import { updateMyTaskStatusAction } from "@/features/shared/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toastError, toastSuccess } from "@/store/toast";
import { formatDate } from "@/lib/utils";
import type { MyTaskRow } from "@/features/tasks/components/employee-task-panel";
import {
  TaskDueCountdown,
  TaskElapsedTimer,
} from "@/features/tasks/components/task-timers";

const WORK_TYPE_LABEL: Record<string, string> = {
  WORK: "Work",
  FOLLOW_UP: "Follow-up",
  DOCUMENT: "Document",
  OTHER: "Other",
};

export function DashboardTasksCard({ items }: { items: MyTaskRow[] }) {
  const open = items.filter((i) => i.status !== "DONE").slice(0, 5);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function setStatus(assigneeId: string, status: string) {
    const fd = new FormData();
    fd.set("assigneeId", assigneeId);
    fd.set("status", status);
    setPendingId(assigneeId);
    startTransition(async () => {
      const res = await updateMyTaskStatusAction(fd);
      if (res && "error" in res) toastError("Update failed", res.error);
      else toastSuccess("Updated", status.replace(/_/g, " "));
      setPendingId(null);
    });
  }

  return (
    <Card>
      <CardHeader className="mb-2 flex flex-row items-end justify-between gap-3">
        <div>
          <CardTitle>My tasks</CardTitle>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {open.length === 0
              ? "Nothing open right now"
              : `${open.length} open${items.filter((i) => i.status !== "DONE").length > 5 ? " (showing 5)" : ""}`}
          </p>
        </div>
        <Link href="/employee/workspace" className="text-sm font-bold underline">
          View all
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {open.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            New assignments will show up here.
          </p>
        ) : (
          open.map((row) => (
            <div
              key={row.id}
              className="rounded-xl border-2 border-[var(--border)] p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-black">{row.task.title}</p>
                <Badge>
                  {WORK_TYPE_LABEL[row.task.workType] ?? row.task.workType}
                </Badge>
                <Badge
                  className={
                    row.status === "IN_PROGRESS"
                      ? "border-amber-600 bg-amber-50 text-amber-900"
                      : undefined
                  }
                >
                  {row.status.replace(/_/g, " ")}
                </Badge>
              </div>
              {row.task.dueDate ? (
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
                  Due {formatDate(row.task.dueDate)}
                </p>
              ) : null}
              <div className="mt-1 space-y-0.5">
                <TaskDueCountdown dueDate={row.task.dueDate} />
                {row.status === "IN_PROGRESS" ? (
                  <TaskElapsedTimer startedAt={row.startedAt} running />
                ) : null}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {row.status === "TODO" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending && pendingId === row.id}
                    onClick={() => setStatus(row.id, "IN_PROGRESS")}
                  >
                    Start
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  disabled={pending && pendingId === row.id}
                  onClick={() => setStatus(row.id, "DONE")}
                >
                  Mark done
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
