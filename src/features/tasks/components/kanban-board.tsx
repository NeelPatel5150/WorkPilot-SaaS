"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  createTaskAction,
  deleteTaskAction,
  updateMyTaskStatusAction,
  updateTaskBoardStatusAction,
} from "@/features/shared/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toastError, toastSuccess } from "@/store/toast";
import { cn, formatDate } from "@/lib/utils";
import type { AdminTaskRow } from "@/features/tasks/components/admin-task-panel";
import type { MyTaskRow } from "@/features/tasks/components/employee-task-panel";
import { useWorkspaceLive } from "@/features/tasks/hooks/use-workspace-live";

type EmployeeOption = { id: string; label: string };

const COLUMNS = [
  {
    id: "TODO",
    label: "To-do",
    dot: "bg-violet-500",
    soft: "border-violet-200 bg-violet-50/60",
  },
  {
    id: "IN_PROGRESS",
    label: "In progress",
    dot: "bg-amber-400",
    soft: "border-amber-200 bg-amber-50/60",
  },
  {
    id: "IN_REVIEW",
    label: "In review",
    dot: "bg-sky-500",
    soft: "border-sky-200 bg-sky-50/50",
  },
  {
    id: "DONE",
    label: "Complete",
    dot: "bg-emerald-500",
    soft: "border-emerald-200 bg-emerald-50/50",
  },
] as const;

type ColumnId = (typeof COLUMNS)[number]["id"];

type BoardCard = {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date | string | null;
  priority: string;
  workType: string;
  status: ColumnId;
  people: string[];
  createdBy?: string;
  /** admin board move */
  taskId?: string;
  /** employee board move — only own assignee row */
  assigneeId?: string;
  assignees?: AdminTaskRow["assignees"];
};

function asColumn(status: string | undefined | null): ColumnId {
  if (
    status === "TODO" ||
    status === "IN_PROGRESS" ||
    status === "IN_REVIEW" ||
    status === "DONE"
  ) {
    return status;
  }
  return "TODO";
}

function adminCards(tasks: AdminTaskRow[]): BoardCard[] {
  return tasks.map((task) => {
    const status = asColumn(
      task.boardStatus ??
        (task.assignees.every((a) => a.status === "DONE") && task.assignees.length
          ? "DONE"
          : task.assignees.some((a) => a.status === "IN_REVIEW")
            ? "IN_REVIEW"
            : task.assignees.some((a) => a.status === "IN_PROGRESS")
              ? "IN_PROGRESS"
              : "TODO")
    );
    return {
      id: task.id,
      taskId: task.id,
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      priority: task.priority,
      workType: task.workType,
      status,
      people: task.assignees.map(
        (a) => `${a.employee.firstName} ${a.employee.lastName}`
      ),
      createdBy: task.createdBy.name,
      assignees: task.assignees,
    };
  });
}

function employeeCards(items: MyTaskRow[]): BoardCard[] {
  return items.map((row) => ({
    id: row.id,
    assigneeId: row.id,
    title: row.task.title,
    description: row.task.description,
    dueDate: row.task.dueDate,
    priority: row.task.priority,
    workType: row.task.workType,
    status: asColumn(
      row.status ||
        (row.task as { boardStatus?: string }).boardStatus ||
        "TODO"
    ),
    people: ["You"],
    createdBy: row.task.createdBy.name,
  }));
}

