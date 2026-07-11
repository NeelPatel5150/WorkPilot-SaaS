import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      "nb-input flex min-h-[96px] w-full px-3 py-2 text-sm outline-none placeholder:text-[var(--muted-foreground)] focus:ring-2 focus:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = "Textarea";
