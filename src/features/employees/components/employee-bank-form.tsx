"use client";

import { useTransition } from "react";
import { updateEmployeeBankAction } from "@/features/shared/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toastError, toastSuccess } from "@/store/toast";

export function EmployeeBankForm({
  employeeId,
  bankAccountName,
  bankName,
  bankAccountNumber,
  bankIfsc,
  panNumber,
  uanNumber,
  pfEligible,
  esiEligible,
}: {
  employeeId: string;
  bankAccountName: string;
  bankName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  panNumber: string;
  uanNumber: string;
  pfEligible: boolean;
  esiEligible: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bank &amp; compliance IDs</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            fd.set("employeeId", employeeId);
            startTransition(async () => {
              const res = await updateEmployeeBankAction(fd);
              if (res && "error" in res) toastError("Save failed", res.error);
              else toastSuccess("Saved", "Bank and compliance details updated.");
            });
          }}
        >
          <div className="space-y-1 sm:col-span-2">
            <Label>Account holder name</Label>
            <Input
              name="bankAccountName"
              defaultValue={bankAccountName}
              placeholder="As per bank account"
            />
          </div>
          <div className="space-y-1">
            <Label>Bank name</Label>
            <Input name="bankName" defaultValue={bankName} placeholder="e.g. HDFC Bank" />
          </div>
          <div className="space-y-1">
            <Label>IFSC</Label>
            <Input
              name="bankIfsc"
              defaultValue={bankIfsc}
              placeholder="e.g. HDFC0001234"
              className="uppercase"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Account number</Label>
            <Input
              name="bankAccountNumber"
              defaultValue={bankAccountNumber}
              placeholder="Bank account number"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1">
            <Label>PAN</Label>
            <Input
              name="panNumber"
              defaultValue={panNumber}
              placeholder="ABCDE1234F"
              className="uppercase"
            />
          </div>
          <div className="space-y-1">
            <Label>UAN (PF)</Label>
            <Input name="uanNumber" defaultValue={uanNumber} placeholder="Universal Account Number" />
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2">
            <input type="checkbox" name="pfEligible" value="1" defaultChecked={pfEligible} />
            PF eligible
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2">
            <input type="checkbox" name="esiEligible" value="1" defaultChecked={esiEligible} />
            ESI eligible
          </label>
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
