import { requireUser } from "@/lib/session";
import { listLeaveTypes, listMyLeaves, myBalances } from "@/services/leave.service";
import { listCoverCandidates } from "@/services/employee.service";
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
import { ApplyLeaveForm } from "@/features/leaves/components/apply-leave-form";

export default async function EmployeeLeavesPage() {
  const user = await requireUser();
  const [types, requests, balances, coverOptions] = await Promise.all([
    listLeaveTypes(user.companyId!),
    listMyLeaves(user.companyId!, user.id, user.role),
    myBalances(user.companyId!, user.id),
    listCoverCandidates(user.companyId!, user.id),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Leaves" description="Apply and track your leave requests." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {balances.map((b) => (
          <Card key={b.id} className="p-4">
            <p className="text-xs font-bold uppercase text-[var(--muted-foreground)]">
              {b.leaveType.name}
            </p>
            <p className="mt-1 text-2xl font-black">{b.allocated - b.used}</p>
            <p className="text-xs text-[var(--muted-foreground)]">of {b.allocated} left</p>
          </Card>
        ))}
      </div>
      <ApplyLeaveForm types={types} coverOptions={coverOptions} />
      {requests.length === 0 ? (
        <EmptyState title="No requests" description="Submit a leave request above." />
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-bold">{r.leaveType.name}</TableCell>
                  <TableCell>
                    {formatDate(r.startDate)} → {formatDate(r.endDate)}
                  </TableCell>
                  <TableCell>
                    <Badge>{r.status}</Badge>
                  </TableCell>
                  <TableCell>{r.reason ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
