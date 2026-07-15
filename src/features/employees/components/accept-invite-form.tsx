"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptInviteAction } from "@/features/shared/actions";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toastError, toastSuccess } from "@/store/toast";

export function AcceptInviteForm({
  email,
  companyName,
  employeeCode,
  primaryColor,
  inviteToken,
  tokenValid,
}: {
  email: string;
  companyName: string;
  employeeCode: string | null;
  primaryColor: string;
  inviteToken?: string;
  tokenValid: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          {companyName}
        </p>
        <CardTitle>Accept invitation</CardTitle>
        <CardDescription>
          {tokenValid
            ? "Your invite link is verified. Choose a new password to finish setup."
            : "Enter the default password from your invite email, then choose a new password."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className="mb-4 rounded-xl border-2 border-[var(--border)] p-3 text-sm shadow-[3px_3px_0_0_var(--border)]"
          style={{
            backgroundImage: `linear-gradient(155deg, #ffffff 0%, color-mix(in srgb, ${primaryColor} 12%, white) 100%)`,
          }}
        >
          <p>
            <span className="font-bold">Email:</span> {email}
          </p>
          {employeeCode ? (
            <p>
              <span className="font-bold">Employee code:</span> {employeeCode}
            </p>
          ) : null}
          {tokenValid ? (
            <p className="mt-1 text-xs font-semibold text-[var(--success)]">
              Secure invite link verified
            </p>
          ) : (
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Use the default password from your invite email.
            </p>
          )}
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const fd = new FormData(e.currentTarget);
            const newPassword = String(fd.get("newPassword") || "");
            const confirm = String(fd.get("confirmPassword") || "");
            if (newPassword !== confirm) {
              setError("New passwords do not match");
              return;
            }
            startTransition(async () => {
              const res = await acceptInviteAction(fd);
              if (res && "error" in res) {
                setError(res.error);
                toastError("Could not accept invite", res.error);
                return;
              }
              const login = await signIn.email({
                email,
                password: newPassword,
              });
              if (login.error) {
                toastSuccess("Password updated", "Please sign in with your new password");
                router.push("/login");
                return;
              }
              toastSuccess("Welcome", "Your password is set. Opening portal…");
              window.location.assign("/portal");
            });
          }}
        >
          <input type="hidden" name="email" value={email} />
          {inviteToken ? (
            <input type="hidden" name="inviteToken" value={inviteToken} />
          ) : null}
          {!tokenValid ? (
            <div className="space-y-2">
              <Label htmlFor="tempPassword">Default password (from email)</Label>
              <PasswordInput
                id="tempPassword"
                name="tempPassword"
                required
                placeholder="Enter password from invite email"
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="newPassword">New password</Label>
            <PasswordInput
              id="newPassword"
              name="newPassword"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Enter new password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Confirm new password"
            />
          </div>
          {error ? (
            <p className="text-sm font-semibold text-[var(--destructive)]">{error}</p>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Saving…" : "Accept & continue"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
