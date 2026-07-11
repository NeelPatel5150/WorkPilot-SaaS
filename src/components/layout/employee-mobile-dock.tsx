"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Clock, House, CircleHelp, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/employee/dashboard", label: "Home", icon: House },
  { href: "/employee/attendance", label: "Punch", icon: Clock },
  { href: "/employee/leaves", label: "Leave", icon: CalendarDays },
  { href: "/employee/how-to-use", label: "Guide", icon: CircleHelp },
  { href: "/employee/profile", label: "Me", icon: UserRound },
];

export function EmployeeMobileDock() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-[var(--border)] bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-1 shadow-[0_-4px_0_0_var(--border)] backdrop-blur md:hidden"
      style={{ backgroundImage: "var(--card-shine)" }}
      aria-label="Quick actions"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-black uppercase tracking-wide",
                  active
                    ? "bg-[var(--primary)] text-white shadow-[2px_2px_0_0_var(--border)]"
                    : "text-[var(--muted-foreground)]"
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
