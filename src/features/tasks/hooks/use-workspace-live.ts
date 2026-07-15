"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Keeps workspace boards fresh:
 * - SSE workspace events (same Node process)
 * - Visible-tab polling fallback (works across Vercel instances)
 */
export function useWorkspaceLive(enabled = true, pollMs = 12000) {
  const router = useRouter();
  const lastRefresh = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    function refresh() {
      const now = Date.now();
      if (now - lastRefresh.current < 1500) return;
      lastRefresh.current = now;
      router.refresh();
    }

    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/notifications/stream");
      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data) as { type?: string };
          if (data.type === "workspace") refresh();
        } catch {
          /* ignore malformed */
        }
      };
    } catch {
      /* EventSource unavailable */
    }

    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, pollMs);

    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);

    return () => {
      es?.close();
      window.clearInterval(poll);
      window.removeEventListener("focus", onFocus);
    };
  }, [enabled, pollMs, router]);
}
