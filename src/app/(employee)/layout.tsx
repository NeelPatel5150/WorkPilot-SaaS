import { redirect } from "next/navigation";
import { PortalShell } from "@/components/layout/portal-shell";
import { employeeNav } from "@/config/nav";
import { requireUser } from "@/lib/session";

export default async function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  if (user.mustChangePassword) {
    redirect(`/accept?email=${encodeURIComponent(user.email)}`);
  }
  if (!user.employee) {
    redirect("/admin/dashboard");
  }

  return (
    <PortalShell
      brand={user.company!.name}
      logoUrl={user.company!.logoUrl}
      title="Employee"
      userName={user.name}
      userImage={user.image}
      items={employeeNav}
      notificationsHref="/employee/notifications"
      showEmployeeDock
    >
      {children}
    </PortalShell>
  );
}
