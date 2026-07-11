import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap text-sm font-bold transition-all disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--border)]",
  {
    variants: {
      variant: {
        default: "nb-button px-4 py-2.5",
        secondary:
          "border-2 border-[var(--border)] bg-[linear-gradient(180deg,#ffffff_0%,var(--secondary)_100%)] text-[var(--secondary-foreground)] rounded-xl shadow-[4px_4px_0_0_var(--border)] px-4 py-2.5 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_var(--border)]",
        outline:
          "border-2 border-[var(--border)] bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] rounded-xl px-4 py-2.5 shadow-[3px_3px_0_0_var(--border)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_var(--border)]",
        ghost: "rounded-xl px-4 py-2.5 hover:bg-[var(--muted)]",
        destructive:
          "border-2 border-[var(--border)] bg-[linear-gradient(135deg,#ef4444_0%,#dc2626_100%)] text-white rounded-xl shadow-[4px_4px_0_0_var(--border)] px-4 py-2.5 font-bold",
      },
      size: {
        default: "h-11",
        sm: "h-9 px-3 text-xs",
        lg: "h-12 px-6 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
);
Button.displayName = "Button";
