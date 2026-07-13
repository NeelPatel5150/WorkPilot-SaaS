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
import { DocumentForms } from "@/features/documents/components/document-forms";

export default async function AdminDocumentsPage() {
  const user = await requireUser();
  const docs = await listDocuments(
    { companyId: user.companyId!, role: user.role },
    "company"
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Documents" description="Company and employee files." />
      <DocumentForms />
      {docs.length === 0 ? (
        <EmptyState title="No documents" description="Upload policies, letters, or slips." />
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead />
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
                  <TableCell>
                    {d.employee
                      ? `${d.employee.firstName} ${d.employee.lastName}`
                      : "Company-wide"}
                  </TableCell>
                  <TableCell>
                    {d.expiresAt ? formatDate(d.expiresAt) : "-"}
                  </TableCell>
                  <TableCell>{formatDate(d.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <DocumentForms deleteId={d.id} />
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
