"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import type { NavItem } from "@/config/nav";
import { navIcons } from "@/components/layout/nav-icons";
import { cn } from "@/lib/utils";

export type CommandItem = {
  id: string;
  label: string;
  href: string;
  group: string;
  keywords: string;
  icon: NavItem["icon"];
};

function flattenNav(items: NavItem[]): CommandItem[] {
  const out: CommandItem[] = [];
  for (const item of items) {
    if (item.children?.length) {
      for (const child of item.children) {
        out.push({
          id: child.href,
          label: child.label,
          href: child.href,
          group: item.label,
          keywords: `${item.label} ${child.label}`.toLowerCase(),
          icon: item.icon,
        });
      }
    } else {
      out.push({
        id: item.href,
        label: item.label,
        href: item.href,
        group: "Pages",
        keywords: item.label.toLowerCase(),
        icon: item.icon,
      });
    }
  }
  return out;
}

function isMacPlatform() {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
}

export function CommandPalette({ items }: { items: NavItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const activeRef = useRef(0);
  const filteredRef = useRef<CommandItem[]>([]);
  const list = useMemo(() => flattenNav(items), [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q) ||
        item.keywords.includes(q) ||
        item.href.toLowerCase().includes(q)
    );
  }, [list, query]);

  activeRef.current = active;
  filteredRef.current = filtered;

  useEffect(() => {
    setMounted(true);
    setIsMac(isMacPlatform());
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (!open) return;

      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        return;
      }

      // Block page/main scroll while palette is open (body overflow alone is not enough).
      const isTypingTarget =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement;

      if (
        e.key === "ArrowUp" ||
        e.key === "ArrowDown" ||
        e.key === "PageUp" ||
        e.key === "PageDown" ||
        e.key === "Home" ||
        e.key === "End"
      ) {
        e.preventDefault();
        e.stopPropagation();
      } else if (e.key === " " && !isTypingTarget) {
        e.preventDefault();
        e.stopPropagation();
      }

      const rows = filteredRef.current;
      if (!rows.length) return;

      if (e.key === "ArrowDown") {
        setActive((i) => (i + 1) % rows.length);
      } else if (e.key === "ArrowUp") {
        setActive((i) => (i - 1 + rows.length) % rows.length);
      } else if (e.key === "Home") {
        setActive(0);
      } else if (e.key === "End") {
        setActive(rows.length - 1);
      } else if (e.key === "Enter") {
        const hit = rows[activeRef.current];
        if (hit) {
          setOpen(false);
          router.push(hit.href);
        }
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, router]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActive(0);
      return;
    }
    const prevBody = document.body.style.overflow;
    const main = document.querySelector("main.nb-scroll") as HTMLElement | null;
    const prevMain = main?.style.overflow ?? "";
    document.body.style.overflow = "hidden";
    if (main) main.style.overflow = "hidden";
    const t = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => {
      document.body.style.overflow = prevBody;
      if (main) main.style.overflow = prevMain;
      window.clearTimeout(t);
    };
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-cmd-index="${active}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open, filtered]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  const shortcut = isMac ? "⌘K" : "Ctrl K";

  const modal =
    mounted && open
      ? createPortal(
          <div
            className="fixed inset-0 z-[220] flex items-start justify-center bg-black/45 p-4 pt-[12vh] sm:pt-[15vh]"
            onClick={() => setOpen(false)}
          >
            <div
              className="w-full max-w-xl overflow-hidden rounded-2xl border-2 border-[var(--border)] bg-white shadow-[10px_10px_0_0_var(--border)]"
              style={{ backgroundImage: "var(--card-shine)" }}
              role="dialog"
              aria-modal="true"
              aria-label="Search portal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 border-b-2 border-[var(--border)] px-3 py-3">
                <Search className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search pages, settings, payroll, tasks…"
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-[var(--muted-foreground)]"
                  // Arrow / Enter handled on window capture so the page behind never scrolls.
                />
                <kbd className="hidden rounded-md border-2 border-[var(--border)] bg-[var(--secondary)] px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-[var(--muted-foreground)] sm:inline">
                  Esc
                </kbd>
              </div>
              <ul ref={listRef} className="max-h-[50vh] overflow-y-auto p-2">
                {filtered.length === 0 ? (
                  <li className="px-3 py-6 text-center text-sm text-[var(--muted-foreground)]">
                    No matches for “{query.trim()}”
                  </li>
                ) : (
                  filtered.map((item, idx) => {
                    const Icon = navIcons[item.icon];
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          data-cmd-index={idx}
                          className={cn(
                            "flex w-full cursor-pointer items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left text-sm font-bold transition",
                            idx === active
                              ? "border-[var(--border)] bg-[var(--secondary)]"
                              : "border-transparent hover:border-[var(--border)] hover:bg-[var(--muted)]"
                          )}
                          onMouseEnter={() => setActive(idx)}
                          onClick={() => go(item.href)}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="min-w-0 flex-1 truncate">{item.label}</span>
                          <span className="truncate text-[10px] font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
                            {item.group}
                          </span>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
              <div className="flex items-center justify-between border-t-2 border-[var(--border)] px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
                <span>↑↓ navigate · Enter open</span>
                <span>{shortcut}</span>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border-2 border-[var(--border)] bg-white px-2.5 text-xs font-bold text-[var(--muted-foreground)] shadow-[2px_2px_0_0_var(--border)] hover:text-[var(--foreground)] sm:px-3"
        aria-label={`Search (${shortcut})`}
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden rounded border border-[var(--border)] bg-[var(--secondary)] px-1.5 py-0.5 text-[10px] font-black text-[var(--foreground)] md:inline">
          {shortcut}
        </kbd>
      </button>
      {modal}
    </>
  );
}
