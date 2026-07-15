"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/config/nav";
import { navIcons } from "@/components/layout/nav-icons";

/** Prefetch high-traffic pages so nav often hits warm RSC. */
const PREFETCH_HREFS = new Set([
  "/admin/dashboard",
  "/admin/approvals",
  "/admin/attendance",
  "/admin/employees/manage",
  "/admin/leaves",
  "/admin/payroll",
  "/admin/workspace",
  "/admin/exceptions",
  "/employee/dashboard",
  "/employee/attendance",
  "/employee/leaves",
  "/employee/workspace",
  "/employee/payslips",
]);

function isActivePath(pathname: string, href: string) {
  if (pathname === href) return true;
  // Employee detail pages live under /admin/employees/[id] — highlight Manage.
  if (href === "/admin/employees/manage") {
    return (
      pathname.startsWith("/admin/employees/manage") ||
      (/^\/admin\/employees\/[^/]+$/.test(pathname) &&
        pathname !== "/admin/employees/add")
    );
  }
  return pathname.startsWith(`${href}/`);
}

export function Sidebar({
  items,
  brand,
  logoUrl,
  userName,
  userImage,
}: {
  items: NavItem[];
  brand: string;
  logoUrl?: string | null;
  userName?: string;
  userImage?: string | null;
}) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const item of items) {
      if (!item.children?.length) continue;
      const groupActive = item.children.some((c) => isActivePath(pathname, c.href));
      if (groupActive) next[item.href] = true;
    }
    setOpenGroups((prev) => ({ ...prev, ...next }));
  }, [pathname, items]);

  return (
    <aside
      className="nb-sidebar hidden h-full w-60 shrink-0 flex-col overflow-hidden border-r-2 border-[var(--border)] md:flex"
      style={{ backgroundImage: "var(--sidebar-shine)" }}
    >
      <div className="shrink-0 px-3 pt-3 pr-5">
        <div className="flex items-center gap-2.5 rounded-xl border-2 border-[var(--border)] bg-white/90 p-2.5 shadow-[3px_3px_0_0_var(--border)] backdrop-blur">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-[var(--border)] bg-white">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={brand} className="h-full w-full object-contain p-0.5" />
            ) : (
              <span className="text-xs font-black text-[var(--primary)]">
                {brand.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="whitespace-nowrap text-[8px] font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
              Powered by WorkPilot
            </p>
            <h1 className="truncate text-base font-black leading-tight text-[var(--foreground)]">
              {brand}
            </h1>
            <div className="nb-stat-accent mt-1.5 h-1 w-10 rounded-full" />
          </div>
        </div>
      </div>

      <nav className="nb-sidebar-nav mt-3 min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 pr-5 pb-3">
        {items.map((item) => {
          const Icon = navIcons[item.icon];
          const hasChildren = Boolean(item.children?.length);

          if (hasChildren && item.children) {
            const groupOpen =
              openGroups[item.href] ??
              item.children.some((c) => isActivePath(pathname, c.href));
            const groupActive = item.children.some((c) => isActivePath(pathname, c.href));

            return (
              <div key={item.href} className="space-y-1">
                <button
                  type="button"
                  onClick={() =>
                    setOpenGroups((prev) => ({
                      ...prev,
                      [item.href]: !(prev[item.href] ?? groupOpen),
                    }))
                  }
                  className={cn(
                    "mr-1.5 flex max-w-[calc(100%-0.375rem)] w-full cursor-pointer items-center gap-2 rounded-lg border-2 px-2 py-1.5 text-left text-[13px] font-bold transition-all",
                    groupActive
                      ? "border-[var(--border)] bg-white/90"
                      : "border-transparent text-[var(--foreground)] hover:border-[var(--border)] hover:bg-white/80"
                  )}
                  aria-expanded={groupOpen}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 transition-transform",
                      groupOpen ? "rotate-180" : null
                    )}
                  />
                </button>
                {groupOpen ? (
                  <div className="ml-3 space-y-1 border-l-2 border-[var(--border)]/40 pl-2">
                    {item.children.map((child) => {
                      const active = isActivePath(pathname, child.href);
                      const pending = pendingHref === child.href;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          prefetch={PREFETCH_HREFS.has(child.href)}
                          onClick={() => {
                            if (!active) setPendingHref(child.href);
                          }}
                          className={cn(
                            "flex cursor-pointer items-center rounded-lg border-2 px-2 py-1.5 text-[12px] font-bold transition-all",
                            active || pending
                              ? "nb-nav-active"
                              : "border-transparent text-[var(--foreground)] hover:border-[var(--border)] hover:bg-white/80",
                            pending && !active ? "opacity-80" : null
                          )}
                        >
                          <span
                            className={
                              active || pending
                                ? "text-white"
                                : "text-[var(--foreground)]"
                            }
                          >
                            {child.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          }

          const active = isActivePath(pathname, item.href);
          const pending = pendingHref === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={PREFETCH_HREFS.has(item.href)}
              onClick={() => {
                if (!active) setPendingHref(item.href);
              }}
              className={cn(
                "mr-1.5 flex max-w-[calc(100%-0.375rem)] cursor-pointer items-center gap-2 rounded-lg border-2 px-2 py-1.5 text-[13px] font-bold transition-all",
                active || pending
                  ? "nb-nav-active"
                  : "border-transparent text-[var(--foreground)] hover:border-[var(--border)] hover:bg-white/80",
                pending && !active ? "opacity-80" : null
              )}
            >
              <Icon
                className={cn(
                  "h-3.5 w-3.5 shrink-0",
                  active || pending ? "text-white" : "text-[var(--foreground)]"
                )}
              />
              <span
                className={
                  active || pending ? "text-white" : "text-[var(--foreground)]"
                }
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {userName ? (
        <div className="shrink-0 border-t-2 border-[var(--border)]/40 px-3 py-3 pr-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--border)] bg-[var(--secondary)] text-xs font-black shadow-[2px_2px_0_0_var(--border)]">
              {userImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={userImage} alt="" className="h-full w-full object-cover" />
              ) : (
                userName.charAt(0).toUpperCase()
              )}
            </div>
            <p className="truncate text-xs font-bold">{userName}</p>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
