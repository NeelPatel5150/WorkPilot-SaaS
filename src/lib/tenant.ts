import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { Company } from "@/generated/prisma";

export type TenantContext = {
  company: Company;
  slug: string | null;
  customDomain: string | null;
};

/**
 * Sole reader of tenant request headers set by proxy.ts.
 * Every service/repository call takes companyId explicitly - do not re-derive.
 */
export async function getCurrentTenant(): Promise<TenantContext | null> {
  const h = await headers();
  const slug = h.get("x-tenant-slug");
  const customDomain = h.get("x-tenant-custom-domain");

  if (slug) {
    const company = await prisma.company.findUnique({ where: { slug } });
    if (!company || !company.isActive) return null;
    return { company, slug, customDomain: null };
  }

  if (customDomain) {
    const company = await prisma.company.findUnique({
      where: { customDomain },
    });
    if (!company || !company.isActive) return null;
    return { company, slug: null, customDomain };
  }

  return null;
}

export async function getCompanyById(companyId: string) {
  return prisma.company.findUnique({ where: { id: companyId } });
}
