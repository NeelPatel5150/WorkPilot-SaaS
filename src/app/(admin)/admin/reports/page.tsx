import Link from "next/link";
import { requireUser } from "@/lib/session";
import { employeeRepo } from "@/repositories/employee.repository";
import { attendanceRepo } from "@/repositories/attendance.repository";
import { leaveRepo } from "@/repositories/leave.repository";
import { PageHeader, StatCard } from "@/components/shared/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const exports = [
  { kind: "attendance", label: "Attendance" },
  { kind: "leave", label: "Leaves" },
  { kind: "employees", label: "Employees" },
  { kind: "late", label: "Late arrivals" },
] as const;

export default async function AdminReportsPage() {
  const user = await requireUser();
  const companyId = user.companyId!;
  const [employees, present, pending, types] = await Promise.all([
    employeeRepo.count(companyId),
    attendanceRepo.countPresentToday(companyId),
    leaveRepo.countPending(companyId),
    leaveRepo.listTypes(companyId),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Snapshot + CSV / Excel exports."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Headcount" value={employees} />
        <StatCard label="Present today" value={present} />
        <StatCard label="Open leave requests" value={pending} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Export</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {exports.map((item) => (
            <div
              key={item.kind}
              className="flex flex-wrap items-center justify-between gap-2 border-2 border-[var(--border)] rounded-xl p-3"
            >
              <span className="font-bold">{item.label}</span>
              <div className="flex gap-2">
                <Link href={`/api/reports/export?kind=${item.kind}&format=csv`}>
                  <Button size="sm" variant="outline" type="button">
                    CSV
                  </Button>
                </Link>
                <Link href={`/api/reports/export?kind=${item.kind}&format=xlsx`}>
                  <Button size="sm" type="button">
                    Excel
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Leave types configured</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {types.map((t) => (
              <li
                key={t.id}
                className="flex justify-between border-b-2 border-[var(--border)] py-2 text-sm"
              >
                <span className="font-bold">{t.name}</span>
                <span>{t.defaultDays} days / year</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
