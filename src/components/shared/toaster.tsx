"use client";

import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { useToastStore, type ToastTone } from "@/store/toast";
import { cn } from "@/lib/utils";

const icons: Record<ToastTone, typeof Info> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (!toasts.length) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(100%-2rem,360px)] flex-col gap-3"
      aria-live="polite"
    >
      {toasts.map((item) => {
        const Icon = icons[item.tone];
        return (
          <div
            key={item.id}
            data-leaving={item.leaving ? "true" : "false"}
            className={cn(
              "nb-toast pointer-events-auto flex items-start gap-3 p-4",
              item.tone === "success" && "nb-toast-success",
              item.tone === "error" && "nb-toast-error",
              item.tone === "info" && "nb-toast-info"
            )}
            role="status"
          >
            <Icon className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={2.5} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black leading-tight">{item.title}</p>
              {item.description ? (
                <p className="mt-1 text-xs font-medium text-[var(--muted-foreground)]">
                  {item.description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              className="rounded-lg border-2 border-[var(--border)] bg-white/70 p-1 hover:bg-white"
              onClick={() => dismiss(item.id)}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
