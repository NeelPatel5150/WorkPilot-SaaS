import { getCurrentTenant } from "@/lib/tenant";

export type AuthBrand = {
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  companyId: string;
};

export async function getAuthBrand(): Promise<AuthBrand | null> {
  const tenant = await getCurrentTenant();
  if (!tenant?.company) return null;
  const c = tenant.company;
  return {
    name: c.name,
    logoUrl: c.logoUrl,
    primaryColor: c.primaryColor,
    secondaryColor: c.secondaryColor,
    companyId: c.id,
  };
}
