import { requireUser } from "@/lib/session";
import { listEmployees, nextEmployeeCode } from "@/services/employee.service";
import { departmentRepo } from "@/repositories/department.repository";
import { PageHeader, EmptyState } from "@/components/shared/page";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { CreateEmployeeForm } from "@/features/employees/components/create-employee-form";
import { OffboardEmployeeButton } from "@/features/employees/components/offboard-employee-button";

export default async function AdminEmployeesPage() {
  const user = await requireUser();
  const [employees, departments, nextCode] = await Promise.all([
    listEmployees(user.companyId!, user.role),
    departmentRepo.list(user.companyId!),
    nextEmployeeCode(user.companyId!),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees"
        description="Manage people in your company."
      />
      <CreateEmployeeForm departments={departments} nextCode={nextCode} />
      {employees.length === 0 ? (
        <EmptyState
          title="No employees yet"
          description="Add your first teammate to start tracking attendance and leave."
        />
      ) : (
        <Card className="p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-bold">{e.employeeCode}</TableCell>
                  <TableCell>
                    {e.firstName} {e.lastName}
                    <div className="text-xs text-[var(--muted-foreground)]">
                      {e.user.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge>{e.user.role}</Badge>
                  </TableCell>
                  <TableCell>{e.department?.name ?? "—"}</TableCell>
                  <TableCell>{e.employmentStatus}</TableCell>
                  <TableCell className="text-right">
                    {e.user.role === "COMPANY_ADMIN" ||
                    e.user.role === "SUPER_ADMIN" ? null : (
                      <OffboardEmployeeButton
                        employeeId={e.id}
                        name={`${e.firstName} ${e.lastName}`}
                        active={e.employmentStatus === "ACTIVE" && e.user.isActive}
                        status={e.employmentStatus}
                      />
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
