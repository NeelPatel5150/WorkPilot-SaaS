"use client";

import { create } from "zustand";

export type ToastTone = "success" | "error" | "info";

export type ToastItem = {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
  leaving?: boolean;
};

type ToastStore = {
  toasts: ToastItem[];
  push: (toast: Omit<ToastItem, "id" | "leaving">) => void;
  dismiss: (id: string) => void;
};

let counter = 0;

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  push: (toast) => {
    const id = `toast-${Date.now()}-${counter++}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }].slice(-4),
    }));
    window.setTimeout(() => get().dismiss(id), 3800);
  },
  dismiss: (id) => {
    set((state) => ({
      toasts: state.toasts.map((t) =>
        t.id === id ? { ...t, leaving: true } : t
      ),
    }));
    window.setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 180);
  },
}));

export function toast(
  title: string,
  opts?: { description?: string; tone?: ToastTone }
) {
  useToastStore.getState().push({
    title,
    description: opts?.description,
    tone: opts?.tone ?? "info",
  });
}

export const toastSuccess = (title: string, description?: string) =>
  toast(title, { description, tone: "success" });

export const toastError = (title: string, description?: string) =>
  toast(title, { description, tone: "error" });
