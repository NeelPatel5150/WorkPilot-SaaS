"use client";

import { useState, useTransition } from "react";
import { createEmployeeAction } from "@/features/shared/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toastError, toastSuccess } from "@/store/toast";

type Dept = { id: string; name: string };

export function CreateEmployeeForm({
  departments,
  nextCode,
}: {
  departments: Dept[];
  nextCode: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [createdCreds, setCreatedCreds] = useState<{
    employeeCode: string;
    tempPassword: string;
    email: string;
  } | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setCreatedCreds(null);
    const fd = new FormData(e.currentTarget);
    const form = e.currentTarget;
    startTransition(async () => {
      const res = await createEmployeeAction(fd);
      if (res && "error" in res) {
        setError(res.error);
        toastError("Could not add employee", res.error);
        return;
      }
      if (res && "employeeCode" in res && "tempPassword" in res) {
        setCreatedCreds({
          employeeCode: res.employeeCode,
          tempPassword: res.tempPassword,
          email: res.email,
        });
        toastSuccess(
          "Employee invited",
          `Invite email sent to ${res.email}`
        );
        form.reset();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add employee</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <Label>First name</Label>
            <Input name="firstName" required placeholder="Neel" />
          </div>
          <div className="space-y-1">
            <Label>Last name</Label>
            <Input name="lastName" required placeholder="Patel" />
          </div>
          <div className="space-y-1">
            <Label>Employee code (auto)</Label>
            <Input value={nextCode} readOnly disabled className="opacity-90" />
            <p className="text-xs text-[var(--muted-foreground)]">
              Assigned automatically on save (next: {nextCode})
            </p>
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input
              name="email"
              type="email"
              required
              placeholder="neel@company.com"
            />
          </div>
          <div className="space-y-1">
            <Label>Invite</Label>
            <Input
              value="Branded email + set password"
              readOnly
              disabled
              className="opacity-90"
            />
            <p className="text-xs text-[var(--muted-foreground)]">
              They get default credentials by email and must set a new password
            </p>
          </div>
          <div className="space-y-1">
            <Label>Role</Label>
            <Select name="role" defaultValue="EMPLOYEE">
              <option value="EMPLOYEE">Employee</option>
              <option value="MANAGER">Manager</option>
              <option value="HR">HR</option>
              <option value="COMPANY_ADMIN">Company Admin</option>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Designation</Label>
            <Input name="designation" placeholder="e.g. Software Engineer" />
          </div>
          <div className="space-y-1">
            <Label>Department</Label>
            <Select name="departmentId" defaultValue="">
              <option value="">Select department (optional)</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Phone</Label>
            <Input name="phone" type="tel" placeholder="+91 98765 43210" />
          </div>
          <div className="md:col-span-3 flex flex-col gap-3">
            <Button type="submit" disabled={pending} className="w-fit">
              {pending ? "Sending invite…" : "Create & email invite"}
            </Button>
            {error ? (
              <p className="text-sm font-semibold text-[var(--destructive)]">{error}</p>
            ) : null}
            {createdCreds ? (
              <div className="rounded-xl border-2 border-[var(--border)] bg-[linear-gradient(135deg,#eff6ff,#dbeafe)] p-4 shadow-[4px_4px_0_0_var(--border)]">
                <p className="text-sm font-black">Invite sent · backup copy for you</p>
                <p className="mt-2 text-sm">
                  <span className="font-bold">Email:</span> {createdCreds.email}
                </p>
                <p className="text-sm">
                  <span className="font-bold">Code:</span> {createdCreds.employeeCode}
                </p>
                <p className="text-sm">
                  <span className="font-bold">Default password:</span>{" "}
                  <code className="rounded bg-white px-2 py-0.5 font-mono font-bold">
                    {createdCreds.tempPassword}
                  </code>
                </p>
                <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                  Employee opens the email → Accept & set new password. Shown here once in
                  case email delivery is delayed.
                </p>
              </div>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
