"use client";

import { useState, useTransition } from "react";
import { updateBrandingAction } from "@/features/shared/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function BrandingForm({
  name,
  primaryColor,
  secondaryColor,
  logoUrl,
  faviconUrl,
}: {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Branding</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            setMessage(null);
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              const res = await updateBrandingAction(fd);
              if (res && "error" in res) setMessage(res.error);
              else {
                setMessage("Saved — refresh to see theme, logo, and favicon.");
                window.setTimeout(() => window.location.reload(), 600);
              }
            });
          }}
        >
          <div className="space-y-1 sm:col-span-3">
            <Label>Company display name</Label>
            <Input name="name" defaultValue={name} required />
          </div>
          <div className="space-y-1">
            <Label>Primary</Label>
            <Input name="primaryColor" type="color" defaultValue={primaryColor} />
          </div>
          <div className="space-y-1">
            <Label>Secondary</Label>
            <Input name="secondaryColor" type="color" defaultValue={secondaryColor} />
          </div>
          <div className="space-y-1 sm:col-span-3">
            <Label>Company logo (header)</Label>
            <div className="flex flex-wrap items-center gap-3">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt=""
                  className="h-10 max-w-[140px] rounded-lg border-2 border-[var(--border)] bg-white object-contain p-1"
                />
              ) : null}
              <Input name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" />
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">PNG/JPG/WebP/SVG · max 2MB</p>
          </div>
          <div className="space-y-1 sm:col-span-3">
            <Label>Favicon (browser tab)</Label>
            <div className="flex flex-wrap items-center gap-3">
              {faviconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={faviconUrl}
                  alt=""
                  className="h-8 w-8 rounded border-2 border-[var(--border)] bg-white object-contain"
                />
              ) : null}
              <Input name="favicon" type="file" accept="image/png,image/x-icon,image/svg+xml,image/webp" />
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">ICO/PNG/SVG · max 512KB</p>
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save branding"}
            </Button>
          </div>
        </form>
        {message ? <p className="mt-3 text-sm font-semibold">{message}</p> : null}
      </CardContent>
    </Card>
  );
}
