"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type Dept = { id: string; name: string };

const STATUSES = [
  { value: "ALL", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "ON_NOTICE", label: "On notice" },
  { value: "RESIGNED", label: "Resigned" },
  { value: "TERMINATED", label: "Terminated" },
] as const;

const SEARCH_DEBOUNCE_MS = 250;

export function ManageEmployeeFilters({
  departments,
  q,
  departmentId,
  status,
}: {
  departments: Dept[];
  q: string;
  departmentId: string;
  status: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [qLocal, setQLocal] = useState(q);
  const [deptLocal, setDeptLocal] = useState(departmentId);
  const [statusLocal, setStatusLocal] = useState(status);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQLocal(q);
    setDeptLocal(departmentId);
    setStatusLocal(status);
  }, [q, departmentId, status]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function commit(next: { q: string; departmentId: string; status: string }) {
    const params = new URLSearchParams();
    const nextQ = next.q.trim();
    if (nextQ) params.set("q", nextQ);
    if (next.departmentId) params.set("departmentId", next.departmentId);
    if (next.status && next.status !== "ALL") params.set("status", next.status);
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  function scheduleSearch(nextQ: string, dept: string, st: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      commit({ q: nextQ, departmentId: dept, status: st });
    }, SEARCH_DEBOUNCE_MS);
  }

  const hasFilters = Boolean(qLocal.trim() || deptLocal || (statusLocal && statusLocal !== "ALL"));

  return (
    <div className="rounded-xl border-2 border-[var(--border)] bg-white p-4 shadow-[3px_3px_0_0_var(--border)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
          Filters
          {pending ? <span className="ml-2 font-semibold normal-case">Updating…</span> : null}
        </p>
        {hasFilters ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => {
              if (debounceRef.current) clearTimeout(debounceRef.current);
              setQLocal("");
              setDeptLocal("");
              setStatusLocal("ALL");
              commit({ q: "", departmentId: "", status: "ALL" });
            }}
          >
            Clear
          </Button>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="emp-search">Search</Label>
          <Input
            id="emp-search"
            value={qLocal}
            autoComplete="off"
            placeholder="Type a name, email, or code…"
            onChange={(e) => {
              const value = e.target.value;
              setQLocal(value);
              scheduleSearch(value, deptLocal, statusLocal);
            }}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="emp-dept">Department</Label>
          <Select
            id="emp-dept"
            value={deptLocal}
            onChange={(e) => {
              const value = e.target.value;
              if (debounceRef.current) clearTimeout(debounceRef.current);
              setDeptLocal(value);
              commit({ q: qLocal, departmentId: value, status: statusLocal });
            }}
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="emp-status">Status</Label>
          <Select
            id="emp-status"
            value={statusLocal}
            onChange={(e) => {
              const value = e.target.value;
              if (debounceRef.current) clearTimeout(debounceRef.current);
              setStatusLocal(value);
              commit({ q: qLocal, departmentId: deptLocal, status: value });
            }}
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </div>
  );
}
