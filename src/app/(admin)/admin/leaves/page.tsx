import { requireUser } from "@/lib/session";
import { listCompanyLeaves } from "@/services/leave.service";
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
import { formatDate } from "@/lib/utils";
import { LeaveDecisionButtons } from "@/features/leaves/components/leave-decision-buttons";

export default async function AdminLeavesPage() {
  const user = await requireUser();
  const requests = await listCompanyLeaves(user.companyId!, user.role, user.id);

  return (
    <div className="space-y-6">
      <PageHeader title="Leave requests" description="Approve or reject team leave." />
      {requests.length === 0 ? (
        <EmptyState title="No leave requests" description="Pending and past requests show here." />
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => (
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
                    <Badge>{r.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {r.status === "PENDING" ? (
                      <LeaveDecisionButtons requestId={r.id} />
                    ) : (
                      "-"
                    )}
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
