"use client";

import { useMemo, useState, useTransition } from "react";
import {
  createProjectAction,
  updateProjectAction,
  deleteProjectAction,
  saveProjectCredentialsAction,
  setProjectSharesAction,
} from "@/features/projects/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toastError, toastSuccess } from "@/store/toast";
import { cn } from "@/lib/utils";

export type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  notes: string | null;
  credentials: { id: string; key: string; value: string; sortOrder: number }[];
  shares?: {
    id: string;
    employeeId: string;
    employee: {
      id: string;
      firstName: string;
      lastName: string;
      employeeCode: string;
    };
  }[];
  updatedAt: Date | string;
};

type EmployeeOption = { id: string; label: string };

type CredDraft = { key: string; value: string };

function rowsToJsonObject(rows: CredDraft[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of rows) {
    const k = r.key.trim();
    if (!k) continue;
    out[k] = r.value;
  }
  return out;
}

function copyJson(payload: unknown, label: string) {
  return navigator.clipboard
    .writeText(JSON.stringify(payload, null, 2))
    .then(() => toastSuccess("Copied", label))
    .catch(() => toastError("Copy failed", "Clipboard permission blocked"));
}

export function ProjectsVault({
  projects,
  employees = [],
}: {
  projects: ProjectRow[];
  employees?: EmployeeOption[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    projects[0]?.id ?? null
  );
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(projects.length === 0);

  const selected = useMemo(
    () => projects.find((p) => p.id === selectedId) ?? null,
    [projects, selectedId]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q) ||
        p.credentials.some(
          (c) =>
            c.key.toLowerCase().includes(q) || c.value.toLowerCase().includes(q)
        )
    );
  }, [projects, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-black">Projects</h3>
          <p className="text-sm text-[var(--muted-foreground)]">
            Name the project first, then add credentials. Copy as JSON anytime.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setCreating(true);
            setSelectedId(null);
          }}
        >
          New project
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-3">
          <Input
            placeholder="Search projects…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10"
          />
          <div className="max-h-[60vh] space-y-1 overflow-y-auto rounded-2xl border-2 border-[var(--border)] bg-white p-2">
            {filtered.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-[var(--muted-foreground)]">
                No projects yet
              </p>
            ) : (
              filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setCreating(false);
                    setSelectedId(p.id);
                  }}
                  className={cn(
                    "w-full rounded-xl px-3 py-2.5 text-left transition",
                    !creating && selectedId === p.id
                      ? "bg-[var(--primary)] text-white"
                      : "hover:bg-[var(--muted)]"
                  )}
                >
                  <span className="block text-sm font-bold leading-snug">{p.name}</span>
                  <span
                    className={cn(
                      "mt-0.5 block text-[11px]",
                      !creating && selectedId === p.id
                        ? "text-white/75"
                        : "text-[var(--muted-foreground)]"
                    )}
                  >
                    {p.credentials.length} key
                    {p.credentials.length === 1 ? "" : "s"}
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>

        <div>
          {creating ? (
            <CreateProjectPanel
              pending={pending}
              startTransition={startTransition}
              onCancel={() => {
                setCreating(false);
                if (!selectedId && projects[0]) setSelectedId(projects[0].id);
              }}
              onCreated={(id) => {
                setCreating(false);
                setSelectedId(id);
              }}
            />
          ) : selected ? (
            <ProjectDetail
              key={selected.id}
              project={selected}
              employees={employees}
              pending={pending}
              startTransition={startTransition}
              onDeleted={() => {
                const next = projects.find((p) => p.id !== selected.id);
                setSelectedId(next?.id ?? null);
                if (!next) setCreating(true);
              }}
            />
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <p className="text-sm text-[var(--muted-foreground)]">
                  Start with a project name.
                </p>
                <Button type="button" className="mt-4" onClick={() => setCreating(true)}>
                  Create project
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateProjectPanel({
  pending,
  startTransition,
  onCreated,
  onCancel,
}: {
  pending: boolean;
  startTransition: (fn: () => void) => void;
  onCreated: (id: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  return (
    <Card className="border-2">
      <CardContent className="space-y-5 p-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
            Step 1
          </p>
          <h4 className="mt-1 text-xl font-black">Project name</h4>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Create the project first. You can add credentials next.
          </p>
        </div>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData();
            fd.set("name", name);
            fd.set("description", description);
            startTransition(async () => {
              const res = await createProjectAction(fd);
              if (res && "error" in res) {
                toastError("Could not create", res.error);
                return;
              }
              toastSuccess("Project created");
              if (res && "id" in res && res.id) onCreated(res.id);
            });
          }}
        >
          <div className="space-y-1.5">
            <Label>Project</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme website / Client CRM"
              required
              autoFocus
              className="h-11 text-base"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Details (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short what / who this is for"
              rows={2}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending || !name.trim()}>
              {pending ? "Creating…" : "Continue"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ProjectDetail({
  project,
  employees,
  pending,
  startTransition,
  onDeleted,
}: {
  project: ProjectRow;
  employees: EmployeeOption[];
  pending: boolean;
  startTransition: (fn: () => void) => void;
  onDeleted: () => void;
}) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [rows, setRows] = useState<CredDraft[]>(
    project.credentials.length
      ? project.credentials.map((c) => ({ key: c.key, value: c.value }))
      : [{ key: "", value: "" }]
  );
  const [reveal, setReveal] = useState(false);
  const [sharedIds, setSharedIds] = useState<string[]>(
    () => project.shares?.map((s) => s.employeeId) ?? []
  );

  function updateRow(i: number, patch: Partial<CredDraft>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  const jsonAll = rowsToJsonObject(rows);

  function toggleShare(employeeId: string) {
    setSharedIds((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId]
    );
  }

  return (
    <Card className="border-2">
      <CardContent className="space-y-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
              Project
            </p>
            <h4 className="truncate text-xl font-black">{project.name}</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => copyJson(jsonAll, "All credentials (JSON)")}
              disabled={Object.keys(jsonAll).length === 0}
            >
              Copy all JSON
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setReveal((v) => !v)}
            >
              {reveal ? "Hide" : "Show"}
            </Button>
          </div>
        </div>

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData();
            fd.set("id", project.id);
            fd.set("name", name);
            fd.set("description", description);
            fd.set("notes", "");
            startTransition(async () => {
              const res = await updateProjectAction(fd);
              if (res && "error" in res) toastError("Update failed", res.error);
              else toastSuccess("Saved");
            });
          }}
        >
          <div className="space-y-1.5">
            <Label>Project</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Details</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details"
              rows={2}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              Save
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={pending}
              onClick={() => {
                if (!confirm(`Delete “${project.name}”?`)) return;
                startTransition(async () => {
                  const res = await deleteProjectAction(project.id);
                  if (res && "error" in res) toastError("Delete failed", res.error);
                  else {
                    toastSuccess("Deleted");
                    onDeleted();
                  }
                });
              }}
            >
              Delete
            </Button>
          </div>
        </form>

        {employees.length ? (
          <div className="space-y-3 border-t-2 border-[var(--border)] pt-5">
            <div>
              <h5 className="text-sm font-black">Share with employees</h5>
              <p className="text-xs text-[var(--muted-foreground)]">
                Shared people can view & copy credentials (read-only).
              </p>
            </div>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border-2 border-[var(--border)] p-2">
              {employees.map((e) => (
                <label
                  key={e.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-[var(--muted)]"
                >
                  <input
                    type="checkbox"
                    checked={sharedIds.includes(e.id)}
                    onChange={() => toggleShare(e.id)}
                  />
                  <span className="font-semibold">{e.label}</span>
                </label>
              ))}
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  const res = await setProjectSharesAction(project.id, sharedIds);
                  if (res && "error" in res) toastError("Share failed", res.error);
                  else toastSuccess("Sharing updated");
                });
              }}
            >
              Save sharing
            </Button>
          </div>
        ) : null}

        <div className="space-y-3 border-t-2 border-[var(--border)] pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h5 className="text-sm font-black">Credentials</h5>
              <p className="text-xs text-[var(--muted-foreground)]">
                Key → value. Copy one or Copy all as JSON.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRows((prev) => [...prev, { key: "", value: "" }])}
            >
              Add field
            </Button>
          </div>

          <div className="space-y-2">
            {rows.map((row, i) => (
              <div
                key={i}
                className="grid gap-2 rounded-xl border-2 border-[var(--border)] bg-[var(--muted)]/20 p-2.5 sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.35fr)_auto_auto]"
              >
                <Input
                  value={row.key}
                  onChange={(e) => updateRow(i, { key: e.target.value })}
                  placeholder="Key"
                  className="font-semibold"
                />
                <Input
                  type={reveal ? "text" : "password"}
                  value={row.value}
                  onChange={(e) => updateRow(i, { value: e.target.value })}
                  placeholder="Value"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={!row.key.trim()}
                  onClick={() =>
                    copyJson(
                      { [row.key.trim()]: row.value },
                      `${row.key.trim()} (JSON)`
                    )
                  }
                >
                  Copy
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setRows((prev) =>
                      prev.length <= 1
                        ? [{ key: "", value: "" }]
                        : prev.filter((_, idx) => idx !== i)
                    )
                  }
                >
                  ✕
                </Button>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  const res = await saveProjectCredentialsAction(project.id, rows);
                  if (res && "error" in res) toastError("Save failed", res.error);
                  else toastSuccess("Credentials saved");
                });
              }}
            >
              {pending ? "Saving…" : "Save credentials"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => copyJson(jsonAll, "All credentials (JSON)")}
              disabled={Object.keys(jsonAll).length === 0}
            >
              Copy all JSON
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
