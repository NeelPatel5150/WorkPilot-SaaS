import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import {
  getEmployeeOrThrow,
  listEmployeeLeaveBalances,
  listSalaryRevisions,
} from "@/services/employee.service";
import { departmentRepo } from "@/repositories/department.repository";
import { PageHeader } from "@/components/shared/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserAvatar } from "@/components/shared/user-avatar";
import { EmployeeProfileForm } from "@/features/employees/components/employee-profile-form";
import { EmployeeSalaryForm } from "@/features/employees/components/employee-salary-form";
import { EmployeeBankForm } from "@/features/employees/components/employee-bank-form";
import { SalaryRevisionList } from "@/features/employees/components/salary-revision-list";
import { EmployeeLeaveBalancesForm } from "@/features/employees/components/employee-leave-balances-form";
import { OffboardEmployeeButton } from "@/features/employees/components/offboard-employee-button";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

function toDateInput(value: Date | string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const year = new Date().getFullYear();
  const companyId = user.companyId!;

  let employee;
  try {
    employee = await getEmployeeOrThrow(companyId, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }

  const [departments, balances, revisions] = await Promise.all([
    departmentRepo.list(companyId),
    listEmployeeLeaveBalances(companyId, user.role, id, year).catch((err) => {
      if (err instanceof ForbiddenError) return [];
      throw err;
    }),
    listSalaryRevisions(companyId, user.role, id).catch((err) => {
      if (err instanceof ForbiddenError) return [];
      throw err;
    }),
  ]);

  const lockRole =
    employee.user.role === "COMPANY_ADMIN" ||
    employee.user.role === "SUPER_ADMIN";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${employee.firstName} ${employee.lastName}`}
        description={`${employee.employeeCode} · ${employee.user.email}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/employees/manage">
              <Button variant="outline">Back to list</Button>
            </Link>
            <Link href="/admin/employees/add">
              <Button variant="secondary">Add employee</Button>
            </Link>
          </div>
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <UserAvatar
              image={employee.user.image}
              firstName={employee.firstName}
              lastName={employee.lastName}
              size="md"
            />
            <div>
              <p className="font-black">
                {employee.firstName} {employee.lastName}
              </p>
              <p className="text-sm text-[var(--muted-foreground)]">
                {employee.designation || "No designation"} ·{" "}
                {employee.department?.name || "No department"}
              </p>
              <div className="mt-1 flex flex-wrap gap-2">
                <Badge>{employee.user.role}</Badge>
                <Badge>{employee.employmentStatus.replace(/_/g, " ")}</Badge>
              </div>
            </div>
          </div>
          {lockRole ? (
            <p className="text-xs font-bold text-[var(--muted-foreground)]">
              Admin accounts cannot be offboarded here.
            </p>
          ) : (
            <OffboardEmployeeButton
              employeeId={employee.id}
              name={`${employee.firstName} ${employee.lastName}`}
              active={
                employee.employmentStatus === "ACTIVE" && employee.user.isActive
              }
              status={employee.employmentStatus}
            />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <EmployeeProfileForm
          employeeId={employee.id}
          firstName={employee.firstName}
          lastName={employee.lastName}
          email={employee.user.email}
          phone={employee.phone || ""}
          emergencyContact={employee.emergencyContact || ""}
          designation={employee.designation || ""}
          departmentId={employee.departmentId || ""}
          role={employee.user.role}
          joiningDate={toDateInput(employee.joiningDate)}
          departments={departments}
          lockRole={lockRole}
        />
        <EmployeeSalaryForm
          employeeId={employee.id}
          basicSalary={employee.basicSalary}
        />
        <EmployeeBankForm
          employeeId={employee.id}
          bankAccountName={employee.bankAccountName || ""}
          bankName={employee.bankName || ""}
          bankAccountNumber={employee.bankAccountNumber || ""}
          bankIfsc={employee.bankIfsc || ""}
          panNumber={employee.panNumber || ""}
          uanNumber={employee.uanNumber || ""}
          pfEligible={employee.pfEligible}
          esiEligible={employee.esiEligible}
        />
        <SalaryRevisionList revisions={revisions} />
      </div>

      <EmployeeLeaveBalancesForm
        employeeId={employee.id}
        year={year}
        balances={balances}
      />
    </div>
  );
}
