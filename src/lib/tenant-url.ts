/** Absolute URLs for a tenant (subdomain / custom domain / app fallback). */

type CompanyUrlFields = {
  slug: string;
  customDomain?: string | null;
};

/** Root product URL (no tenant subdomain) — preferred for auth/invite links on Vercel. */
export function getAppBaseUrl() {
  const explicit = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  if (explicit) return explicit;

  const root = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000").replace(
    /\/$/,
    ""
  );
  const protocol =
    process.env.NEXT_PUBLIC_APP_PROTOCOL ||
    (root.includes("localhost") ? "http" : "https");
  return `${protocol}://${root}`;
}

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

/** Invite accept always uses the main app host (not slug.subdomain). */
export function getTenantAcceptUrl(
  _company: CompanyUrlFields,
  email: string,
  token?: string
) {
  const params = new URLSearchParams({ email });
  if (token) params.set("token", token);
  return `${getAppBaseUrl()}/accept?${params.toString()}`;
}

/** Post-invite sign-in also uses the main app host for reliability. */
export function getInviteLoginUrl(_company?: CompanyUrlFields) {
  return `${getAppBaseUrl()}/login`;
}

export function getPublicBrandIconUrl(
  companyId: string,
  kind: "favicon" | "logo" = "logo"
) {
  return `${getAppBaseUrl()}/api/brand/icon?kind=${kind}&companyId=${companyId}`;
}
