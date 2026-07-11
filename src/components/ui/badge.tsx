import { cn } from "@/lib/utils";

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg border-2 border-[var(--border)] px-2.5 py-0.5 text-xs font-bold",
        className
      )}
      {...props}
    />
  );
}
