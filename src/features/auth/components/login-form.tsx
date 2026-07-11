"use client";

import Link from "next/link";
import { useState } from "react";
import { signIn, signOut } from "@/lib/auth-client";
import { checkLoginAccessAction } from "@/features/shared/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { AuthBrandHeader } from "@/components/auth/auth-brand-header";
import { toastError, toastSuccess } from "@/store/toast";

type BlockInfo = {
  reason: string;
  title: string;
  message: string;
  employeeName: string;
  companyName: string;
  statusLabel: string;
};

export function LoginForm({
  brand,
}: {
  brand: {
    name: string;
    logoUrl: string | null;
    companyId: string;
  } | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [block, setBlock] = useState<BlockInfo | null>(null);
  const [pending, setPending] = useState(false);

  if (block) {
    return (
      <Card className="w-full max-w-md overflow-hidden">
        <div
          className="border-b-2 border-[var(--border)] px-6 py-5"
          style={{
            backgroundImage:
              "linear-gradient(135deg, color-mix(in srgb, var(--destructive) 18%, white) 0%, white 55%, color-mix(in srgb, var(--secondary) 40%, white) 100%)",
          }}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
            {block.companyName}
          </p>
          <div className="mt-3 inline-flex rounded-full border-2 border-[var(--border)] bg-white px-3 py-1 text-xs font-black shadow-[3px_3px_0_0_var(--border)]">
            {block.statusLabel}
          </div>
          <h2 className="mt-4 text-2xl font-black leading-tight tracking-tight">
            {block.title}
          </h2>
          <p className="mt-1 text-sm font-semibold text-[var(--muted-foreground)]">
            {block.employeeName}
          </p>
        </div>
        <CardContent className="space-y-4 pt-5">
          <p className="text-sm leading-relaxed text-[var(--foreground)]">
            {block.message}
          </p>
          <div className="rounded-xl border-2 border-[var(--border)] bg-[var(--muted)]/40 p-3 text-xs font-semibold text-[var(--muted-foreground)] shadow-[3px_3px_0_0_var(--border)]">
            Login is blocked while your status is{" "}
            <span className="font-black text-[var(--foreground)]">
              {block.statusLabel}
            </span>
            . Only an admin can activate your account again.
          </div>
          <Button
            type="button"
            className="w-full"
            onClick={() => {
              setBlock(null);
              setError(null);
            }}
          >
            Try another account
          </Button>
          <p className="text-center text-xs text-[var(--muted-foreground)]">
            Need help? Contact your company HR or admin.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <AuthBrandHeader
          brand={brand}
          fallbackTitle={brand ? `Sign in` : "Sign in to your portal"}
        />
        <CardDescription>
          {brand
            ? `Access your ${brand.name} admin or employee account.`
            : "Use your company admin or employee account."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            setBlock(null);
            const fd = new FormData(e.currentTarget);
            const email = String(fd.get("email") || "");
            const password = String(fd.get("password") || "");

            void (async () => {
              setPending(true);
              try {
                const access = await checkLoginAccessAction(email);
                if (access && "allowed" in access && access.allowed === false) {
                  setBlock({
                    reason: access.reason,
                    title: access.title,
                    message: access.message,
                    employeeName: access.employeeName,
                    companyName: access.companyName,
                    statusLabel: access.statusLabel,
                  });
                  toastError(access.title, access.statusLabel);
                  setPending(false);
                  return;
                }

                const res = await signIn.email({ email, password });
                if (res.error) {
                  const message = res.error.message || "Invalid credentials";
                  setError(message);
                  toastError("Sign in failed", message);
                  setPending(false);
                  return;
                }

                toastSuccess("Welcome back", "Opening your portal…");
                // Hard navigate so we don't stick on login with soft RSC "Rendering…"
                window.location.assign("/portal");
              } catch {
                setError("Something went wrong. Please try again.");
                toastError("Sign in failed", "Please try again.");
                setPending(false);
              }
            })();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@company.com"
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="current-password"
              placeholder="Your password"
            />
          </div>
          {error ? (
            <p className="text-sm font-semibold text-[var(--destructive)]">{error}</p>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p className="mt-4 text-sm text-[var(--muted-foreground)]">
          New company?{" "}
          <Link href="/register" className="font-bold text-[var(--foreground)] underline">
            Register here
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
