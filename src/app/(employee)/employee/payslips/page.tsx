import Link from "next/link";
import { requireUser } from "@/lib/session";
import { listMySalarySlips } from "@/services/payroll.service";
import { PageHeader, EmptyState, StatCard } from "@/components/shared/page";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export default async function EmployeePayslipsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const slips = await listMySalarySlips(user.companyId!, user.id, user.role);
  const years = [...new Set(slips.map((s) => s.year))].sort((a, b) => b - a);
  const year =
    sp.year && years.includes(Number(sp.year))
      ? Number(sp.year)
      : years[0] ?? new Date().getFullYear();
  const yearSlips = slips.filter((s) => s.year === year);
  const ytdGross = yearSlips.reduce(
    (n, s) => n + s.basic + s.allowances,
    0
  );
  const ytdNet = yearSlips.reduce((n, s) => n + s.netPay, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Payslips" description="Your published salary slips." />
      {years.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {years.map((y) => (
            <Link
              key={y}
              href={`/employee/payslips?year=${y}`}
              className={`rounded-lg border-2 px-3 py-1 text-sm font-bold ${
                y === year
                  ? "border-[var(--primary)] bg-[var(--secondary)]"
                  : "border-[var(--border)]"
              }`}
            >
              {y}
            </Link>
          ))}
        </div>
      ) : null}
      {yearSlips.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard label={`${year} YTD gross`} value={Math.round(ytdGross)} />
          <StatCard label={`${year} YTD net`} value={Math.round(ytdNet)} />
        </div>
      ) : null}
      {yearSlips.length === 0 ? (
        <EmptyState
          title="No payslips yet"
          description="When HR publishes payroll, your slips appear here."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Present</TableHead>
                <TableHead>Net pay</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {yearSlips.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-bold">
                    {MONTHS[s.month - 1]} {s.year}
                  </TableCell>
                  <TableCell>
                    {s.presentDays}/{s.workingDays}
                  </TableCell>
                  <TableCell className="font-black">{s.netPay}</TableCell>
                  <TableCell>
                    <Badge>{s.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/employee/payslips/${s.id}`}
                      className="text-sm font-bold underline"
                    >
                      View
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
