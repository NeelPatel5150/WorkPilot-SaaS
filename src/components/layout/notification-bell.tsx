"use client";

import { useEffect, useLayoutEffect, useRef, useState, useTransition, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { toast } from "@/store/toast";
import { cn, formatDate } from "@/lib/utils";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/features/shared/actions";

type Item = {
  id: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
};

function shouldRefreshDashboard(title: string, message: string) {
  const text = `${title} ${message}`.toLowerCase();
  return (
    text.includes("leave") ||
    text.includes("check-in") ||
    text.includes("check-out") ||
    text.includes("checked in") ||
    text.includes("checked out") ||
    text.includes("attendance") ||
    text.includes("exception") ||
    text.includes("payroll") ||
    text.includes("salary")
  );
}

export function NotificationBell({ href }: { href: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [pulse, setPulse] = useState(false);
  const [pending, startTransition] = useTransition();
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function refreshList() {
    try {
      const res = await fetch("/api/notifications/recent", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { items: Item[]; unread: number };
      setItems(data.items);
      setUnread(data.unread);
    } catch {
      // ignore
    }
  }

  function scheduleDashboardRefresh() {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => {
      router.refresh();
    }, 300);
  }

  useEffect(() => {
    let es: EventSource | null = null;
    let closed = false;

    refreshList();

    es = new EventSource("/api/notifications/stream");
    es.onmessage = (event) => {
      if (closed) return;
      try {
        const data = JSON.parse(event.data) as
          | { type: "connected" }
          | {
              type: "notification";
              id: string;
              title: string;
              message: string;
              createdAt: string;
            };
        if (data.type !== "notification") return;

        setUnread((n) => n + 1);
        setItems((prev) =>
          [
            {
              id: data.id,
              title: data.title,
              message: data.message,
              readAt: null,
              createdAt: data.createdAt,
            },
            ...prev,
          ].slice(0, 12)
        );
        setPulse(true);
        window.setTimeout(() => setPulse(false), 900);
        toast(data.title, { description: data.message, tone: "info" });
        if (shouldRefreshDashboard(data.title, data.message)) {
          scheduleDashboardRefresh();
        }
      } catch {
        // ignore
      }
    };

    return () => {
      closed = true;
      es?.close();
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [router]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;

    function placePanel() {
      const btn = buttonRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const margin = 12;
      const gap = 8;
      const maxWidth = Math.min(360, window.innerWidth - margin * 2);
      // Prefer aligning the panel's right edge with the bell, then clamp into the viewport
      let left = rect.right - maxWidth;
      left = Math.max(margin, Math.min(left, window.innerWidth - margin - maxWidth));
      const top = Math.min(rect.bottom + gap, window.innerHeight - margin - 120);
      setPanelStyle({
        position: "fixed",
        top,
        left,
        width: maxWidth,
        maxHeight: `min(24rem, calc(100dvh - ${top + margin}px))`,
      });
    }

    placePanel();
    window.addEventListener("resize", placePanel);
    window.addEventListener("scroll", placePanel, true);
    return () => {
      window.removeEventListener("resize", placePanel);
      window.removeEventListener("scroll", placePanel, true);
    };
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) refreshList();
        }}
        className={cn(
          "relative inline-flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[var(--border)] bg-white shadow-[3px_3px_0_0_var(--border)] transition-transform",
          pulse && "scale-110"
        )}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-[var(--border)] bg-[var(--primary)] px-1 text-[10px] font-black text-white shadow-[2px_2px_0_0_var(--border)]">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className="z-50 flex flex-col overflow-hidden rounded-2xl border-2 border-[var(--border)] bg-white shadow-[6px_6px_0_0_var(--border)]"
          style={{ ...panelStyle, backgroundImage: "var(--card-shine)" }}
        >
          <div className="flex shrink-0 items-center justify-between border-b-2 border-[var(--border)] px-4 py-3">
            <p className="text-sm font-black">Notifications</p>
            <button
              type="button"
              disabled={pending || unread === 0}
              className="text-xs font-bold underline disabled:opacity-40"
              onClick={() =>
                startTransition(async () => {
                  await markAllNotificationsReadAction();
                  setUnread(0);
                  setItems((prev) =>
                    prev.map((i) => ({ ...i, readAt: i.readAt ?? new Date().toISOString() }))
                  );
                })
              }
            >
              Mark all read
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <p className="p-4 text-sm text-[var(--muted-foreground)]">
                No notifications yet.
              </p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    "block w-full border-b border-[var(--border)]/40 px-4 py-3 text-left hover:bg-white/70",
                    !item.readAt && "bg-[color:rgba(var(--primary-rgb),0.08)]"
                  )}
                  onClick={() =>
                    startTransition(async () => {
                      if (!item.readAt) {
                        await markNotificationReadAction(item.id);
                        setUnread((n) => Math.max(0, n - 1));
                        setItems((prev) =>
                          prev.map((i) =>
                            i.id === item.id
                              ? { ...i, readAt: new Date().toISOString() }
                              : i
                          )
                        );
                      }
                    })
                  }
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-black">{item.title}</p>
                    {!item.readAt ? (
                      <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[var(--primary)]" />
                    ) : null}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-[var(--muted-foreground)]">
                    {item.message}
                  </p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
                    {formatDate(item.createdAt)}
                  </p>
                </button>
              ))
            )}
          </div>
          <div className="shrink-0 border-t-2 border-[var(--border)] bg-white/80 px-4 py-2 text-center">
            <Link
              href={href}
              className="text-xs font-black underline"
              onClick={() => setOpen(false)}
            >
              Open full inbox
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
