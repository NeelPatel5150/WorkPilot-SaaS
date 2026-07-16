import { cache } from "react";
import { getCurrentTenant } from "@/lib/tenant";
import { getSession } from "@/lib/session";
import {
  getCompanyShellById,
  type CompanyShell,
} from "@/lib/company-shell";

export type { CompanyShell };

/**
 * Request-scoped company for branding / metadata / theme.
 * Uses cached shell rows (no binary blobs). Logged-in users resolve by
 * session companyId to avoid an extra user join when possible.
 */
export const resolveCompany = cache(async (): Promise<CompanyShell | null> => {
  try {
    const tenant = await getCurrentTenant();
    if (tenant?.company) return tenant.company;

    const session = await getSession();
    const companyId =
      session?.user &&
      "companyId" in session.user &&
      typeof session.user.companyId === "string"
        ? session.user.companyId
        : null;

    if (companyId) {
      return getCompanyShellById(companyId);
    }

    if (!session?.user?.id) return null;

    // Legacy sessions without companyId on the token — one lightweight lookup.
    const { prisma } = await import("@/lib/prisma");
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { company: { select: { id: true } } },
    });
    if (!user?.company?.id) return null;
    return getCompanyShellById(user.company.id);
  } catch (error) {
    console.error("[company] resolveCompany failed:", error);
    return null;
  }
});
