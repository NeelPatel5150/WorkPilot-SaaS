import { requireUser } from "@/lib/session";
import { getMyTodayAttendance } from "@/services/attendance.service";
import { myBalances, listMyLeaves } from "@/services/leave.service";
import { listMyTasks } from "@/services/task.service";
import { PageHeader, StatCard } from "@/components/shared/page";
import { AttendanceActions } from "@/features/attendance/components/attendance-actions";
import { DashboardTasksCard } from "@/features/tasks/components/dashboard-tasks-card";
import { formatTime } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function EmployeeDashboardPage() {
  const user = await requireUser();
  const tz = user.company?.timezone;
  const companyId = user.companyId!;

  const [{ today }, balances, leaves, tasks] = await Promise.all([
    getMyTodayAttendance(companyId, user.id, user.role),
    myBalances(companyId, user.id),
    listMyLeaves(companyId, user.id, user.role),
    listMyTasks(companyId, user.id, user.role).catch((err) => {
      console.error("dashboard tasks failed", err);
      return [];
    }),
  ]);
  const pending = leaves.filter((l) => l.status === "PENDING").length;
  const openTasks = tasks.filter((t) => t.status !== "DONE").length;
  const leaveOnlyBalances = balances.filter((b) => {
    const code = (b.leaveType.code || "").toUpperCase();
    const name = b.leaveType.name.trim().toUpperCase();
    return code !== "WFH" && name !== "WFH" && name !== "WORK FROM HOME";
  });
  const totalLeavesLeft = leaveOnlyBalances.reduce(
    (sum, b) => sum + (b.allocated - b.used),
    0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hi, ${user.name.split(" ")[0]}`}
        description="Your day at a glance."
        actions={<AttendanceActions />}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Today"
          value={today?.checkIn ? formatTime(today.checkIn, tz) : "Not in"}
          hint={
            today?.checkOut
              ? `Out ${formatTime(today.checkOut, tz)}`
              : "Check in to start"
          }
        />
        <StatCard label="Open tasks" value={openTasks} />
        <StatCard label="Pending leave" value={pending} />
        <StatCard
          label="Total leaves"
          value={totalLeavesLeft}
          hint="Days left · WFH not included"
        />
      </div>
      <DashboardTasksCard items={tasks} />
      <Card>
        <CardHeader>
          <CardTitle>Leave balances</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {balances.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              Balances appear after HR sets leave types.
            </p>
          ) : (
            balances.map((b) => (
              <div
                key={b.id}
                className="flex justify-between border-b-2 border-[var(--border)] py-2 text-sm"
              >
                <span className="font-bold">{b.leaveType.name}</span>
                <span>
                  {b.allocated - b.used} left / {b.allocated}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
