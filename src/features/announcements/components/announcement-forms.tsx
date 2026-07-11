"use client";

import { useState, useTransition } from "react";
import {
  createAnnouncementAction,
  deleteAnnouncementAction,
} from "@/features/shared/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AnnouncementForms({ deleteId }: { deleteId?: string }) {
  const [error, setError] = useState<string | null>(null);
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
            const res = await deleteAnnouncementAction(deleteId);
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
        <CardTitle>New announcement</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const fd = new FormData(e.currentTarget);
            const form = e.currentTarget;
            startTransition(async () => {
              const res = await createAnnouncementAction(fd);
              if (res && "error" in res) setError(res.error);
              else form.reset();
            });
          }}
        >
          <div className="space-y-1">
            <Label>Title</Label>
            <Input name="title" required placeholder="Office closed Friday" />
          </div>
          <div className="space-y-1">
            <Label>Body</Label>
            <Textarea name="body" required placeholder="Details for the team…" />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Posting…" : "Publish"}
          </Button>
        </form>
        {error ? (
          <p className="mt-2 text-sm font-semibold text-[var(--destructive)]">{error}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
