import { NextRequest, NextResponse } from "next/server";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";

export function proxy(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const requestHeaders = new Headers(req.headers);

  let tenantSlug: string | null = null;
  let isCustomDomain = false;

  if (host.endsWith(ROOT_DOMAIN) && host !== ROOT_DOMAIN) {
    tenantSlug = host.replace(`.${ROOT_DOMAIN}`, "");
    if (tenantSlug === "www") tenantSlug = null;
  } else if (host !== ROOT_DOMAIN && !host.startsWith("localhost")) {
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
