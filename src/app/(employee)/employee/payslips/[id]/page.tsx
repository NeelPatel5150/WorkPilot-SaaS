import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getMySalarySlip } from "@/services/payroll.service";
import { PageHeader } from "@/components/shared/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default async function EmployeePayslipDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const slip = await getMySalarySlip(user.companyId!, user.id, user.role, id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${MONTHS[slip.month - 1]} ${slip.year}`}
        description={`${slip.company.name} salary slip`}
        actions={
          <div className="flex items-center gap-3">
            <a
              href={`/api/payslips/${slip.id}/print`}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-bold underline"
            >
              Download PDF
            </a>
            <Link href="/employee/payslips" className="text-sm font-bold underline">
              Back
            </Link>
          </div>
        }
      />
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          {slip.company.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/brand/icon?kind=logo&companyId=${slip.companyId}`}
              alt=""
              className="h-12 w-12 rounded-xl border-2 border-[var(--border)] object-contain p-1"
            />
          ) : null}
          <div>
            <CardTitle>{slip.company.name}</CardTitle>
            {slip.company.address ? (
              <p className="text-sm text-[var(--muted-foreground)]">{slip.company.address}</p>
            ) : null}
            <p className="text-sm text-[var(--muted-foreground)]">
              {slip.employee.firstName} {slip.employee.lastName} · {slip.employee.employeeCode}
            </p>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <p>
            <span className="font-bold">Working days:</span> {slip.workingDays}
          </p>
          <p>
            <span className="font-bold">Present:</span> {slip.presentDays}
          </p>
          <p>
            <span className="font-bold">LOP days:</span> {slip.lopDays}
          </p>
          <p>
            <span className="font-bold">OT hours:</span> {slip.overtimeHours}
          </p>
          <p>
            <span className="font-bold">Basic:</span> {slip.basic}
          </p>
          <p>
            <span className="font-bold">Allowances:</span> {slip.allowances}
          </p>
          <p>
            <span className="font-bold">PF:</span> {slip.pf}
          </p>
          <p>
            <span className="font-bold">ESI:</span> {slip.esi}
          </p>
          <p>
            <span className="font-bold">TDS:</span> {slip.tds}
          </p>
          <p>
            <span className="font-bold">Other deductions:</span> {slip.deductions}
          </p>
          <p className="sm:col-span-2 text-2xl font-black">
            Net pay: {slip.netPay}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
