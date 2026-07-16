import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import {
  DEFAULT_WORKPILOT_MANIFEST,
  manifestFromCompany,
} from "@/lib/company-shell";
import { getCurrentTenant } from "@/lib/tenant";

/** Default apex host manifest is static — no DB on every PWA install check. */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const h = await headers();
  const hasTenant =
    Boolean(h.get("x-tenant-slug")) || Boolean(h.get("x-tenant-custom-domain"));

  if (!hasTenant) {
    return DEFAULT_WORKPILOT_MANIFEST;
  }

  const tenant = await getCurrentTenant();
  if (!tenant?.company) {
    return DEFAULT_WORKPILOT_MANIFEST;
  }

  return manifestFromCompany(tenant.company);
}
