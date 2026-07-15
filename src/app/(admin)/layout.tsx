import { redirect } from "next/navigation";
import { PortalShell } from "@/components/layout/portal-shell";
import { adminNav } from "@/config/nav";
import { requireUser, isAdminRole } from "@/lib/session";
import type { Role } from "@/lib/permissions";
import { ManagerMobileDock } from "@/components/layout/manager-mobile-dock";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  if (user.mustChangePassword) {
    redirect(`/accept?email=${encodeURIComponent(user.email)}`);
  }
  if (!isAdminRole(user.role) && user.role !== "MANAGER") {
    redirect("/employee/dashboard");
  }
  if (!user.company!.setupComplete) {
    redirect("/onboarding");
  }

  const role = user.role as Role;
  const items = adminNav.filter(
    (item) => !item.roles || item.roles.includes(role)
  );
  const isManager = user.role === "MANAGER";

  return (
    <PortalShell
      brand={user.company!.name}
      logoUrl={user.company!.logoUrl}
      title={isManager ? "Manager" : "Admin"}
      userName={user.name}
      userImage={user.image}
      items={items}
      notificationsHref="/admin/notifications"
      mobileDock={isManager ? <ManagerMobileDock /> : undefined}
    >
      {children}
    </PortalShell>
  );
}
