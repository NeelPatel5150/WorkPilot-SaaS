"use client";

import { useState, useTransition } from "react";
import { Check, Copy } from "lucide-react";
import { changePasswordAction } from "@/features/shared/actions";
import { AvatarUploadCard } from "@/features/profile/components/avatar-setup";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toastError, toastSuccess } from "@/store/toast";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super admin",
  COMPANY_ADMIN: "Company admin",
  HR: "HR",
  MANAGER: "Manager",
  EMPLOYEE: "Employee",
};

function CopyIdButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      aria-label={`Copy ${label}`}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-[var(--border)] bg-white text-[var(--muted-foreground)] transition hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        } catch {
          toastError("Copy failed", "Could not copy to clipboard");
        }
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function IdRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-[var(--border)] bg-[var(--secondary)]/40 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
          {label}
        </p>
        <p className="mt-0.5 truncate font-mono text-sm font-semibold text-[var(--foreground)]">
          {value}
        </p>
      </div>
      <CopyIdButton value={value} label={label} />
    </div>
  );
}

export function AdminAccountCard({
  userId,
  name,
  email,
  role,
  image,
  employeeCode,
}: {
  userId: string;
  name: string;
  email: string;
  role: string;
  image: string | null;
  employeeCode: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your account</CardTitle>
        <CardDescription>
          Profile, admin ID, and password for this signed-in user.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="flex-1 space-y-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-xl font-black tracking-tight">{name}</h4>
                <Badge>{ROLE_LABELS[role] ?? role}</Badge>
              </div>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">{email}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <IdRow label="Admin user ID" value={userId} />
              {employeeCode ? <IdRow label="Employee code" value={employeeCode} /> : null}
            </div>
          </div>
        </div>

        <div className="space-y-3 border-t-2 border-[var(--border)] pt-6">
          <div>
            <h4 className="text-sm font-black">Avatar</h4>
            <p className="text-sm text-[var(--muted-foreground)]">
              Shown in attendance, notifications, and team lists.
            </p>
          </div>
          <AvatarUploadCard currentImage={image} userName={name} />
        </div>

        <div className="space-y-4 border-t-2 border-[var(--border)] pt-6">
          <div>
            <h4 className="text-sm font-black">Update password</h4>
            <p className="text-sm text-[var(--muted-foreground)]">
              Use a strong password you do not reuse elsewhere.
            </p>
          </div>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              const form = e.currentTarget;
              const fd = new FormData(form);
              startTransition(async () => {
                const res = await changePasswordAction(fd);
                if (res && "error" in res) {
                  setError(res.error);
                  toastError("Password not updated", res.error);
                  return;
                }
                form.reset();
                toastSuccess("Password updated", "Use your new password next time you sign in.");
              });
            }}
          >
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <PasswordInput
                id="currentPassword"
                name="currentPassword"
                required
                autoComplete="current-password"
                placeholder="Enter current password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">New password</Label>
              <PasswordInput
                id="newPassword"
                name="newPassword"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="At least 8 characters"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Repeat new password"
              />
            </div>
            {error ? (
              <p className="sm:col-span-2 text-sm font-semibold text-[var(--destructive)]">
                {error}
              </p>
            ) : null}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={pending}>
                {pending ? "Updating…" : "Update password"}
              </Button>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
