import { requireUser } from "@/lib/session";
import {
  getEmployeeMonthTimesheet,
  listCompanyAttendance,
  listTodayAttendance,
} from "@/services/attendance.service";
import { listEmployees } from "@/services/employee.service";
import { PageHeader, EmptyState, StatCard } from "@/components/shared/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatTime } from "@/lib/utils";
import {
  AttendanceTabs,
  PayrollFilters,
  type AttendanceTab,
} from "@/features/attendance/components/attendance-tabs";

function currentMonthValue(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function parseTab(value: string | undefined): AttendanceTab {
  if (value === "recent" || value === "payroll") return value;
  return "today";
}

export default async function AdminAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; employeeId?: string; month?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const tab = parseTab(sp.tab);
  const month = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : currentMonthValue();
  const employeeId = sp.employeeId ?? "";

  const employees = await listEmployees(user.companyId!, user.role);
  const employeeOptions = employees.map((e) => ({
    id: e.id,
    label: `${e.firstName} ${e.lastName} · ${e.employeeCode}`,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description="Team punches, recent logs, and month-wise timesheets for salary."
      />

      <AttendanceTabs tab={tab} employeeId={employeeId} month={month} />

      {tab === "today" ? (
        <TodayPanel companyId={user.companyId!} role={user.role} userId={user.id} />
      ) : null}

      {tab === "recent" ? (
        <RecentPanel companyId={user.companyId!} role={user.role} userId={user.id} />
      ) : null}

      {tab === "payroll" ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Employee month sheet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-[var(--muted-foreground)]">
                Pick an employee and month to see every day&apos;s check-in / check-out
                and hours - useful when calculating salary.
              </p>
              <PayrollFilters
                employees={employeeOptions}
                employeeId={employeeId}
                month={month}
              />
            </CardContent>
          </Card>
          {employeeId ? (
            <PayrollPanel
              companyId={user.companyId!}
              role={user.role}
              userId={user.id}
              employeeId={employeeId}
              month={month}
            />
          ) : (
            <EmptyState
              title="Select an employee"
              description="Choose someone above to open their day-wise attendance for the month."
            />
          )}
        </div>
      ) : null}
    </div>
  );
}

async function TodayPanel({
  companyId,
  role,
  userId,
}: {
  companyId: string;
  role: Parameters<typeof listTodayAttendance>[1];
  userId: string;
}) {
  const rows = await listTodayAttendance(companyId, role, userId);
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No check-ins today"
        description="When employees punch in, they appear here instantly."
      />
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Check-in</TableHead>
            <TableHead>Check-out</TableHead>
            <TableHead>Hours</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-bold">
                {r.employee.firstName} {r.employee.lastName}
              </TableCell>
              <TableCell>{formatTime(r.checkIn)}</TableCell>
              <TableCell>{formatTime(r.checkOut)}</TableCell>
              <TableCell>{r.workingHours ?? "-"}</TableCell>
              <TableCell>
                <Badge>{r.status}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

async function RecentPanel({
  companyId,
  role,
  userId,
}: {
  companyId: string;
  role: Parameters<typeof listCompanyAttendance>[1];
  userId: string;
}) {
  const rows = await listCompanyAttendance(companyId, role, userId);
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No attendance yet"
        description="Records appear after employees check in."
      />
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Employee</TableHead>
            <TableHead>In</TableHead>
            <TableHead>Out</TableHead>
            <TableHead>Hours</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{formatDate(r.date)}</TableCell>
              <TableCell className="font-bold">
                {r.employee.firstName} {r.employee.lastName}
              </TableCell>
              <TableCell>{formatTime(r.checkIn)}</TableCell>
              <TableCell>{formatTime(r.checkOut)}</TableCell>
              <TableCell>{r.workingHours ?? "-"}</TableCell>
              <TableCell>
                <Badge>{r.status}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

async function PayrollPanel({
  companyId,
  role,
  userId,
  employeeId,
  month,
}: {
  companyId: string;
  role: Parameters<typeof getEmployeeMonthTimesheet>[1];
  userId: string;
  employeeId: string;
  month: string;
}) {
  const [y, m] = month.split("-").map(Number);
  const sheet = await getEmployeeMonthTimesheet(
    companyId,
    role,
    employeeId,
    y,
    m,
    userId
  );
  const monthLabel = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-black">
          {sheet.employee.firstName} {sheet.employee.lastName}
        </h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          {sheet.employee.employeeCode} · {monthLabel}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Days present" value={sheet.summary.presentDays} />
        <StatCard label="Days absent" value={sheet.summary.absentDays} />
        <StatCard label="Total hours" value={sheet.summary.totalHours} />
        <StatCard
          label="Overtime"
          value={sheet.summary.totalOt}
          hint={`${sheet.summary.lateDays} late · ${sheet.summary.earlyExits} early exit`}
        />
      </div>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Day</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Check-in</TableHead>
              <TableHead>Check-out</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>OT</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sheet.days.map((d) => (
              <TableRow key={d.date.toISOString()}>
                <TableCell className="font-bold">{d.weekday}</TableCell>
                <TableCell>{formatDate(d.date)}</TableCell>
                <TableCell>{formatTime(d.checkIn)}</TableCell>
                <TableCell>{formatTime(d.checkOut)}</TableCell>
                <TableCell>{d.workingHours ?? "-"}</TableCell>
                <TableCell>{d.overtimeHours ?? "-"}</TableCell>
                <TableCell>
                  <Badge
                    className={
                      d.status === "ABSENT"
                        ? "bg-[var(--muted)] text-[var(--muted-foreground)]"
                        : d.isLate
                          ? "bg-[var(--warning)] text-black"
                          : undefined
                    }
                  >
                    {d.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
