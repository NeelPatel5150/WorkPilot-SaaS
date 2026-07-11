"use client";

import { useTransition } from "react";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/features/shared/actions";
import { Button } from "@/components/ui/button";

export function NotificationActions({ markId }: { markId?: string }) {
  const [pending, startTransition] = useTransition();

  if (markId) {
    return (
      <Button
        size="sm"
        variant="outline"
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await markNotificationReadAction(markId);
          })
        }
      >
        Mark read
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="secondary"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await markAllNotificationsReadAction();
        })
      }
    >
      Mark all read
    </Button>
  );
}
