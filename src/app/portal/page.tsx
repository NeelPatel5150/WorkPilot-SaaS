import { redirect } from "next/navigation";
import { requireUser, portalHomeForRole } from "@/lib/session";

export default async function PortalRedirectPage() {
  const user = await requireUser();
  if (user.mustChangePassword) {
    redirect(`/accept?email=${encodeURIComponent(user.email)}`);
  }
  if (
    (user.role === "COMPANY_ADMIN" || user.role === "SUPER_ADMIN" || user.role === "HR") &&
    user.company &&
    !user.company.setupComplete
  ) {
    redirect("/onboarding");
  }
  redirect(portalHomeForRole(user.role));
}
