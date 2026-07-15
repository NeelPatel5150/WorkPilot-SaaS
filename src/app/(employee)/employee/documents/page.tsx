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
import { OwnDocumentUploadForm } from "@/features/documents/components/own-document-upload-form";

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
        description="Company files and your KYC uploads."
      />
      <OwnDocumentUploadForm />
      {docs.length === 0 ? (
        <EmptyState title="No documents" description="Upload KYC or wait for HR to share files." />
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Expires</TableHead>
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
                  <TableCell>
                    {d.expiresAt ? formatDate(d.expiresAt) : "—"}
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
