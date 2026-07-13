"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { registerCompanyAction } from "@/features/shared/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { AuthBrandHeader } from "@/components/auth/auth-brand-header";

export function RegisterForm({
  brand,
}: {
  brand: {
    name: string;
    logoUrl: string | null;
    companyId: string;
  } | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <AuthBrandHeader brand={brand} fallbackTitle="Create your company" />
        <CardDescription>
          Spin up a branded WorkPilot portal in under a minute.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              const res = await registerCompanyAction(fd);
              if (res && "error" in res) setError(res.error);
            });
          }}
          className="grid gap-4 sm:grid-cols-2"
        >
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="companyName">Company name</Label>
            <Input id="companyName" name="companyName" required placeholder="Enter company name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Subdomain slug</Label>
            <Input id="slug" name="slug" placeholder="Enter subdomain (optional)" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="primaryColor">Brand color</Label>
            <Input id="primaryColor" name="primaryColor" type="color" defaultValue="#2563EB" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="adminName">Your name</Label>
            <Input id="adminName" name="adminName" required placeholder="Enter your full name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Work email</Label>
            <Input id="email" name="email" type="email" required placeholder="Enter your work email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              placeholder="At least 8 characters"
            />
          </div>
          {error ? (
            <p className="sm:col-span-2 text-sm font-semibold text-[var(--destructive)]">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="sm:col-span-2" disabled={pending}>
            {pending ? "Creating…" : "Create company"}
          </Button>
        </form>
        <p className="mt-4 text-sm text-[var(--muted-foreground)]">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-[var(--foreground)] underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
