import { cache } from "react";
import { unstable_cache, updateTag } from "next/cache";
import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

/** Company row for layouts/theme — excludes binary logo/favicon blobs. */
export const companyShellSelect = {
  id: true,
  name: true,
  slug: true,
  address: true,
  logoUrl: true,
  faviconUrl: true,
  primaryColor: true,
  secondaryColor: true,
  customDomain: true,
  smtpConfig: true,
  timezone: true,
  isActive: true,
  setupComplete: true,
  plan: true,
  seatLimit: true,
  trialEndsAt: true,
  billingStatus: true,
  workStartHour: true,
  workStartMinute: true,
  graceMinutes: true,
  standardHours: true,
  weeklyOffs: true,
  officeLat: true,
  officeLng: true,
  geofenceRadiusM: true,
  officeIpAllowlist: true,
  whatsappNumber: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CompanySelect;

export type CompanyShell = Prisma.CompanyGetPayload<{
  select: typeof companyShellSelect;
}>;

export const employeeShellSelect = {
  id: true,
  companyId: true,
  userId: true,
  employeeCode: true,
  firstName: true,
  lastName: true,
  designation: true,
  employmentStatus: true,
} satisfies Prisma.EmployeeSelect;

export type EmployeeShell = Prisma.EmployeeGetPayload<{
  select: typeof employeeShellSelect;
}>;

export const requireUserSelect = {
  id: true,
  name: true,
  email: true,
  emailVerified: true,
  image: true,
  companyId: true,
  role: true,
  isActive: true,
  mustChangePassword: true,
  createdAt: true,
  updatedAt: true,
  employee: { select: employeeShellSelect },
  company: { select: companyShellSelect },
} satisfies Prisma.UserSelect;

export type RequireUserResult = Prisma.UserGetPayload<{
  select: typeof requireUserSelect;
}>;

const BRAND_CACHE_SECONDS = 60;

async function loadCompanyShellById(companyId: string) {
  return prisma.company.findUnique({
    where: { id: companyId, isActive: true },
    select: companyShellSelect,
  });
}

async function loadCompanyShellBySlug(slug: string) {
  return prisma.company.findUnique({
    where: { slug, isActive: true },
    select: companyShellSelect,
  });
}

async function loadCompanyShellByDomain(customDomain: string) {
  return prisma.company.findUnique({
    where: { customDomain, isActive: true },
    select: companyShellSelect,
  });
}

/** Cross-request cache for tenant branding (public pages, manifest, theme). */
export function getCachedCompanyShellById(companyId: string) {
  return unstable_cache(
    () => loadCompanyShellById(companyId),
    ["company-shell-id", companyId],
    { revalidate: BRAND_CACHE_SECONDS, tags: [`company-${companyId}`] }
  )();
}

export function getCachedCompanyShellBySlug(slug: string) {
  return unstable_cache(
    () => loadCompanyShellBySlug(slug),
    ["company-shell-slug", slug],
    { revalidate: BRAND_CACHE_SECONDS, tags: [`company-slug-${slug}`] }
  )();
}

export function getCachedCompanyShellByDomain(customDomain: string) {
  return unstable_cache(
    () => loadCompanyShellByDomain(customDomain),
    ["company-shell-domain", customDomain],
    { revalidate: BRAND_CACHE_SECONDS, tags: [`company-domain-${customDomain}`] }
  )();
}

/** Same-request dedup when layout + metadata both resolve company. */
export const getCompanyShellById = cache(async (companyId: string) => {
  return getCachedCompanyShellById(companyId);
});

export const DEFAULT_WORKPILOT_MANIFEST: MetadataRoute.Manifest = {
  name: "WorkPilot",
  short_name: "WorkPilot",
  description: "White-label HRMS - attendance, leave, and payroll.",
  start_url: "/portal",
  scope: "/",
  display: "standalone",
  orientation: "portrait-primary",
  background_color: "#EFF6FF",
  theme_color: "#2563EB",
  categories: ["business", "productivity"],
  icons: [
    {
      src: "/icons/icon.svg",
      sizes: "192x192",
      type: "image/svg+xml",
      purpose: "any",
    },
    {
      src: "/icons/icon.svg",
      sizes: "512x512",
      type: "image/svg+xml",
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

export function manifestFromCompany(
  company: CompanyShell
): MetadataRoute.Manifest {
  const iconSrc =
    company.logoUrl || company.faviconUrl
      ? `/api/brand/icon?kind=logo&companyId=${company.id}`
      : "/icons/icon.svg";

  return {
    name: `${company.name} Portal`,
    short_name: company.name.slice(0, 12) || "WorkPilot",
    description: `${company.name} WorkPilot app - punch, leave, payslips.`,
    start_url: "/portal",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: company.secondaryColor,
    theme_color: company.primaryColor,
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

/** Bust cached branding after admin updates company profile. */
export function revalidateCompanyShellCache(
  companyId: string,
  slug?: string | null,
  customDomain?: string | null
) {
  updateTag(`company-${companyId}`);
  if (slug) updateTag(`company-slug-${slug}`);
  if (customDomain) updateTag(`company-domain-${customDomain}`);
}
