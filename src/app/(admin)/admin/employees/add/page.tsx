import Link from "next/link";
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
import { Button } from "@/components/ui/button";
import { CreateEmployeeForm } from "@/features/employees/components/create-employee-form";
import { UserAvatar } from "@/components/shared/user-avatar";

export default async function AdminAddEmployeesPage() {
  const user = await requireUser();
  const [employees, departments, nextCode] = await Promise.all([
    listEmployees(user.companyId!, user.role),
    departmentRepo.list(user.companyId!),
    nextEmployeeCode(user.companyId!),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add employee"
        description="Invite someone new. For edits, salary, leaves, and offboarding use Manage employee."
        actions={
          <Link href="/admin/employees/manage">
            <Button variant="outline">Manage employees</Button>
          </Link>
        }
      />
      <CreateEmployeeForm departments={departments} nextCode={nextCode} />
      {employees.length === 0 ? (
        <EmptyState
          title="No employees yet"
          description="Add your first teammate to start tracking attendance and leave."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="border-b-2 border-[var(--border)] px-4 py-3">
            <p className="text-sm font-black">Current employees</p>
            <p className="text-xs text-[var(--muted-foreground)]">
              Read-only list. Open Manage to edit or offboard.
            </p>
          </div>
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
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        image={e.user.image}
                        firstName={e.firstName}
                        lastName={e.lastName}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="font-bold">
                          {e.firstName} {e.lastName}
                        </p>
                        <p className="truncate text-xs text-[var(--muted-foreground)]">
                          {e.user.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge>{e.user.role}</Badge>
                  </TableCell>
                  <TableCell>{e.department?.name ?? "-"}</TableCell>
                  <TableCell>{e.employmentStatus}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/admin/employees/${e.id}`}>
                      <Button size="sm" variant="outline">
                        Open
                      </Button>
                    </Link>
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
