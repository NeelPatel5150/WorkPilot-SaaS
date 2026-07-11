"use client";

import { useState, useTransition } from "react";
import {
  createDepartmentAction,
  deleteDepartmentAction,
} from "@/features/shared/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DepartmentForms({ deleteId }: { deleteId?: string }) {
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
            const res = await deleteDepartmentAction(deleteId);
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
        <CardTitle>New department</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const fd = new FormData(e.currentTarget);
            const form = e.currentTarget;
            startTransition(async () => {
              const res = await createDepartmentAction(fd);
              if (res && "error" in res) setError(res.error);
              else form.reset();
            });
          }}
        >
          <div className="flex-1 space-y-1">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required placeholder="Engineering" />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Add"}
          </Button>
        </form>
        {error ? (
          <p className="mt-2 text-sm font-semibold text-[var(--destructive)]">{error}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
