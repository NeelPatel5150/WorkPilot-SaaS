"use client";

import Link from "next/link";
import { LogOut, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import type { NavItem } from "@/config/nav";
import { navIcons } from "@/components/layout/nav-icons";
import { NotificationBell } from "@/components/layout/notification-bell";
import { cn } from "@/lib/utils";
import { toastSuccess } from "@/store/toast";

export function Header({
  title,
  brand,
  logoUrl,
  userName,
  userImage,
  items,
  notificationsHref,
}: {
  title: string;
  brand: string;
  logoUrl?: string | null;
  userName: string;
  userImage?: string | null;
  items: NavItem[];
  notificationsHref: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirmOut, setConfirmOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!confirmOut) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !signingOut) setConfirmOut(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [confirmOut, signingOut]);

  function doSignOut() {
    setSigningOut(true);
    signOut({
      fetchOptions: {
        onSuccess: () => {
          toastSuccess("Signed out");
          window.location.href = "/login";
        },
        onError: () => {
          setSigningOut(false);
          setConfirmOut(false);
        },
      },
    });
  }

  const signOutModal =
    mounted && confirmOut
      ? createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 p-4"
            onClick={() => {
              if (!signingOut) setConfirmOut(false);
            }}
          >
            <div
              className="w-full max-w-sm rounded-2xl border-2 border-[var(--border)] bg-white p-5 shadow-[8px_8px_0_0_var(--border)]"
              style={{ backgroundImage: "var(--card-shine)" }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="signout-title"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 id="signout-title" className="text-lg font-black">
                Sign out?
              </h3>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                You will need to sign in again to access the {title.toLowerCase()}{" "}
                portal.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  className="cursor-pointer"
                  disabled={signingOut}
                  onClick={doSignOut}
                >
                  {signingOut ? "Signing out…" : "Yes, sign out"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="cursor-pointer"
                  disabled={signingOut}
                  onClick={() => setConfirmOut(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <header
      className="z-20 shrink-0 border-b-2 border-[var(--border)] backdrop-blur-md"
      style={{
        backgroundImage:
          "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, color-mix(in srgb, var(--secondary) 75%, white) 100%)",
      }}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="cursor-pointer rounded-xl border-2 border-[var(--border)] bg-white p-2 shadow-[3px_3px_0_0_var(--border)] md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-[var(--border)] bg-white shadow-[2px_2px_0_0_var(--border)]">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={brand} className="h-full w-full object-contain p-0.5" />
              ) : (
                <span className="text-sm font-black text-[var(--primary)]">
                  {brand.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
                {brand}
              </p>
              <h2 className="text-lg font-black leading-tight">{title}</h2>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell href={notificationsHref} />
          <span className="hidden items-center gap-2 rounded-full border-2 border-[var(--border)] bg-white py-1 pl-1 pr-3 text-sm font-semibold shadow-[2px_2px_0_0_var(--border)] sm:inline-flex">
            <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-[var(--border)] bg-[var(--secondary)] text-xs font-black">
              {userImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={userImage} alt="" className="h-full w-full object-cover" />
              ) : (
                userName.charAt(0).toUpperCase()
              )}
            </span>
            {userName}
          </span>
          <Button
            variant="outline"
            size="sm"
            type="button"
            className="cursor-pointer"
            onClick={() => setConfirmOut(true)}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </div>
      {open && (
        <nav className="space-y-1 border-t-2 border-[var(--border)] bg-white/95 p-3 md:hidden">
          {items.map((item) => {
            const Icon = navIcons[item.icon];
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border-2 border-transparent px-3 py-2.5 text-sm font-bold hover:border-[var(--border)] hover:bg-[var(--muted)]"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}
      {signOutModal}
    </header>
  );
}
