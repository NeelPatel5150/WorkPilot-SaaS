"use client";

import { useTransition } from "react";
import { decideLeaveAction } from "@/features/shared/actions";
import { Button } from "@/components/ui/button";
import { toastError, toastSuccess } from "@/store/toast";

export function LeaveDecisionButtons({ requestId }: { requestId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        disabled={pending}
        type="button"
        onClick={() =>
          startTransition(async () => {
            const res = await decideLeaveAction(requestId, "APPROVED");
            if (res && "error" in res) toastError("Approve failed", res.error);
            else toastSuccess("Leave approved");
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
            const res = await decideLeaveAction(requestId, "REJECTED");
            if (res && "error" in res) toastError("Reject failed", res.error);
            else toastSuccess("Leave rejected");
          })
        }
      >
        Reject
      </Button>
    </div>
  );
}
