"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/config/nav";
import { navIcons } from "@/components/layout/nav-icons";

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
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
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
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = navIcons[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "mr-1.5 flex max-w-[calc(100%-0.375rem)] cursor-pointer items-center gap-2 rounded-lg border-2 px-2 py-1.5 text-[13px] font-bold transition-all",
                active
                  ? "nb-nav-active"
                  : "border-transparent text-[var(--foreground)] hover:border-[var(--border)] hover:bg-white/80"
              )}
            >
              <Icon
                className={cn(
                  "h-3.5 w-3.5 shrink-0",
                  active ? "text-white" : "text-[var(--foreground)]"
                )}
              />
              <span className={active ? "text-white" : "text-[var(--foreground)]"}>
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
