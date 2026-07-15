import { cache } from "react";
import { getCurrentTenant } from "@/lib/tenant";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

/**
 * Request-scoped company for branding / metadata / theme.
 * Shared by root layout + generateMetadata so we only hit the DB once.
 */
export const resolveCompany = cache(async () => {
  try {
    const tenant = await getCurrentTenant();
    if (tenant?.company) return tenant.company;

    const session = await getSession();
    if (!session?.user?.id) return null;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { company: true },
    });
    return user?.company ?? null;
  } catch (error) {
    console.error("[company] resolveCompany failed:", error);
    return null;
  }
});
