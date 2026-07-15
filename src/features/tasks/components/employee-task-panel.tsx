"use client";

import { useMemo, useState, useTransition } from "react";
import { updateMyTaskStatusAction } from "@/features/shared/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toastError, toastSuccess } from "@/store/toast";
import { formatDate } from "@/lib/utils";
import {
  TaskCompletedDuration,
  TaskDueCountdown,
  TaskElapsedTimer,
} from "@/features/tasks/components/task-timers";

export type MyTaskRow = {
  id: string;
  status: string;
  note: string | null;
  startedAt: Date | string | null;
  completedAt: Date | string | null;
  createdAt: Date | string;
  task: {
    id: string;
    title: string;
    description: string | null;
    dueDate: Date | string | null;
    priority: string;
    workType: string;
    createdBy: { name: string };
  };
};

const WORK_TYPE_LABEL: Record<string, string> = {
  WORK: "Work",
  FOLLOW_UP: "Follow-up",
  DOCUMENT: "Document",
  OTHER: "Other",
};

export function EmployeeTaskPanel({ items }: { items: MyTaskRow[] }) {
  const [tab, setTab] = useState<"active" | "done">("active");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const active = useMemo(
    () => items.filter((i) => i.status !== "DONE"),
    [items]
  );
  const done = useMemo(
    () => items.filter((i) => i.status === "DONE"),
    [items]
  );
  const list = tab === "active" ? active : done;

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
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab("active")}
          className={`rounded-lg border-2 border-[var(--border)] px-3 py-1.5 text-xs font-black ${
            tab === "active"
              ? "bg-[var(--primary)] text-white"
              : "bg-white text-[var(--foreground)]"
          }`}
        >
          My tasks ({active.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("done")}
          className={`rounded-lg border-2 border-[var(--border)] px-3 py-1.5 text-xs font-black ${
            tab === "done"
              ? "bg-[var(--primary)] text-white"
              : "bg-white text-[var(--foreground)]"
          }`}
        >
          Completed ({done.length})
        </button>
      </div>

      {list.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-[var(--muted-foreground)]">
            {tab === "active"
              ? "No open tasks. You’re all caught up."
              : "No completed tasks yet."}
          </CardContent>
        </Card>
      ) : (
        list.map((row) => (
          <Card key={row.id}>
            <CardHeader className="mb-2">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base">{row.task.title}</CardTitle>
                <Badge>
                  {WORK_TYPE_LABEL[row.task.workType] ?? row.task.workType}
                </Badge>
                <Badge
                  className={
                    row.task.priority === "HIGH"
                      ? "border-red-600 bg-red-50 text-red-800"
                      : undefined
                  }
                >
                  {row.task.priority}
                </Badge>
                <Badge
                  className={
                    row.status === "DONE"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                      : row.status === "IN_PROGRESS"
                        ? "border-amber-600 bg-amber-50 text-amber-900"
                        : undefined
                  }
                >
                  {row.status.replace(/_/g, " ")}
                </Badge>
              </div>
              {row.task.description ? (
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  {row.task.description}
                </p>
              ) : null}
              <p className="mt-2 text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
                From {row.task.createdBy.name}
                {row.task.dueDate ? ` · Due ${formatDate(row.task.dueDate)}` : ""}
              </p>
              <div className="mt-2 space-y-1">
                {row.status !== "DONE" ? (
                  <TaskDueCountdown dueDate={row.task.dueDate} />
                ) : null}
                {row.status === "IN_PROGRESS" || row.status === "IN_REVIEW" ? (
                  <TaskElapsedTimer startedAt={row.startedAt} running />
                ) : null}
                {row.status === "DONE" ? (
                  <p className="text-xs font-black uppercase tracking-wide text-[var(--muted-foreground)]">
                    Completed in{" "}
                    <TaskCompletedDuration
                      startedAt={row.startedAt}
                      completedAt={row.completedAt}
                      createdAt={row.createdAt}
                    />
                  </p>
                ) : null}
              </div>
            </CardHeader>
            {tab === "active" ? (
              <CardContent className="flex flex-wrap gap-2">
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
                {row.status === "IN_PROGRESS" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending && pendingId === row.id}
                    onClick={() => setStatus(row.id, "IN_REVIEW")}
                  >
                    Send to review
                  </Button>
                ) : null}
                {row.status !== "DONE" ? (
                  <Button
                    size="sm"
                    disabled={pending && pendingId === row.id}
                    onClick={() => setStatus(row.id, "DONE")}
                  >
                    Mark done
                  </Button>
                ) : null}
              </CardContent>
            ) : null}
          </Card>
        ))
      )}
    </div>
  );
}
