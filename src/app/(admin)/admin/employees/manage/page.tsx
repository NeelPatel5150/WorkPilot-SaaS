import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/session";
import { listEmployeesFiltered } from "@/services/employee.service";
import { employeeRepo } from "@/repositories/employee.repository";
import { departmentRepo } from "@/repositories/department.repository";
import { PageHeader, EmptyState, StatCard } from "@/components/shared/page";
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
import { UserAvatar } from "@/components/shared/user-avatar";
import { ManageEmployeeFilters } from "@/features/employees/components/manage-employee-filters";
import type { EmploymentStatus } from "@/generated/prisma";

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

export default async function ManageEmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; departmentId?: string; status?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = sp.q?.trim() || "";
  const departmentId = sp.departmentId || "";
  const statusRaw = sp.status || "ALL";
  const status =
    statusRaw === "ACTIVE" ||
    statusRaw === "ON_NOTICE" ||
    statusRaw === "RESIGNED" ||
    statusRaw === "TERMINATED" ||
    statusRaw === "ALL"
      ? statusRaw
      : "ALL";

  const [employees, departments, counts] = await Promise.all([
    listEmployeesFiltered(user.companyId!, user.role, {
      q: q || undefined,
      departmentId: departmentId || undefined,
      status: status as EmploymentStatus | "ALL",
    }),
    departmentRepo.list(user.companyId!),
    employeeRepo.statusCounts(user.companyId!),
  ]);

  const filtered = Boolean(q || departmentId || status !== "ALL");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manage employees"
        description="Search, filter, and open anyone for full profile, salary, leaves, and attendance."
        actions={
          <Link href="/admin/employees/add">
            <Button>Add employee</Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Active employees"
          value={counts.active}
          hint="Currently working"
        />
        <StatCard
          label="Inactive employees"
          value={counts.inactive}
          hint="On notice, resigned, or terminated"
        />
        <StatCard
          label="Departments"
          value={departments.length}
          hint="Across the company"
        />
      </div>

      <Suspense fallback={null}>
        <ManageEmployeeFilters
          departments={departments}
          q={q}
          departmentId={departmentId}
          status={status}
        />
      </Suspense>

      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-[var(--muted-foreground)]">
          {filtered ? (
            <>
              Showing <span className="font-bold text-[var(--foreground)]">{employees.length}</span>{" "}
              match{employees.length === 1 ? "" : "es"}
            </>
          ) : (
            <>
              <span className="font-bold text-[var(--foreground)]">{employees.length}</span>{" "}
              employee{employees.length === 1 ? "" : "s"}
            </>
          )}
        </p>
      </div>

      {employees.length === 0 ? (
        <EmptyState
          title="No matches"
          description="Try another search, department, or status — or add a new employee."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead className="hidden md:table-cell">Department</TableHead>
                <TableHead className="hidden sm:table-cell">Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((e) => (
                <TableRow key={e.id}>
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
                          {e.employeeCode} · {e.user.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {e.department?.name ?? "-"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge>{e.user.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        e.employmentStatus === "ACTIVE"
                          ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                          : e.employmentStatus === "ON_NOTICE"
                            ? "border-amber-600 bg-amber-50 text-amber-900"
                            : "border-stone-400 bg-stone-50 text-stone-700"
                      }
                    >
                      {statusLabel(e.employmentStatus)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/admin/employees/${e.id}`}>
                      <Button size="sm">Manage</Button>
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
