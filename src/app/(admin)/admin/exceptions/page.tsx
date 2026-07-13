import { requireUser } from "@/lib/session";
import { listPendingExceptions } from "@/services/exception.service";
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
import { formatDate, formatTime } from "@/lib/utils";
import { ExceptionDecisionButtons } from "@/features/attendance/components/exception-forms";

export default async function AdminExceptionsPage() {
  const user = await requireUser();
  const pending = await listPendingExceptions(user.companyId!, user.role);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance exceptions"
        description="Approve or reject pending punch / WFH / adjustment requests."
      />
      {pending.length === 0 ? (
        <EmptyState
          title="No pending exceptions"
          description="Employee requests will show here for review."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Proposed</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-bold">
                    {r.employee.firstName} {r.employee.lastName}
                  </TableCell>
                  <TableCell>{r.type.replace(/_/g, " ")}</TableCell>
                  <TableCell>{formatDate(r.date)}</TableCell>
                  <TableCell className="text-xs">
                    {formatTime(r.proposedCheckIn)} → {formatTime(r.proposedCheckOut)}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm">
                    {r.reason || "-"}
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
      )}
    </div>
  );
}
