"use client";

import { useState, useTransition } from "react";
import { updateTenantSettingsAction } from "@/features/shared/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TenantSettingsForm({
  slug,
  customDomain,
  whatsappNumber,
  fromName,
  fromEmail,
  rootDomain,
}: {
  slug: string;
  customDomain?: string | null;
  whatsappNumber?: string | null;
  fromName?: string | null;
  fromEmail?: string | null;
  rootDomain: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Domain & messaging</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setMessage(null);
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              const res = await updateTenantSettingsAction(fd);
              if (res && "error" in res) setMessage(res.error);
              else setMessage("Saved tenant domain and sender settings.");
            });
          }}
        >
          <div className="space-y-1 sm:col-span-2">
            <Label>Subdomain</Label>
            <Input value={`${slug}.${rootDomain}`} readOnly disabled className="opacity-90" />
            <p className="text-xs text-[var(--muted-foreground)]">
              Point DNS A/CNAME for white-label access (when not on localhost).
            </p>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Custom domain</Label>
            <Input
              name="customDomain"
              defaultValue={customDomain ?? ""}
              placeholder="Enter custom domain"
            />
            <p className="text-xs text-[var(--muted-foreground)]">
              After saving, point your domain to this app. Verification is DNS-based (active when
              host resolves here).
            </p>
          </div>
          <div className="space-y-1">
            <Label>WhatsApp from number</Label>
            <Input
              name="whatsappNumber"
              defaultValue={whatsappNumber ?? ""}
              placeholder="Enter WhatsApp number"
            />
          </div>
          <div className="space-y-1">
            <Label>Email from name</Label>
            <Input name="fromName" defaultValue={fromName ?? ""} placeholder="Enter sender name" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Email from address</Label>
            <Input
              name="fromEmail"
              type="email"
              defaultValue={fromEmail ?? ""}
              placeholder="Enter email address"
            />
            <p className="text-xs text-[var(--muted-foreground)]">
              Must be allowed on your Resend domain. Falls back to EMAIL_FROM if empty.
            </p>
          </div>
          <div>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save domain & senders"}
            </Button>
          </div>
        </form>
        {message ? <p className="mt-3 text-sm font-semibold">{message}</p> : null}
      </CardContent>
    </Card>
  );
}
