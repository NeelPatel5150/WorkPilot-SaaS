"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaRegister() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);

    function onBip(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      const dismissed = sessionStorage.getItem("wp-pwa-dismiss");
      if (!dismissed) setShow(true);
    }
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  if (!show || !deferred) return null;

  return (
    <div className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-[120] mx-auto max-w-md md:inset-x-auto md:right-4 md:left-auto">
      <div
        className="flex items-start gap-3 rounded-2xl border-2 border-[var(--border)] bg-white p-3 shadow-[6px_6px_0_0_var(--border)]"
        style={{ backgroundImage: "var(--card-shine)" }}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--border)] bg-[var(--secondary)]">
          <Download className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black">Install app</p>
          <p className="text-xs text-[var(--muted-foreground)]">
            Add to your home screen for one-tap punch &amp; leave.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={async () => {
                await deferred.prompt();
                await deferred.userChoice;
                setShow(false);
                setDeferred(null);
              }}
            >
              Install
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                sessionStorage.setItem("wp-pwa-dismiss", "1");
                setShow(false);
              }}
            >
              Not now
            </Button>
          </div>
        </div>
        <button
          type="button"
          className="rounded-lg p-1 text-[var(--muted-foreground)]"
          aria-label="Dismiss"
          onClick={() => {
            sessionStorage.setItem("wp-pwa-dismiss", "1");
            setShow(false);
          }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
