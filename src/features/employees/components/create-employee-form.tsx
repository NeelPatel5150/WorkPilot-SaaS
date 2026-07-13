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

type CreatedCreds = {
  employeeCode: string;
  tempPassword: string;
  email: string;
  acceptUrl: string;
};

function CopyButton({
  label,
  value,
  onCopied,
}: {
  label: string;
  value: string;
  onCopied?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          onCopied?.();
          setTimeout(() => setCopied(false), 1600);
        } catch {
          toastError("Copy failed", "Select the text and copy manually");
        }
      }}
    >
      {copied ? "Copied" : label}
    </Button>
  );
}

function InviteBackupCard({ creds }: { creds: CreatedCreds }) {
  const allText = [
    `Email: ${creds.email}`,
    `Code: ${creds.employeeCode}`,
    `Default password: ${creds.tempPassword}`,
    `Accept link: ${creds.acceptUrl}`,
  ].join("\n");

  return (
    <div className="rounded-xl border-2 border-[var(--border)] bg-[linear-gradient(135deg,#eff6ff,#dbeafe)] p-4 shadow-[4px_4px_0_0_var(--border)]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-black">Invite sent · backup copy for you</p>
        <CopyButton
          label="Copy all"
          value={allText}
          onCopied={() => toastSuccess("Copied", "Invite details copied")}
        />
      </div>

      <div className="mt-3 space-y-2 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border-2 border-[var(--border)] bg-white px-3 py-2">
          <p>
            <span className="font-bold">Email:</span>{" "}
            <span className="break-all">{creds.email}</span>
          </p>
          <CopyButton label="Copy" value={creds.email} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border-2 border-[var(--border)] bg-white px-3 py-2">
          <p>
            <span className="font-bold">Code:</span> {creds.employeeCode}
          </p>
          <CopyButton label="Copy" value={creds.employeeCode} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border-2 border-[var(--border)] bg-white px-3 py-2">
          <p>
            <span className="font-bold">Default password:</span>{" "}
            <code className="rounded bg-[var(--muted)] px-2 py-0.5 font-mono font-bold">
              {creds.tempPassword}
            </code>
          </p>
          <CopyButton label="Copy" value={creds.tempPassword} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border-2 border-[var(--border)] bg-white px-3 py-2">
          <p className="min-w-0 flex-1">
            <span className="font-bold">Accept link:</span>{" "}
            <a
              href={creds.acceptUrl}
              target="_blank"
              rel="noreferrer"
              className="break-all font-semibold underline"
            >
              {creds.acceptUrl}
            </a>
          </p>
          <CopyButton label="Copy" value={creds.acceptUrl} />
        </div>
      </div>

      <p className="mt-3 text-xs text-[var(--muted-foreground)]">
        Employee should open the email and click <strong>Accept invite &amp; set password</strong>.
        This backup is shown once if email delivery is delayed.
      </p>
    </div>
  );
}

export function CreateEmployeeForm({
  departments,
  nextCode,
}: {
  departments: Dept[];
  nextCode: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [createdCreds, setCreatedCreds] = useState<CreatedCreds | null>(null);

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
          acceptUrl: res.acceptUrl,
        });
        toastSuccess("Employee invited", `Invite email sent to ${res.email}`);
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
            <Input name="firstName" required placeholder="Enter first name" />
          </div>
          <div className="space-y-1">
            <Label>Last name</Label>
            <Input name="lastName" required placeholder="Enter last name" />
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
              placeholder="Enter work email"
            />
          </div>
          <div className="space-y-1">
            <Label>Invite</Label>
            <Input
              value="Branded email + Accept button"
              readOnly
              disabled
              className="opacity-90"
            />
            <p className="text-xs text-[var(--muted-foreground)]">
              They get an email with an Accept button to set their password
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
            <Input name="designation" placeholder="Enter designation" />
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
            <Input name="phone" type="tel" placeholder="Enter phone number" />
          </div>
          <div className="md:col-span-3 flex flex-col gap-3">
            <Button type="submit" disabled={pending} className="w-fit">
              {pending ? "Sending invite…" : "Create & email invite"}
            </Button>
            {error ? (
              <p className="text-sm font-semibold text-[var(--destructive)]">{error}</p>
            ) : null}
            {createdCreds ? <InviteBackupCard creds={createdCreds} /> : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
