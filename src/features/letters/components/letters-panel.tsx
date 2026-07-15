"use client";

import { useState, useTransition } from "react";
import {
  createOfferLetterAction,
  deleteOfferLetterAction,
} from "@/features/letters/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toastError, toastSuccess } from "@/store/toast";
import { formatDate } from "@/lib/utils";

type EmployeeOption = {
  id: string;
  label: string;
  firstName: string;
  lastName: string;
  designation: string | null;
  department: string | null;
  joiningDate: string | null;
  basicSalary: number | null;
};

type LetterRow = {
  id: string;
  letterType: string;
  candidateName: string;
  designation: string;
  createdAt: Date | string;
};

export function LettersPanel({
  employees,
  letters,
}: {
  employees: EmployeeOption[];
  letters: LetterRow[];
}) {
  const [pending, startTransition] = useTransition();
  const [employeeId, setEmployeeId] = useState("");
  const [letterType, setLetterType] = useState<"OFFER" | "APPOINTMENT">("OFFER");
  const [candidateName, setCandidateName] = useState("");
  const [designation, setDesignation] = useState("");
  const [department, setDepartment] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [salaryAmount, setSalaryAmount] = useState("");
  const [employmentType, setEmploymentType] = useState("FULL_TIME");
  const [reportingTo, setReportingTo] = useState("");
  const [location, setLocation] = useState("");
  const [bodyExtras, setBodyExtras] = useState("");

  function fillFromEmployee(id: string) {
    setEmployeeId(id);
    const emp = employees.find((e) => e.id === id);
    if (!emp) return;
    setCandidateName(`${emp.firstName} ${emp.lastName}`.trim());
    setDesignation(emp.designation || "");
    setDepartment(emp.department || "");
    setJoiningDate(emp.joiningDate || "");
    setSalaryAmount(emp.basicSalary != null ? String(emp.basicSalary) : "");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle>Create letter</CardTitle>
          <p className="text-sm text-[var(--muted-foreground)]">
            Uses company logo, name, and address from Settings.
          </p>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData();
              fd.set("letterType", letterType);
              fd.set("employeeId", employeeId);
              fd.set("candidateName", candidateName);
              fd.set("designation", designation);
              fd.set("department", department);
              fd.set("joiningDate", joiningDate);
              fd.set("salaryAmount", salaryAmount);
              fd.set("salaryCurrency", "INR");
              fd.set("employmentType", employmentType);
              fd.set("reportingTo", reportingTo);
              fd.set("location", location);
              fd.set("bodyExtras", bodyExtras);
              startTransition(async () => {
                const res = await createOfferLetterAction(fd);
                if (res && "error" in res) {
                  toastError("Could not create", res.error);
                  return;
                }
                toastSuccess("Letter created");
                if (res && "id" in res && res.id) {
                  window.open(`/api/letters/${res.id}/print`, "_blank");
                }
              });
            }}
          >
            <div className="space-y-1 sm:col-span-2">
              <Label>Link employee (optional)</Label>
              <select
                className="h-11 w-full rounded-xl border-2 border-[var(--border)] bg-white px-3 text-sm font-semibold"
                value={employeeId}
                onChange={(e) => fillFromEmployee(e.target.value)}
              >
                <option value="">Manual / external candidate</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <select
                className="h-11 w-full rounded-xl border-2 border-[var(--border)] bg-white px-3 text-sm font-semibold"
                value={letterType}
                onChange={(e) =>
                  setLetterType(e.target.value as "OFFER" | "APPOINTMENT")
                }
              >
                <option value="OFFER">Offer letter</option>
                <option value="APPOINTMENT">Appointment letter</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Employment type</Label>
              <select
                className="h-11 w-full rounded-xl border-2 border-[var(--border)] bg-white px-3 text-sm font-semibold"
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
              >
                <option value="FULL_TIME">Full time</option>
                <option value="PART_TIME">Part time</option>
                <option value="CONTRACT">Contract</option>
              </select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Candidate name</Label>
              <Input
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Designation</Label>
              <Input
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Department</Label>
              <Input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Joining date</Label>
              <Input
                type="date"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Salary (INR)</Label>
              <Input
                value={salaryAmount}
                onChange={(e) => setSalaryAmount(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-1">
              <Label>Reporting to</Label>
              <Input
                value={reportingTo}
                onChange={(e) => setReportingTo(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Location</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Extra paragraph (optional)</Label>
              <Textarea
                value={bodyExtras}
                onChange={(e) => setBodyExtras(e.target.value)}
                rows={3}
                placeholder="Probation, benefits, work hours…"
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={pending}>
                {pending ? "Creating…" : "Create & open PDF"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent letters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {letters.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">None yet.</p>
          ) : (
            letters.map((l) => (
              <div
                key={l.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-[var(--border)] px-3 py-2"
              >
                <div>
                  <p className="font-bold">{l.candidateName}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {l.designation} · {formatDate(l.createdAt)}
                  </p>
                  <Badge className="mt-1 text-[10px]">{l.letterType}</Badge>
                </div>
                <div className="flex gap-2">
                  <a
                    href={`/api/letters/${l.id}/print`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-bold underline"
                  >
                    Open
                  </a>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => {
                      if (!confirm("Delete this letter?")) return;
                      startTransition(async () => {
                        const res = await deleteOfferLetterAction(l.id);
                        if (res && "error" in res)
                          toastError("Delete failed", res.error);
                        else toastSuccess("Deleted");
                      });
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
