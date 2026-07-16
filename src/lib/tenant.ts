import { headers } from "next/headers";
import {
  getCachedCompanyShellByDomain,
  getCachedCompanyShellBySlug,
  type CompanyShell,
} from "@/lib/company-shell";

export type TenantContext = {
  company: CompanyShell;
  slug: string | null;
  customDomain: string | null;
};

/**
 * Sole reader of tenant request headers set by proxy.ts.
 * Every service/repository call takes companyId explicitly - do not re-derive.
 */
export async function getCurrentTenant(): Promise<TenantContext | null> {
  try {
    const h = await headers();
    const slug = h.get("x-tenant-slug");
    const customDomain = h.get("x-tenant-custom-domain");

    if (slug) {
      const company = await getCachedCompanyShellBySlug(slug);
      if (!company) return null;
      return { company, slug, customDomain: null };
    }

    if (customDomain) {
      const company = await getCachedCompanyShellByDomain(customDomain);
      if (!company) return null;
      return { company, slug: null, customDomain };
    }

    return null;
  } catch (error) {
    console.error("[tenant] getCurrentTenant failed:", error);
    return null;
  }
}

export async function getCompanyById(companyId: string) {
  const { getCachedCompanyShellById } = await import("@/lib/company-shell");
  return getCachedCompanyShellById(companyId);
}
