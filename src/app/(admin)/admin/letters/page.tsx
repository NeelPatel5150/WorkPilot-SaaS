import { requireUser, isAdminRole } from "@/lib/session";
import { redirect } from "next/navigation";
import { listEmployees } from "@/services/employee.service";
import { listOfferLetters } from "@/services/letter.service";
import { PageHeader } from "@/components/shared/page";
import { LettersPanel } from "@/features/letters/components/letters-panel";

export default async function AdminLettersPage() {
  const user = await requireUser();
  if (!isAdminRole(user.role)) redirect("/employee/dashboard");

  const [employees, letters] = await Promise.all([
    listEmployees(user.companyId!, user.role),
    listOfferLetters(user.companyId!, user.role).catch(() => []),
  ]);

  const employeeOptions = employees
    .filter((e) => e.user.isActive)
    .map((e) => ({
      id: e.id,
      label: `${e.firstName} ${e.lastName} · ${e.employeeCode}`,
      firstName: e.firstName,
      lastName: e.lastName,
      designation: e.designation,
      department: e.department?.name ?? null,
      joiningDate: e.joiningDate
        ? new Date(e.joiningDate).toISOString().slice(0, 10)
        : null,
      basicSalary: e.basicSalary,
    }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Letters"
        description="Offer and appointment letters — branded PDF via Print / Save."
      />
      <LettersPanel employees={employeeOptions} letters={letters} />
    </div>
  );
}
