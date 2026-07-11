import { requireUser } from "@/lib/session";
import { activityRepo } from "@/repositories/activity.repository";
import { PageHeader, EmptyState } from "@/components/shared/page";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminAuditPage() {
  const user = await requireUser();
  const logs = await activityRepo.list(user.companyId!, 100);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit log"
        description="Recent activity across your company workspace."
      />
      {logs.length === 0 ? (
        <EmptyState title="No activity yet" description="Actions will appear here as they happen." />
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-sm">
                    {new Date(log.createdAt).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell className="font-bold">
                    {log.user?.name ?? log.user?.email ?? "System"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{log.action}</TableCell>
                  <TableCell className="max-w-[280px] truncate text-xs text-[var(--muted-foreground)]">
                    {log.metadata ? JSON.stringify(log.metadata) : "—"}
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
