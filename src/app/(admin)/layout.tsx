import { redirect } from "next/navigation";
import { PortalShell } from "@/components/layout/portal-shell";
import { adminNav } from "@/config/nav";
import { requireUser, isAdminRole } from "@/lib/session";

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

  return (
    <PortalShell
      brand={user.company!.name}
      logoUrl={user.company!.logoUrl}
      title="Admin"
      userName={user.name}
      userImage={user.image}
      items={adminNav}
      notificationsHref="/admin/notifications"
    >
      {children}
    </PortalShell>
  );
}
