"use client";

import { useTransition } from "react";
import { checkInAction, checkOutAction } from "@/features/shared/actions";
import { Button } from "@/components/ui/button";
import { toastError, toastSuccess } from "@/store/toast";

function getLocation(): Promise<{ lat?: number; lng?: number }> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({});
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve({}),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });
}

export function AttendanceActions() {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const loc = await getLocation();
            const fd = new FormData();
            if (loc.lat != null) fd.set("lat", String(loc.lat));
            if (loc.lng != null) fd.set("lng", String(loc.lng));
            const res = await checkInAction(fd);
            if (res && "error" in res) toastError("Check-in failed", res.error);
            else toastSuccess("Checked in", "Have a productive day.");
          })
        }
      >
        Check in
      </Button>
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await checkOutAction();
            if (res && "error" in res) toastError("Check-out failed", res.error);
            else toastSuccess("Checked out", "See you tomorrow.");
          })
        }
      >
        Check out
      </Button>
    </div>
  );
}
