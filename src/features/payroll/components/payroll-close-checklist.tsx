import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

type Summary = {
  pendingExceptions: number;
  slipCount: number;
  draftCount: number;
  publishedCount: number;
  totalLop: number;
};

function Step({
  n,
  title,
  detail,
  done,
  href,
}: {
  n: number;
  title: string;
  detail: string;
  done: boolean;
  href?: string;
}) {
  const body = (
    <div
      className={`rounded-xl border-2 px-3 py-2 ${
        done
          ? "border-[var(--primary)] bg-[var(--secondary)]/50"
          : "border-[var(--border)] bg-white"
      }`}
    >
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
        Step {n}
      </p>
      <p className="font-black">{title}</p>
      <p className="text-xs text-[var(--muted-foreground)]">{detail}</p>
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block hover:opacity-90">
        {body}
      </Link>
    );
  }
  return body;
}

export function PayrollCloseChecklist({
  monthLabel,
  summary,
}: {
  monthLabel: string;
  summary: Summary;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 pt-4">
        <div>
          <p className="text-sm font-black">Month-close checklist · {monthLabel}</p>
          <p className="text-xs text-[var(--muted-foreground)]">
            Clear exceptions → generate drafts → publish. No Excel needed.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Step
            n={1}
            title="Exceptions"
            detail={
              summary.pendingExceptions === 0
                ? "None pending"
                : `${summary.pendingExceptions} pending — fix first`
            }
            done={summary.pendingExceptions === 0}
            href="/admin/exceptions"
          />
          <Step
            n={2}
            title="LOP ready"
            detail={
              summary.slipCount === 0
                ? "Generate to compute LOP"
                : `${summary.totalLop} LOP days across slips`
            }
            done={summary.slipCount > 0}
          />
          <Step
            n={3}
            title="Draft slips"
            detail={
              summary.slipCount === 0
                ? "Not generated yet"
                : `${summary.draftCount} draft · ${summary.slipCount} total`
            }
            done={summary.slipCount > 0}
          />
          <Step
            n={4}
            title="Publish"
            detail={
              summary.publishedCount === 0
                ? "None published"
                : `${summary.publishedCount} published`
            }
            done={summary.publishedCount > 0}
          />
        </div>
      </CardContent>
    </Card>
  );
}
