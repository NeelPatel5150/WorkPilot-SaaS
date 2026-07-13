"use client";

import { useState, useTransition } from "react";
import { uploadDocumentAction, deleteDocumentAction } from "@/features/shared/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DocumentForms({ deleteId }: { deleteId?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  if (deleteId) {
    return (
      <Button
        variant="outline"
        size="sm"
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await deleteDocumentAction(deleteId);
            if (res && "error" in res) setError(res.error);
          })
        }
      >
        Delete
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload document</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            setOk(false);
            const fd = new FormData(e.currentTarget);
            const form = e.currentTarget;
            startTransition(async () => {
              const file = fd.get("file");
              if (file instanceof File && file.size > 10 * 1024 * 1024) {
                setError("Max file size is 10MB");
                return;
              }
              const res = await uploadDocumentAction(fd);
              if (res && "error" in res) setError(res.error);
              else {
                setOk(true);
                form.reset();
              }
            });
          }}
        >
          <div className="min-w-[200px] flex-1 space-y-1">
            <Label>File (max 10MB)</Label>
            <Input name="file" type="file" required />
          </div>
          <div className="space-y-1">
            <Label>Expiry (optional)</Label>
            <Input name="expiresAt" type="date" />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Uploading…" : "Upload"}
          </Button>
        </form>
        <p className="mt-2 text-xs text-[var(--muted-foreground)]">
          Policies, IDs, contracts. HR gets alerts before expiry.
        </p>
        {error ? (
          <p className="mt-2 text-sm font-semibold text-[var(--destructive)]">{error}</p>
        ) : null}
        {ok ? (
          <p className="mt-2 text-sm font-semibold text-[var(--success)]">Uploaded</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
