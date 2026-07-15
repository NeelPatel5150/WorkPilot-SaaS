"use client";

import { useMemo, useState, useTransition } from "react";
import { createTaskAction, deleteTaskAction } from "@/features/shared/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toastError, toastSuccess } from "@/store/toast";
import { formatDate } from "@/lib/utils";
import {
  TaskCompletedDuration,
  TaskElapsedTimer,
} from "@/features/tasks/components/task-timers";

type EmployeeOption = {
  id: string;
  label: string;
};

type AssigneeRow = {
  id: string;
  status: string;
  startedAt: Date | string | null;
  completedAt: Date | string | null;
  createdAt: Date | string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
  };
};

export type AdminTaskRow = {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date | string | null;
  priority: string;
  workType: string;
  boardStatus?: string;
  createdAt: Date | string;
  createdBy: { id: string; name: string };
  assignees: AssigneeRow[];
};

const WORK_TYPE_LABEL: Record<string, string> = {
  WORK: "Work",
  FOLLOW_UP: "Follow-up",
  DOCUMENT: "Document",
  OTHER: "Other",
};

function statusCounts(assignees: AssigneeRow[]) {
  const done = assignees.filter((a) => a.status === "DONE").length;
  const progress = assignees.filter((a) => a.status === "IN_PROGRESS").length;
  const todo = assignees.filter((a) => a.status === "TODO").length;
  return { done, progress, todo, total: assignees.length };
}

export function CreateTaskForm({ employees }: { employees: EmployeeOption[] }) {
  const [pending, startTransition] = useTransition();
  const [assignMode, setAssignMode] = useState<"all" | "selected">("selected");
  const [selected, setSelected] = useState<string[]>([]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assign task</CardTitle>
        <CardDescription>
          Create a task and assign it to one person, several people, or everyone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fd = new FormData(form);
            fd.set("assignMode", assignMode);
            fd.delete("employeeIds");
            if (assignMode === "selected") {
              for (const id of selected) fd.append("employeeIds", id);
            }
            startTransition(async () => {
              const res = await createTaskAction(fd);
              if (res && "error" in res) {
                toastError("Task not created", res.error);
                return;
              }
              toastSuccess("Task assigned", "People were notified.");
              form.reset();
              setSelected([]);
              setAssignMode("selected");
            });
          }}
        >
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              name="title"
              required
              placeholder="e.g. Submit timesheet for this week"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="task-desc">Description (optional)</Label>
            <Textarea
              id="task-desc"
              name="description"
              rows={3}
              placeholder="Any details the team needs…"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="task-due">Due date</Label>
            <Input id="task-due" name="dueDate" type="date" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="task-priority">Priority</Label>
            <Select id="task-priority" name="priority" defaultValue="MEDIUM">
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="task-type">Work type</Label>
            <Select id="task-type" name="workType" defaultValue="WORK">
              <option value="WORK">Work</option>
              <option value="FOLLOW_UP">Follow-up</option>
              <option value="DOCUMENT">Document</option>
              <option value="OTHER">Other</option>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="assign-mode">Assign to</Label>
            <Select
              id="assign-mode"
              value={assignMode}
              onChange={(e) =>
                setAssignMode(e.target.value === "all" ? "all" : "selected")
              }
            >
              <option value="selected">Selected employees</option>
              <option value="all">All employees</option>
            </Select>
          </div>

          {assignMode === "selected" ? (
            <div className="space-y-2 sm:col-span-2">
              <Label>Employees</Label>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border-2 border-[var(--border)] p-3">
                {employees.length === 0 ? (
                  <p className="text-sm text-[var(--muted-foreground)]">
                    No active employees to assign.
                  </p>
                ) : (
                  employees.map((emp) => {
                    const checked = selected.includes(emp.id);
                    return (
                      <label
                        key={emp.id}
                        className="flex cursor-pointer items-center gap-2 text-sm font-semibold"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-[var(--primary)]"
                          checked={checked}
                          onChange={() => {
                            setSelected((prev) =>
                              checked
                                ? prev.filter((id) => id !== emp.id)
                                : [...prev, emp.id]
                            );
                          }}
                        />
                        {emp.label}
                      </label>
                    );
                  })
                )}
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">
                {selected.length} selected
              </p>
            </div>
          ) : (
            <p className="sm:col-span-2 text-sm text-[var(--muted-foreground)]">
              This will assign the task to every active employee (admins are
              excluded).
            </p>
          )}

          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Assigning…" : "Create & assign"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function AdminTaskList({ tasks }: { tasks: AdminTaskRow[] }) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<"ALL" | "OPEN" | "DONE">("ALL");

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      const { done, total } = statusCounts(t.assignees);
      if (filter === "DONE") return total > 0 && done === total;
      if (filter === "OPEN") return total === 0 || done < total;
      return true;
    });
  }, [tasks, filter]);

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-[var(--muted-foreground)]">
          No tasks yet. Create one above.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["ALL", "All"],
            ["OPEN", "Open"],
            ["DONE", "Completed"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-lg border-2 border-[var(--border)] px-3 py-1 text-xs font-black ${
              filter === value
                ? "bg-[var(--primary)] text-white"
                : "bg-white text-[var(--foreground)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.map((task) => {
        const counts = statusCounts(task.assignees);
        return (
          <Card key={task.id}>
            <CardHeader className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">{task.title}</CardTitle>
                  <Badge>{WORK_TYPE_LABEL[task.workType] ?? task.workType}</Badge>
                  <Badge
                    className={
                      task.priority === "HIGH"
                        ? "border-red-600 bg-red-50 text-red-800"
                        : task.priority === "LOW"
                          ? "border-stone-400 bg-stone-50 text-stone-700"
                          : undefined
                    }
                  >
                    {task.priority}
                  </Badge>
                </div>
                {task.description ? (
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    {task.description}
                  </p>
                ) : null}
                <p className="mt-2 text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
                  By {task.createdBy.name}
                  {task.dueDate ? ` · Due ${formatDate(task.dueDate)}` : ""}
                  {` · ${counts.done}/${counts.total} done`}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending && pendingId === task.id}
                onClick={() => {
                  setPendingId(task.id);
                  startTransition(async () => {
                    const res = await deleteTaskAction(task.id);
                    if (res && "error" in res) toastError("Delete failed", res.error);
                    else toastSuccess("Task deleted");
                    setPendingId(null);
                  });
                }}
              >
                Delete
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-xl border-2 border-[var(--border)]">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead className="border-b-2 border-[var(--border)] bg-[var(--secondary)]/40 text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
                    <tr>
                      <th className="px-3 py-2">Employee</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {task.assignees.map((a) => (
                      <tr
                        key={a.id}
                        className="border-b border-[var(--border)] last:border-0"
                      >
                        <td className="px-3 py-2 font-semibold">
                          {a.employee.firstName} {a.employee.lastName}
                          <span className="ml-1 text-xs text-[var(--muted-foreground)]">
                            ({a.employee.employeeCode})
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <Badge
                            className={
                              a.status === "DONE"
                                ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                                : a.status === "IN_PROGRESS"
                                  ? "border-amber-600 bg-amber-50 text-amber-900"
                                  : undefined
                            }
                          >
                            {a.status.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-sm">
                          {a.status === "DONE" ? (
                            <TaskCompletedDuration
                              startedAt={a.startedAt}
                              completedAt={a.completedAt}
                              createdAt={a.createdAt}
                            />
                          ) : a.status === "IN_PROGRESS" ? (
                            <TaskElapsedTimer startedAt={a.startedAt} running />
                          ) : (
                            <span className="text-[var(--muted-foreground)]">Not started</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
