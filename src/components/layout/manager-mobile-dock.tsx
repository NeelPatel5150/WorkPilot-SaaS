"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { CalendarCheck, Clock, House, ListTodo, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin/dashboard", label: "Home", icon: House, prefetch: true },
  { href: "/admin/approvals", label: "Approve", icon: CalendarCheck, prefetch: true },
  { href: "/admin/attendance", label: "Team", icon: Clock, prefetch: true },
  { href: "/admin/workspace", label: "Work", icon: ListTodo, prefetch: true },
  { href: "/admin/notifications", label: "Alerts", icon: Bell, prefetch: false },
];

export function ManagerMobileDock() {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-[var(--border)] bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-1 shadow-[0_-4px_0_0_var(--border)] backdrop-blur md:hidden"
      style={{ backgroundImage: "var(--card-shine)" }}
      aria-label="Manager quick actions"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const pending = pendingHref === item.href;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                prefetch={item.prefetch}
                onClick={() => {
                  if (!active) setPendingHref(item.href);
                }}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-black uppercase tracking-wide",
                  active || pending
                    ? "bg-[var(--primary)] text-white shadow-[2px_2px_0_0_var(--border)]"
                    : "text-[var(--muted-foreground)]",
                  pending && !active ? "opacity-80" : null
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
