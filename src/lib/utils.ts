import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function startOfDayUTC(date = new Date()) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

export function daysBetween(start: Date, end: Date) {
  const ms = startOfDayUTC(end).getTime() - startOfDayUTC(start).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
}

export function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(date: Date | string | null | undefined) {
  if (!date) return "-";
  return new Date(date).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}
