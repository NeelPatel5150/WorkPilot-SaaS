"use client";

import { Toaster } from "@/components/shared/toaster";
import { PwaRegister } from "@/components/pwa/register-sw";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
      <PwaRegister />
    </>
  );
}
