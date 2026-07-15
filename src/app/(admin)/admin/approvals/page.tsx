import { requireUser, isAdminRole } from "@/lib/session";
import { redirect } from "next/navigation";
import { listCompanyLeaves } from "@/services/leave.service";
import { listPendingExceptions } from "@/services/exception.service";
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
import { formatDate, formatTime } from "@/lib/utils";
import { LeaveDecisionButtons } from "@/features/leaves/components/leave-decision-buttons";
import { ExceptionDecisionButtons } from "@/features/attendance/components/exception-forms";

export default async function AdminApprovalsPage() {
  const user = await requireUser();
  if (!isAdminRole(user.role) && user.role !== "MANAGER") {
    redirect("/employee/dashboard");
  }

  const [leaves, exceptions] = await Promise.all([
    listCompanyLeaves(user.companyId!, user.role, user.id).catch(() => []),
    listPendingExceptions(user.companyId!, user.role, user.id).catch(() => []),
  ]);

  const pendingLeaves = leaves.filter((l) => l.status === "PENDING");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approvals"
        description="One inbox for pending leave and attendance exceptions."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Pending leave" value={pendingLeaves.length} />
        <StatCard label="Pending exceptions" value={exceptions.length} />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-black">Leave</h2>
        {pendingLeaves.length === 0 ? (
          <EmptyState
            title="No pending leave"
            description="New leave requests will show here."
          />
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {pendingLeaves.map((r) => (
                <Card key={r.id} className="space-y-3 p-4">
                  <div>
                    <p className="font-black">
                      {r.employee.firstName} {r.employee.lastName}
                    </p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {r.leaveType.name} · {formatDate(r.startDate)} →{" "}
                      {formatDate(r.endDate)}
                      {r.isHalfDay ? " (half)" : ""}
                    </p>
                  </div>
                  <LeaveDecisionButtons requestId={r.id} />
                </Card>
              ))}
            </div>
            <Card className="hidden overflow-hidden p-0 md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingLeaves.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-bold">
                        {r.employee.firstName} {r.employee.lastName}
                      </TableCell>
                      <TableCell>{r.leaveType.name}</TableCell>
                      <TableCell>
                        {formatDate(r.startDate)} → {formatDate(r.endDate)}
                        {r.isHalfDay ? " (half)" : ""}
                      </TableCell>
                      <TableCell>
                        <LeaveDecisionButtons requestId={r.id} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-black">Attendance exceptions</h2>
        {exceptions.length === 0 ? (
          <EmptyState
            title="No pending exceptions"
            description="Punch / WFH / adjustment requests land here."
          />
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {exceptions.map((r) => (
                <Card key={r.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-black">
                        {r.employee.firstName} {r.employee.lastName}
                      </p>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {r.type.replace(/_/g, " ")} · {formatDate(r.date)}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {formatTime(r.proposedCheckIn)} →{" "}
                        {formatTime(r.proposedCheckOut)}
                      </p>
                    </div>
                    <Badge>{r.status}</Badge>
                  </div>
                  <ExceptionDecisionButtons exceptionId={r.id} />
                </Card>
              ))}
            </div>
            <Card className="hidden overflow-hidden p-0 md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Proposed</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exceptions.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-bold">
                        {r.employee.firstName} {r.employee.lastName}
                      </TableCell>
                      <TableCell>{r.type.replace(/_/g, " ")}</TableCell>
                      <TableCell>{formatDate(r.date)}</TableCell>
                      <TableCell className="text-xs">
                        {formatTime(r.proposedCheckIn)} →{" "}
                        {formatTime(r.proposedCheckOut)}
                      </TableCell>
                      <TableCell>
                        <Badge>{r.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <ExceptionDecisionButtons exceptionId={r.id} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </>
        )}
      </section>
    </div>
  );
}
