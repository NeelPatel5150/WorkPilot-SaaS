import type { MetadataRoute } from "next";
import { getCurrentTenant } from "@/lib/tenant";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function resolveCompany() {
  const tenant = await getCurrentTenant();
  if (tenant?.company) return tenant.company;
  const session = await getSession();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { company: true },
  });
  return user?.company ?? null;
}

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const company = await resolveCompany();
  const name = company ? `${company.name} Portal` : "WorkPilot";
  const shortName = company?.name?.slice(0, 12) || "WorkPilot";
  const theme = company?.primaryColor || "#2563EB";
  const bg = company?.secondaryColor || "#EFF6FF";
  const iconSrc =
    company?.logoUrl || company?.faviconUrl
      ? `/api/brand/icon?kind=logo&companyId=${company.id}`
      : "/icons/icon.svg";

  return {
    name,
    short_name: shortName,
    description: company
      ? `${company.name} WorkPilot app - punch, leave, payslips.`
      : "White-label HRMS - attendance, leave, and payroll.",
    start_url: "/portal",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: bg,
    theme_color: theme,
    categories: ["business", "productivity"],
    icons: [
      {
        src: iconSrc,
        sizes: "192x192",
        type: iconSrc.endsWith(".svg") ? "image/svg+xml" : "image/png",
        purpose: "any",
      },
      {
        src: iconSrc,
        sizes: "512x512",
        type: iconSrc.endsWith(".svg") ? "image/svg+xml" : "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
