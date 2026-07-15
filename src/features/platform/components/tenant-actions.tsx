"use client";

import { useTransition } from "react";
import {
  setTenantActiveAction,
  updateTenantBillingAction,
} from "@/features/platform/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { toastError, toastSuccess } from "@/store/toast";

export function TenantActions({
  companyId,
  isActive,
  plan,
  seatLimit,
  billingStatus,
}: {
  companyId: string;
  isActive: boolean;
  plan: string;
  seatLimit: number;
  billingStatus: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      <Button
        type="button"
        size="sm"
        variant={isActive ? "outline" : "secondary"}
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const res = await setTenantActiveAction(companyId, !isActive);
            if (res && "error" in res) toastError("Update failed", res.error);
            else toastSuccess(isActive ? "Suspended" : "Activated");
          });
        }}
      >
        {isActive ? "Suspend" : "Activate"}
      </Button>
      <form
        className="grid max-w-xs gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          fd.set("companyId", companyId);
          startTransition(async () => {
            const res = await updateTenantBillingAction(fd);
            if (res && "error" in res) toastError("Billing update failed", res.error);
            else toastSuccess("Billing updated");
          });
        }}
      >
        <Select name="plan" defaultValue={plan}>
          <option value="TRIAL">TRIAL</option>
          <option value="STARTER">STARTER</option>
          <option value="GROWTH">GROWTH</option>
        </Select>
        <Input
          name="seatLimit"
          type="number"
          min={1}
          defaultValue={seatLimit}
          placeholder="Seats"
        />
        <Select name="billingStatus" defaultValue={billingStatus}>
          <option value="OK">OK</option>
          <option value="PAST_DUE">PAST_DUE</option>
          <option value="SUSPENDED">SUSPENDED</option>
        </Select>
        <Input name="trialEndsAt" type="date" />
        <Button type="submit" size="sm" disabled={pending}>
          Save billing
        </Button>
      </form>
    </div>
  );
}
