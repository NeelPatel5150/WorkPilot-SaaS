import { requireUser } from "@/lib/session";
import { listSalarySlipsForCompany, isMonthLocked } from "@/services/payroll.service";
import { listEmployees } from "@/services/employee.service";
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
import { GeneratePayrollForm } from "@/features/payroll/components/generate-payroll-form";
import { PayrollSlipActions } from "@/features/payroll/components/payroll-slip-actions";

function currentMonthValue(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function AdminPayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const monthVal =
    sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : currentMonthValue();
  const [y, m] = monthVal.split("-").map(Number);
  const [slips, employees, locked] = await Promise.all([
    listSalarySlipsForCompany(user.companyId!, user.role, y, m),
    listEmployees(user.companyId!, user.role),
    isMonthLocked(user.companyId!, y, m),
  ]);
  const totalNet = slips.reduce((s, r) => s + r.netPay, 0);
  const employeeOptions = employees
    .filter((e) => e.employmentStatus === "ACTIVE")
    .map((e) => ({
      id: e.id,
      label: `${e.firstName} ${e.lastName} · ${e.employeeCode}`,
      basicSalary: e.basicSalary,
    }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll"
        description="Draft slips with LOP / PF / ESI / TDS, edit before publish, then lock the month."
      />
      {locked ? (
        <p className="rounded-xl border-2 border-[var(--border)] bg-white px-4 py-3 text-sm font-bold">
          {m}/{y} is locked - no new edits.
        </p>
      ) : null}
      <GeneratePayrollForm defaultMonth={monthVal} employees={employeeOptions} />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Slips this month" value={slips.length} />
        <StatCard label="Total net pay" value={Math.round(totalNet)} />
        <StatCard label="Month" value={`${m}/${y}${locked ? " · LOCKED" : ""}`} />
      </div>
      {slips.length === 0 ? (
        <EmptyState
          title="No slips yet"
          description="Select an employee, check the attendance summary, then generate."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Present</TableHead>
                <TableHead>LOP</TableHead>
                <TableHead>PF / ESI / TDS</TableHead>
                <TableHead>Net</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slips.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-bold">
                    {s.employee.firstName} {s.employee.lastName}
                  </TableCell>
                  <TableCell>
                    {s.presentDays}/{s.workingDays}
                  </TableCell>
                  <TableCell>{s.lopDays}</TableCell>
                  <TableCell className="text-xs">
                    {s.pf} / {s.esi} / {s.tds}
                  </TableCell>
                  <TableCell className="font-black">{s.netPay}</TableCell>
                  <TableCell>
                    <Badge>{s.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <PayrollSlipActions slip={s} />
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
