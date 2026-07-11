import { requireUser } from "@/lib/session";
import { getMyTodayAttendance } from "@/services/attendance.service";
import { myBalances, listMyLeaves } from "@/services/leave.service";
import { PageHeader, StatCard } from "@/components/shared/page";
import { AttendanceActions } from "@/features/attendance/components/attendance-actions";
import { formatTime } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function EmployeeDashboardPage() {
  const user = await requireUser();
  const { today } = await getMyTodayAttendance(user.companyId!, user.id, user.role);
  const balances = await myBalances(user.companyId!, user.id);
  const leaves = await listMyLeaves(user.companyId!, user.id, user.role);
  const pending = leaves.filter((l) => l.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hi, ${user.name.split(" ")[0]}`}
        description="Your day at a glance."
        actions={<AttendanceActions />}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Today"
          value={today?.checkIn ? formatTime(today.checkIn) : "Not in"}
          hint={today?.checkOut ? `Out ${formatTime(today.checkOut)}` : "Check in to start"}
        />
        <StatCard label="Pending leave" value={pending} />
        <StatCard
          label="Leave types"
          value={balances.length}
          hint="See Leaves for balances"
        />
      </div>
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
