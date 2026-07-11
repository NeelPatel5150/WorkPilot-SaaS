import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "nb-input flex h-11 w-full px-3 py-2 text-sm outline-none placeholder:text-[var(--muted-foreground)] focus:ring-2 focus:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";
