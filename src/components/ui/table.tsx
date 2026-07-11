import { cn } from "@/lib/utils";

export function Table({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="nb-table-wrap w-full overflow-x-auto">
      <table className={cn("w-full min-w-[520px] caption-bottom text-sm", className)} {...props} />
    </div>
  );
}

export function TableHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("[&_tr]:border-b-2", className)} {...props} />;
}

export function TableBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

export function TableRow({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "border-b-2 border-[var(--border)] transition-colors hover:bg-[var(--muted)]/60",
        className
      )}
      {...props}
    />
  );
}

export function TableHead({
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "h-11 px-3 text-left align-middle text-xs font-black uppercase tracking-wide",
        className
      )}
      {...props}
    />
  );
}

export function TableCell({
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("p-3 align-middle", className)} {...props} />;
}
