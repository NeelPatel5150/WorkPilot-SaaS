import { redirect } from "next/navigation";

/** Employees hub → Manage list (Add lives at /admin/employees/add). */
export default function EmployeesIndexRedirect() {
  redirect("/admin/employees/manage");
}
