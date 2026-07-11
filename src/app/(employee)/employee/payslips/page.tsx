import Link from "next/link";
import { requireUser } from "@/lib/session";
import { listMySalarySlips } from "@/services/payroll.service";
import { PageHeader, EmptyState } from "@/components/shared/page";
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

export default async function EmployeePayslipsPage() {
  const user = await requireUser();
  const slips = await listMySalarySlips(user.companyId!, user.id, user.role);

  return (
    <div className="space-y-6">
      <PageHeader title="Payslips" description="Your published salary slips." />
      {slips.length === 0 ? (
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
              {slips.map((s) => (
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
                    <Link href={`/employee/payslips/${s.id}`} className="text-xs font-bold underline">
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
