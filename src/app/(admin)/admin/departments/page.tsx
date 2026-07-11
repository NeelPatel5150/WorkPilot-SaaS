import { requireUser } from "@/lib/session";
import { listDepartments } from "@/services/department.service";
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
import { DepartmentForms } from "@/features/departments/components/department-forms";

export default async function AdminDepartmentsPage() {
  const user = await requireUser();
  const departments = await listDepartments(user.companyId!, user.role);

  return (
    <div className="space-y-6">
      <PageHeader title="Departments" description="Organize teams by department." />
      <DepartmentForms />
      {departments.length === 0 ? (
        <EmptyState title="No departments" description="Create your first department." />
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Employees</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-bold">{d.name}</TableCell>
                  <TableCell>{d._count.employees}</TableCell>
                  <TableCell className="text-right">
                    <DepartmentForms deleteId={d.id} />
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
