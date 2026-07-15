import Link from "next/link";
import { requireUser } from "@/lib/session";
import { PageHeader, StatCard } from "@/components/shared/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { employeeRepo } from "@/repositories/employee.repository";
import { attendanceRepo } from "@/repositories/attendance.repository";
import { leaveRepo } from "@/repositories/leave.repository";
import { departmentRepo } from "@/repositories/department.repository";
import { holidayRepo } from "@/repositories/holiday.repository";
import { startOfDayUTC, formatTime, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const user = await requireUser();
  const companyId = user.companyId!;
  const tz = user.company?.timezone;
  const today = startOfDayUTC();
  const company = user.company!;
  const trialEnding =
    company.plan === "TRIAL" &&
    company.trialEndsAt &&
    company.trialEndsAt.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;
  const trialExpired =
    company.plan === "TRIAL" &&
    company.trialEndsAt &&
    company.trialEndsAt.getTime() < Date.now();

  const [
    employees,
    present,
    pendingLeaves,
    departments,
    todayAttendance,
    pendingRequests,
    holidays,
  ] = await Promise.all([
    employeeRepo.count(companyId),
    attendanceRepo.countPresentToday(companyId),
    leaveRepo.countPending(companyId),
    departmentRepo.list(companyId),
    attendanceRepo.listForCompany(companyId, today),
    leaveRepo.listRequests(companyId, { status: "PENDING", take: 8 }),
    holidayRepo.list(companyId),
  ]);

  const lateToday = todayAttendance.filter((a) => a.isLate);
  const stillIn = todayAttendance.filter((a) => a.checkIn && !a.checkOut);
  const holidayToday = holidays.find(
    (h) => startOfDayUTC(h.date).getTime() === today.getTime()
  );
  const absentApprox = Math.max(0, employees - present);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        description={`Today · ${formatDate(today, tz)}${
          holidayToday ? ` · Holiday: ${holidayToday.name}` : ""
        }`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/leaves">
              <Button variant="secondary">Review leaves</Button>
            </Link>
            <Link href="/admin/employees">
              <Button>Add employee</Button>
            </Link>
          </div>
        }
      />

      {trialExpired || trialEnding ? (
        <p className="rounded-xl border-2 border-amber-400/80 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950">
          {trialExpired
            ? `Your free trial ended${company.trialEndsAt ? ` on ${formatDate(company.trialEndsAt)}` : ""}. Contact the platform operator to upgrade your plan (${company.plan} · ${company.seatLimit} seats).`
            : `Trial ending soon${company.trialEndsAt ? ` (${formatDate(company.trialEndsAt)})` : ""}. Plan: ${company.plan} · ${company.seatLimit} seats.`}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Employees" value={employees} />
        <StatCard label="Present today" value={present} hint={`${stillIn.length} still in`} />
        <StatCard label="Pending leaves" value={pendingLeaves} />
        <StatCard label="Not checked in" value={absentApprox} />
      </div>

      {holidayToday ? (
        <Card className="border-[var(--primary)]">
          <CardContent className="flex items-center justify-between gap-3 py-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
                Holiday today
              </p>
              <p className="text-lg font-black">{holidayToday.name}</p>
            </div>
            <Badge>OFF</Badge>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Who&apos;s in today</CardTitle>
            <Link href="/admin/attendance" className="text-xs font-bold underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {todayAttendance.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">
                No check-ins yet today.
              </p>
            ) : (
              todayAttendance.slice(0, 8).map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between gap-3 border-b-2 border-[var(--border)]/30 py-2 text-sm last:border-0"
                >
                  <div>
                    <p className="font-bold">
                      {row.employee.firstName} {row.employee.lastName}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      In {formatTime(row.checkIn, tz)}
                      {row.checkOut
                        ? ` · Out ${formatTime(row.checkOut, tz)}`
                        : " · still working"}
                    </p>
                  </div>
                  <Badge className={row.isLate ? "bg-[var(--warning)] text-black" : undefined}>
                    {row.status}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Leaves waiting</CardTitle>
            <Link href="/admin/leaves" className="text-xs font-bold underline">
              Approve
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingRequests.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">
                No pending leave requests.
              </p>
            ) : (
              pendingRequests.slice(0, 8).map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between gap-3 border-b-2 border-[var(--border)]/30 py-2 text-sm last:border-0"
                >
                  <div>
                    <p className="font-bold">
                      {req.employee.firstName} {req.employee.lastName}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {req.leaveType.name} · {formatDate(req.startDate, tz)} →{" "}
                      {formatDate(req.endDate, tz)}
                    </p>
                  </div>
                  <Badge>PENDING</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Late arrivals today</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lateToday.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">
                Nobody marked late so far.
              </p>
            ) : (
              lateToday.map((row) => (
                <div
                  key={row.id}
                  className="flex justify-between border-b-2 border-[var(--border)]/30 py-2 text-sm last:border-0"
                >
                  <span className="font-bold">
                    {row.employee.firstName} {row.employee.lastName}
                  </span>
                  <span>{formatTime(row.checkIn, tz)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick links</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {[
              { href: "/admin/attendance", label: "Attendance" },
              { href: "/admin/leaves", label: "Leaves" },
              { href: "/admin/announcements", label: "Announce" },
              { href: "/admin/reports", label: "Export reports" },
              { href: "/admin/holidays", label: "Holidays" },
              { href: "/admin/settings", label: "Branding" },
            ].map((link) => (
              <Link key={link.href} href={link.href}>
                <Button variant="outline" className="w-full justify-start">
                  {link.label}
                </Button>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-[var(--muted-foreground)]">
        {departments.length} department{departments.length === 1 ? "" : "s"} configured
      </p>
    </div>
  );
}
