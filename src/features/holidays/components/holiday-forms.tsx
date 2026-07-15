"use client";

import { useState, useTransition } from "react";
import {
  createHolidayAction,
  deleteHolidayAction,
  updateHolidayAction,
} from "@/features/shared/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toastError, toastSuccess } from "@/store/toast";

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
            if (res && "error" in res) {
              setError(res.error);
              toastError("Delete failed", res.error);
            } else {
              toastSuccess("Holiday removed");
            }
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
              if (res && "error" in res) {
                setError(res.error);
                toastError("Could not add", res.error);
              } else {
                form.reset();
                toastSuccess("Holiday added");
              }
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

function toDateInput(value: Date | string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function EditHolidayRow({
  id,
  name,
  date,
}: {
  id: string;
  name: string;
  date: Date | string;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setEditing(true)}
        >
          Edit
        </Button>
        <HolidayForms deleteId={id} />
      </div>
    );
  }

  return (
    <form
      className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-end sm:justify-end"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const fd = new FormData(e.currentTarget);
        fd.set("id", id);
        startTransition(async () => {
          const res = await updateHolidayAction(fd);
          if (res && "error" in res) {
            setError(res.error);
            toastError("Update failed", res.error);
          } else {
            toastSuccess("Holiday updated");
            setEditing(false);
          }
        });
      }}
    >
      <div className="space-y-1">
        <Label htmlFor={`holiday-name-${id}`}>Name</Label>
        <Input
          id={`holiday-name-${id}`}
          name="name"
          required
          defaultValue={name}
          className="min-w-[140px]"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`holiday-date-${id}`}>Date</Label>
        <Input
          id={`holiday-date-${id}`}
          name="date"
          type="date"
          required
          defaultValue={toDateInput(date)}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "…" : "Save"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => {
            setEditing(false);
            setError(null);
          }}
        >
          Cancel
        </Button>
      </div>
      {error ? (
        <p className="w-full text-right text-xs font-semibold text-[var(--destructive)]">
          {error}
        </p>
      ) : null}
    </form>
  );
}
