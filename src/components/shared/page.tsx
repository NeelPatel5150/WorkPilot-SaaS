import { Card } from "@/components/ui/card";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col items-start gap-3 border-dashed p-8">
      <h3 className="text-lg font-black">{title}</h3>
      <p className="max-w-md text-sm text-[var(--muted-foreground)]">{description}</p>
      {action}
    </Card>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card className="relative overflow-hidden !pt-6">
      <div
        aria-hidden
        className="nb-stat-accent absolute inset-x-0 top-0 z-10 h-2"
      />
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black tracking-tight">{value}</p>
      {hint ? (
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">{hint}</p>
      ) : null}
    </Card>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-black tracking-tight md:text-3xl">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{description}</p>
        ) : null}
        <div className="nb-stat-accent mt-3 h-1.5 w-16 rounded-full" />
      </div>
      {actions}
    </div>
  );
}