function AssigneeMultiSelect({
  employees,
  selected,
  onChange,
}: {
  employees: EmployeeOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = employees.filter((e) =>
    e.label.toLowerCase().includes(q.trim().toLowerCase())
  );
  const labels = employees
    .filter((e) => selected.includes(e.id))
    .map((e) => e.label.split(" · ")[0]);

  return (
    <div ref={rootRef} className="relative space-y-1">
      <Label>Assign employees</Label>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="nb-input flex h-11 w-full items-center justify-between px-3 text-left text-sm font-semibold"
      >
        <span className="truncate text-[var(--muted-foreground)]">
          {selected.length === 0
            ? "Select employees…"
            : labels.slice(0, 2).join(", ") +
              (labels.length > 2 ? ` +${labels.length - 2}` : "")}
        </span>
        <span className="text-xs font-black">{selected.length || ""}</span>
      </button>
      {open ? (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border-2 border-[var(--border)] bg-white shadow-[4px_4px_0_0_var(--border)]">
          <div className="border-b-2 border-[var(--border)] p-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search employee…"
              autoFocus
            />
          </div>
          <ul className="nb-scroll-hidden max-h-36 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-[var(--muted-foreground)]">
                No matches
              </li>
            ) : (
              filtered.map((emp) => {
                const checked = selected.includes(emp.id);
                return (
                  <li key={emp.id}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-[var(--secondary)]",
                        checked ? "bg-[var(--secondary)]" : null
                      )}
                      onClick={() =>
                        onChange(
                          checked
                            ? selected.filter((id) => id !== emp.id)
                            : [...selected, emp.id]
                        )
                      }
                    >
                      <span
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded border-2 border-[var(--border)] text-[10px]",
                          checked ? "bg-[var(--primary)] text-white" : "bg-white"
                        )}
                      >
                        {checked ? "✓" : ""}
                      </span>
                      {emp.label}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function KanbanBoard({
  mode,
  adminTasks = [],
  myTasks = [],
  employees = [],
}: {
  mode: "admin" | "employee";
  adminTasks?: AdminTaskRow[];
  myTasks?: MyTaskRow[];
  employees?: EmployeeOption[];
}) {
  const source = useMemo(
    () => (mode === "admin" ? adminCards(adminTasks) : employeeCards(myTasks)),
    [mode, adminTasks, myTasks]
  );
  const [cards, setCards] = useState<BoardCard[]>(source);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [addColumn, setAddColumn] = useState<ColumnId | null>(null);
  const [detail, setDetail] = useState<BoardCard | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const [pending, startTransition] = useTransition();
  const dragMoved = useRef(false);
  const router = useRouter();
  useWorkspaceLive(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setCards(source);
  }, [source]);

  const modalOpen = Boolean(addColumn || detail);

  useEffect(() => {
    if (!modalOpen) return;
    const prevBody = document.body.style.overflow;
    const main = document.querySelector("main.nb-scroll") as HTMLElement | null;
    const prevMain = main?.style.overflow ?? "";
    document.body.style.overflow = "hidden";
    if (main) main.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      if (main) main.style.overflow = prevMain;
    };
  }, [modalOpen]);

  const byColumn = useMemo(() => {
    const map: Record<ColumnId, BoardCard[]> = {
      TODO: [],
      IN_PROGRESS: [],
      IN_REVIEW: [],
      DONE: [],
    };
    for (const card of cards) map[card.status].push(card);
    return map;
  }, [cards]);

  function moveCard(cardId: string, next: ColumnId) {
    const card = cards.find((c) => c.id === cardId);
    if (!card || card.status === next) return;

    // Employees may only move their own assignee cards (already filtered)
    if (mode === "employee" && !card.assigneeId) return;

    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId
          ? {
              ...c,
              status: next,
              assignees: c.assignees?.map((a) => ({ ...a, status: next })),
            }
          : c
      )
    );
    if (detail?.id === cardId) {
      setDetail({
        ...detail,
        status: next,
        assignees: detail.assignees?.map((a) => ({ ...a, status: next })),
      });
    }

    startTransition(async () => {
      if (mode === "admin" && card.taskId) {
        const fd = new FormData();
        fd.set("taskId", card.taskId);
        fd.set("boardStatus", next);
        const res = await updateTaskBoardStatusAction(fd);
        if (res && "error" in res) {
          setCards(source);
          toastError("Move failed", res.error);
        } else {
          router.refresh();
        }
        return;
      }
      if (mode === "employee" && card.assigneeId) {
        const fd = new FormData();
        fd.set("assigneeId", card.assigneeId);
        fd.set("status", next);
        const res = await updateMyTaskStatusAction(fd);
        if (res && "error" in res) {
          setCards(source);
          toastError("Move failed", res.error);
        } else {
          router.refresh();
        }
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-black">
            {mode === "admin" ? "Board" : "My board"}
          </h3>
          <p className="text-sm text-[var(--muted-foreground)]">
            {mode === "admin"
              ? "Tap a card for details. Drag to move — everyone stays in sync."
              : "Tap a card for details. Drag only your assigned work."}
          </p>
        </div>
        {mode === "admin" ? (
          <Button type="button" onClick={() => setAddColumn("TODO")}>
            New task
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => (
          <div
            key={col.id}
            className={cn(
              "flex min-h-[420px] flex-col rounded-2xl border-2 border-[var(--border)] bg-white/90 p-3",
              col.soft
            )}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/card-id") || draggingId;
              if (id) moveCard(id, col.id);
              setDraggingId(null);
            }}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={cn("h-2.5 w-2.5 rounded-full", col.dot)} />
                <p className="text-sm font-black">{col.label}</p>
              </div>
              <Badge className="bg-white">{byColumn[col.id].length}</Badge>
            </div>

            <div className="flex-1 space-y-2">
              {byColumn[col.id].map((card) => (
                <article
                  key={card.id}
                  draggable
                  onDragStart={(e) => {
                    dragMoved.current = false;
                    setDraggingId(card.id);
                    e.dataTransfer.setData("text/card-id", card.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDrag={() => {
                    dragMoved.current = true;
                  }}
                  onDragEnd={() => setDraggingId(null)}
                  onClick={() => {
                    if (dragMoved.current) return;
                    setDetail(card);
                  }}
                  className={cn(
                    "cursor-pointer rounded-xl border-2 border-[var(--border)] bg-white p-3 shadow-[2px_2px_0_0_var(--border)] active:cursor-grabbing",
                    draggingId === card.id ? "opacity-60" : null
                  )}
                >
                  <p className="text-sm font-bold leading-snug">{card.title}</p>
                  {card.description ? (
                    <p className="mt-1 line-clamp-2 text-xs text-[var(--muted-foreground)]">
                      {card.description}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge className="text-[10px]">{card.priority}</Badge>
                    {card.dueDate ? (
                      <Badge className="text-[10px]">
                        Due {formatDate(card.dueDate)}
                      </Badge>
                    ) : null}
                  </div>
                  {card.people.length ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {card.people.slice(0, 4).map((name) => (
                        <span
                          key={name}
                          className="rounded-full border border-[var(--border)] bg-[var(--secondary)] px-2 py-0.5 text-[10px] font-bold"
                        >
                          {name.split(" ")[0]}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>

            {mode === "admin" ? (
              <button
                type="button"
                className="mt-3 text-left text-sm font-bold text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                onClick={() => setAddColumn(col.id)}
              >
                + New task
              </button>
            ) : null}
          </div>
        ))}
      </div>

      {mounted && addColumn && mode === "admin"
        ? createPortal(
            <div
              className="fixed inset-0 z-[250] flex items-center justify-center bg-black/50 p-3 sm:p-5"
              onClick={() => {
                setAddColumn(null);
                setSelected([]);
              }}
            >
              <div
                className="flex max-h-[min(88dvh,640px)] w-full max-w-md flex-col overflow-hidden rounded-2xl border-2 border-[var(--border)] bg-white shadow-[8px_8px_0_0_var(--border)]"
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="shrink-0 border-b-2 border-[var(--border)] px-4 py-3">
                  <h4 className="text-base font-black leading-tight">
                    New task · {COLUMNS.find((c) => c.id === addColumn)?.label}
                  </h4>
                </div>
                <form
                  className="nb-scroll-hidden flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-4 py-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const fd = new FormData(form);
                    fd.set("assignMode", "selected");
                    fd.set("boardStatus", addColumn);
                    fd.delete("employeeIds");
                    for (const id of selected) fd.append("employeeIds", id);
                    if (selected.length === 0) {
                      toastError("Pick people", "Select at least one employee");
                      return;
                    }
                    startTransition(async () => {
                      const res = await createTaskAction(fd);
                      if (res && "error" in res) {
                        toastError("Task not created", res.error);
                        return;
                      }
                      toastSuccess("Task added");
                      setAddColumn(null);
                      setSelected([]);
                      form.reset();
                    });
                  }}
                >
                  <div className="space-y-1">
                    <Label>Title</Label>
                    <Input name="title" required placeholder="What needs doing?" />
                  </div>
                  <div className="space-y-1">
                    <Label>Description</Label>
                    <Textarea
                      name="description"
                      rows={2}
                      placeholder="Optional details"
                      className="nb-scroll-hidden min-h-[64px] max-h-24 resize-none"
                    />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="space-y-1">
                      <Label>Due date</Label>
                      <Input name="dueDate" type="date" />
                    </div>
                    <div className="space-y-1">
                      <Label>Priority</Label>
                      <Select name="priority" defaultValue="MEDIUM">
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Work type</Label>
                      <Select name="workType" defaultValue="WORK">
                        <option value="WORK">Work</option>
                        <option value="FOLLOW_UP">Follow-up</option>
                        <option value="DOCUMENT">Document</option>
                        <option value="OTHER">Other</option>
                      </Select>
                    </div>
                  </div>
                  <AssigneeMultiSelect
                    employees={employees}
                    selected={selected}
                    onChange={setSelected}
                  />
                  <div className="sticky bottom-0 -mx-4 mt-1 flex flex-wrap gap-2 border-t-2 border-[var(--border)] bg-white px-4 py-3">
                    <Button type="submit" disabled={pending}>
                      {pending ? "Adding…" : "Add to board"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setAddColumn(null);
                        setSelected([]);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )
        : null}

      {mounted && detail
        ? createPortal(
            <div
              className="fixed inset-0 z-[250] flex items-center justify-center bg-black/50 p-3 sm:p-5"
              onClick={() => setDetail(null)}
            >
              <div
                className="flex max-h-[min(88dvh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border-2 border-[var(--border)] bg-white shadow-[8px_8px_0_0_var(--border)]"
                role="dialog"
                aria-modal="true"
                aria-labelledby="task-detail-title"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="shrink-0 border-b-2 border-[var(--border)] px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                        Task
                      </p>
                      <h4
                        id="task-detail-title"
                        className="mt-0.5 truncate text-lg font-black leading-tight"
                      >
                        {detail.title}
                      </h4>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => setDetail(null)}
                    >
                      Close
                    </Button>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <Badge className="capitalize">
                      {detail.status.replace(/_/g, " ").toLowerCase()}
                    </Badge>
                    <Badge>{detail.priority}</Badge>
                    <Badge>{detail.workType.replace(/_/g, " ")}</Badge>
                    {detail.dueDate ? (
                      <Badge>Due {formatDate(detail.dueDate)}</Badge>
                    ) : null}
                  </div>
                </div>

                <div className="nb-scroll-hidden min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
                  <div className="rounded-xl border-2 border-[var(--border)] bg-[var(--muted)]/30 p-3">
                    <p className="text-[10px] font-black uppercase tracking-wide text-[var(--muted-foreground)]">
                      Description
                    </p>
                    {detail.description ? (
                      <p className="nb-scroll-hidden mt-1.5 max-h-36 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-[var(--foreground)]">
                        {detail.description}
                      </p>
                    ) : (
                      <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">
                        No description added.
                      </p>
                    )}
                  </div>

                  {detail.createdBy ? (
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Created by{" "}
                      <span className="font-bold text-[var(--foreground)]">
                        {detail.createdBy}
                      </span>
                    </p>
                  ) : null}

                  <div className="space-y-1.5">
                    <p className="text-[10px] font-black uppercase tracking-wide text-[var(--muted-foreground)]">
                      {mode === "admin" ? "Assignees" : "Assigned to"}
                    </p>
                    {detail.assignees?.length ? (
                      <ul className="nb-scroll-hidden max-h-28 space-y-1.5 overflow-y-auto">
                        {detail.assignees.map((a) => (
                          <li
                            key={a.id}
                            className="flex items-center justify-between rounded-xl border-2 border-[var(--border)] bg-white px-2.5 py-2 text-sm"
                          >
                            <span className="font-semibold">
                              {a.employee.firstName} {a.employee.lastName}
                            </span>
                            <Badge className="text-[10px] capitalize">
                              {a.status.replace(/_/g, " ").toLowerCase()}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="rounded-xl border-2 border-[var(--border)] px-2.5 py-2 text-sm font-semibold">
                        {detail.people.join(", ") || "—"}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[10px] font-black uppercase tracking-wide text-[var(--muted-foreground)]">
                      Move to
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {COLUMNS.map((col) => (
                        <Button
                          key={col.id}
                          type="button"
                          size="sm"
                          variant={
                            detail.status === col.id ? "default" : "outline"
                          }
                          disabled={pending || detail.status === col.id}
                          onClick={() => {
                            moveCard(detail.id, col.id);
                          }}
                        >
                          {col.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                {mode === "admin" && detail.taskId ? (
                  <div className="shrink-0 border-t-2 border-[var(--border)] px-4 py-3">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={pending}
                      onClick={() => {
                        const id = detail.taskId!;
                        if (!confirm("Delete this task for everyone?")) return;
                        startTransition(async () => {
                          const res = await deleteTaskAction(id);
                          if (res && "error" in res)
                            toastError("Delete failed", res.error);
                          else {
                            toastSuccess("Task deleted");
                            setDetail(null);
                          }
                        });
                      }}
                    >
                      Delete task
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

export function WorkspaceTabs({
  mode,
  adminTasks = [],
  myTasks = [],
  employees = [],
  tasksPanel,
  projectsPanel,
}: {
  mode: "admin" | "employee";
  adminTasks?: AdminTaskRow[];
  myTasks?: MyTaskRow[];
  employees?: EmployeeOption[];
  tasksPanel: React.ReactNode;
  /** Admin-only projects / credentials vault */
  projectsPanel?: React.ReactNode;
}) {
  const [tab, setTab] = useState<"tasks" | "board" | "projects">("board");

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash === "tasks" || hash === "board") setTab(hash);
    if (hash === "projects" && mode === "admin" && projectsPanel) setTab("projects");
  }, [mode, projectsPanel]);

  function set(next: "tasks" | "board" | "projects") {
    setTab(next);
    window.history.replaceState(null, "", `#${next}`);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2 border-b-2 border-[var(--border)] pb-3">
        <button
          type="button"
          onClick={() => set("board")}
          className={cn(
            "rounded-xl border-2 px-3 py-2 text-sm font-black",
            tab === "board"
              ? "border-[var(--border)] bg-[var(--primary)] text-white shadow-[3px_3px_0_0_var(--border)]"
              : "border-transparent bg-white text-[var(--foreground)] hover:border-[var(--border)]"
          )}
        >
          Board
        </button>
        <button
          type="button"
          onClick={() => set("tasks")}
          className={cn(
            "rounded-xl border-2 px-3 py-2 text-sm font-black",
            tab === "tasks"
              ? "border-[var(--border)] bg-[var(--primary)] text-white shadow-[3px_3px_0_0_var(--border)]"
              : "border-transparent bg-white text-[var(--foreground)] hover:border-[var(--border)]"
          )}
        >
          Tasks
        </button>
        {mode === "admin" && projectsPanel ? (
          <button
            type="button"
            onClick={() => set("projects")}
            className={cn(
              "rounded-xl border-2 px-3 py-2 text-sm font-black",
              tab === "projects"
                ? "border-[var(--border)] bg-[var(--primary)] text-white shadow-[3px_3px_0_0_var(--border)]"
                : "border-transparent bg-white text-[var(--foreground)] hover:border-[var(--border)]"
            )}
          >
            Projects
          </button>
        ) : null}
      </div>
      {tab === "board" ? (
        <KanbanBoard
          mode={mode}
          adminTasks={adminTasks}
          myTasks={myTasks}
          employees={employees}
        />
      ) : tab === "projects" && projectsPanel ? (
        projectsPanel
      ) : (
        tasksPanel
      )}
    </div>
  );
}
