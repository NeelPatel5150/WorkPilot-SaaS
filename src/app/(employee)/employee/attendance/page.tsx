import { requireUser } from "@/lib/session";
import { getMyTodayAttendance, listMyAttendance } from "@/services/attendance.service";
import { PageHeader, EmptyState } from "@/components/shared/page";
import { AttendanceActions } from "@/features/attendance/components/attendance-actions";
import { ExceptionForms } from "@/features/attendance/components/exception-forms";
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

export default async function EmployeeAttendancePage() {
  const user = await requireUser();
  const tz = user.company?.timezone;
  const { today } = await getMyTodayAttendance(user.companyId!, user.id, user.role);
  const history = await listMyAttendance(user.companyId!, user.id, user.role);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My attendance"
        description={
          today?.checkIn
            ? `Checked in at ${formatTime(today.checkIn, tz)}`
            : "You have not checked in yet today."
        }
        actions={<AttendanceActions />}
      />
      <ExceptionForms />
      {history.length === 0 ? (
        <EmptyState title="No history" description="Your past check-ins will show here." />
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>In</TableHead>
                <TableHead>Out</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{formatDate(r.date, tz)}</TableCell>
                  <TableCell>{formatTime(r.checkIn, tz)}</TableCell>
                  <TableCell>{formatTime(r.checkOut, tz)}</TableCell>
                  <TableCell>{r.workingHours ?? "-"}</TableCell>
                  <TableCell>
                    <Badge>{r.status}</Badge>
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
