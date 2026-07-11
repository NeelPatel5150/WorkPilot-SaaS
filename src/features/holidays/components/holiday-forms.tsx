"use client";

import { useState, useTransition } from "react";
import { createHolidayAction, deleteHolidayAction } from "@/features/shared/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function HolidayForms({ deleteId }: { deleteId?: string }) {
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
            const res = await deleteHolidayAction(deleteId);
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
        <CardTitle>Add holiday</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-3 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const fd = new FormData(e.currentTarget);
            const form = e.currentTarget;
            startTransition(async () => {
              const res = await createHolidayAction(fd);
              if (res && "error" in res) setError(res.error);
              else form.reset();
            });
          }}
        >
          <div className="space-y-1">
            <Label>Name</Label>
            <Input name="name" required placeholder="Diwali" />
          </div>
          <div className="space-y-1">
            <Label>Date</Label>
            <Input name="date" type="date" required />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Add"}
            </Button>
          </div>
        </form>
        {error ? (
          <p className="mt-2 text-sm font-semibold text-[var(--destructive)]">{error}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
