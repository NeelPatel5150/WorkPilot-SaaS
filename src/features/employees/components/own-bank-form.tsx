"use client";

import { useTransition } from "react";
import { updateOwnBankAction } from "@/features/shared/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toastError, toastSuccess } from "@/store/toast";

export function OwnBankForm({
  bankAccountName,
  bankName,
  bankAccountNumber,
  bankIfsc,
  panNumber,
  uanNumber,
}: {
  bankAccountName: string;
  bankName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  panNumber: string;
  uanNumber: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bank details</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-xs text-[var(--muted-foreground)]">
          Used for salary credit. Keep IFSC and account number accurate.
        </p>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              const res = await updateOwnBankAction(fd);
              if (res && "error" in res) toastError("Save failed", res.error);
              else toastSuccess("Saved", "Your bank details were updated.");
            });
          }}
        >
          <div className="space-y-1 sm:col-span-2">
            <Label>Account holder name</Label>
            <Input name="bankAccountName" defaultValue={bankAccountName} />
          </div>
          <div className="space-y-1">
            <Label>Bank name</Label>
            <Input name="bankName" defaultValue={bankName} />
          </div>
          <div className="space-y-1">
            <Label>IFSC</Label>
            <Input name="bankIfsc" defaultValue={bankIfsc} className="uppercase" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Account number</Label>
            <Input
              name="bankAccountNumber"
              defaultValue={bankAccountNumber}
              autoComplete="off"
            />
          </div>
          <div className="space-y-1">
            <Label>PAN</Label>
            <Input name="panNumber" defaultValue={panNumber} className="uppercase" />
          </div>
          <div className="space-y-1">
            <Label>UAN</Label>
            <Input name="uanNumber" defaultValue={uanNumber} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save bank details"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
