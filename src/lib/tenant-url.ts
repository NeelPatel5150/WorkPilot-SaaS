/** Absolute URLs for a tenant (subdomain / custom domain / app fallback). */

type CompanyUrlFields = {
  slug: string;
  customDomain?: string | null;
};

export function getTenantBaseUrl(company: CompanyUrlFields) {
  const root = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000").replace(
    /\/$/,
    ""
  );
  const protocol =
    process.env.NEXT_PUBLIC_APP_PROTOCOL ||
    (root.includes("localhost") ? "http" : "https");

  if (company.customDomain) {
    return `${protocol}://${company.customDomain}`;
  }

  // Subdomain only when not using bare localhost without port quirks
  if (root.startsWith("localhost")) {
    const app = (process.env.NEXT_PUBLIC_APP_URL || `http://${root}`).replace(/\/$/, "");
    return app;
  }

  return `${protocol}://${company.slug}.${root}`;
}

export function getTenantLoginUrl(company: CompanyUrlFields) {
  return `${getTenantBaseUrl(company)}/login`;
}

export function getTenantAcceptUrl(company: CompanyUrlFields, email: string) {
  return `${getTenantBaseUrl(company)}/accept?email=${encodeURIComponent(email)}`;
}

export function getPublicBrandIconUrl(
  companyId: string,
  kind: "favicon" | "logo" = "logo"
) {
  const app = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
  return `${app}/api/brand/icon?kind=${kind}&companyId=${companyId}`;
}
