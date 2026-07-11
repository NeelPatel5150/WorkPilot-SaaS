import { requireUser } from "@/lib/session";
import { listDocuments } from "@/services/document.service";
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
import { formatDate } from "@/lib/utils";

export default async function EmployeeDocumentsPage() {
  const user = await requireUser();
  const docs = await listDocuments(
    {
      companyId: user.companyId!,
      role: user.role,
      employeeId: user.employee?.id,
    },
    "mine"
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="Company files shared with you."
      />
      {docs.length === 0 ? (
        <EmptyState title="No documents" description="HR has not shared files yet." />
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Uploaded</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-bold">
                    <a href={d.fileUrl} className="underline">
                      {d.name}
                    </a>
                  </TableCell>
                  <TableCell>{formatDate(d.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
