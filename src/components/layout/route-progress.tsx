"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Thin top progress bar while App Router navigations wait on the server.
 * Makes clicks feel instant even when RSC payload is still loading.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const firstNav = useRef(true);

  useEffect(() => {
    if (firstNav.current) {
      firstNav.current = false;
      return;
    }
    setActive(false);
    setFinishing(true);
    const t = window.setTimeout(() => setFinishing(false), 260);
    return () => window.clearTimeout(t);
  }, [pathname]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const el = (e.target as HTMLElement | null)?.closest?.("a[href]");
      if (!el) return;
      const href = el.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (href.startsWith("mailto:") || href.startsWith("tel:")) return;
      if (/^https?:\/\//i.test(href)) {
        try {
          if (new URL(href).origin !== window.location.origin) return;
        } catch {
          return;
        }
      }
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }
      setFinishing(false);
      setActive(true);
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  if (!active && !finishing) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[90] h-[3px] overflow-hidden"
      aria-hidden
    >
      <div
        className={cn(
          "h-full origin-left bg-[var(--primary)] shadow-[0_0_8px_rgba(var(--primary-rgb),0.55)]",
          active ? "nb-route-progress" : "nb-route-progress-done"
        )}
      />
    </div>
  );
}
