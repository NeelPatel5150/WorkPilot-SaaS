import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

type Revision = {
  id: string;
  previousBasic: number;
  newBasic: number;
  effectiveFrom: Date;
  note: string | null;
  createdAt: Date;
};

function money(n: number) {
  return n.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}

export function SalaryRevisionList({ revisions }: { revisions: Revision[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Salary revision history</CardTitle>
      </CardHeader>
      <CardContent>
        {revisions.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            No revisions yet. Changes to basic salary appear here.
          </p>
        ) : (
          <ul className="space-y-3">
            {revisions.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border-2 border-[var(--border)] px-3 py-2 text-sm"
              >
                <p className="font-bold">
                  {money(r.previousBasic)} → {money(r.newBasic)}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Effective {formatDate(r.effectiveFrom)}
                  {r.note ? ` · ${r.note}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
