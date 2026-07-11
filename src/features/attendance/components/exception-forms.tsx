"use client";

import { useState, useTransition } from "react";
import {
  decideExceptionAction,
  requestExceptionAction,
} from "@/features/shared/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toastError, toastSuccess } from "@/store/toast";

const EXCEPTION_TYPES = [
  { value: "MISSING_CHECKOUT", label: "Missing checkout" },
  { value: "FORGOT_PUNCH", label: "Forgot punch" },
  { value: "WFH", label: "Work from home" },
  { value: "ADJUSTMENT", label: "Adjustment" },
] as const;

export function ExceptionForms() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request attendance exception</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-3 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const fd = new FormData(e.currentTarget);
            const form = e.currentTarget;
            startTransition(async () => {
              const res = await requestExceptionAction(fd);
              if (res && "error" in res) {
                setError(res.error);
                toastError("Request failed", res.error);
              } else {
                form.reset();
                toastSuccess("Exception submitted", "Waiting for admin review.");
              }
            });
          }}
        >
          <div className="space-y-1 md:col-span-2">
            <Label>Type</Label>
            <Select name="type" required defaultValue="">
              <option value="" disabled>
                Select exception type
              </option>
              {EXCEPTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Date</Label>
            <Input name="date" type="date" required placeholder="Date of issue" />
          </div>
          <div className="space-y-1">
            <Label>Proposed check-in</Label>
            <Input
              name="proposedCheckIn"
              type="datetime-local"
              placeholder="Correct check-in time"
            />
          </div>
          <div className="space-y-1">
            <Label>Proposed check-out</Label>
            <Input
              name="proposedCheckOut"
              type="datetime-local"
              placeholder="Correct check-out time"
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Reason</Label>
            <Textarea
              name="reason"
              placeholder="e.g. Phone died — punched in on paper register at 9:15"
            />
          </div>
          <div className="md:col-span-2 flex items-center gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Submitting…" : "Submit request"}
            </Button>
            {error ? (
              <p className="text-sm font-semibold text-[var(--destructive)]">{error}</p>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function ExceptionDecisionButtons({ exceptionId }: { exceptionId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        disabled={pending}
        type="button"
        onClick={() =>
          startTransition(async () => {
            const res = await decideExceptionAction(exceptionId, "APPROVED");
            if (res && "error" in res) toastError("Approve failed", res.error);
            else toastSuccess("Exception approved");
          })
        }
      >
        Approve
      </Button>
      <Button
        size="sm"
        variant="destructive"
        disabled={pending}
        type="button"
        onClick={() =>
          startTransition(async () => {
            const res = await decideExceptionAction(exceptionId, "REJECTED");
            if (res && "error" in res) toastError("Reject failed", res.error);
            else toastSuccess("Exception rejected");
          })
        }
      >
        Reject
      </Button>
    </div>
  );
}
