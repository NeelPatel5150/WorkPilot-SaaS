import { NextRequest, NextResponse } from "next/server";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";

function platformHosts(): Set<string> {
  const hosts = new Set<string>([ROOT_DOMAIN, "localhost", "127.0.0.1"]);
  for (const raw of [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.BETTER_AUTH_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  ]) {
    if (!raw) continue;
    try {
      hosts.add(new URL(raw.includes("://") ? raw : `https://${raw}`).host);
    } catch {
      /* ignore bad URLs */
    }
  }
  return hosts;
}

/** Apex / deploy hosts are not tenant custom domains. */
function isPlatformHost(host: string) {
  if (!host) return true;
  if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) return true;
  // Preview + production *.vercel.app must never resolve as custom domains
  if (host.endsWith(".vercel.app")) return true;
  return platformHosts().has(host);
}

export function proxy(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const requestHeaders = new Headers(req.headers);

  let tenantSlug: string | null = null;
  let isCustomDomain = false;

  if (host.endsWith(ROOT_DOMAIN) && host !== ROOT_DOMAIN) {
    tenantSlug = host.replace(`.${ROOT_DOMAIN}`, "");
    if (tenantSlug === "www") tenantSlug = null;
  } else if (!isPlatformHost(host)) {
    isCustomDomain = true;
  }

  if (tenantSlug) requestHeaders.set("x-tenant-slug", tenantSlug);
  if (isCustomDomain) requestHeaders.set("x-tenant-custom-domain", host);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|icons/|manifest.webmanifest).*)",
  ],
};
