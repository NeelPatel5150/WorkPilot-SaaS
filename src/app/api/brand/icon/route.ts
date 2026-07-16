import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { readFile } from "fs/promises";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";

const brandBinarySelect = {
  logoUrl: true,
  faviconUrl: true,
  logoData: true,
  logoMime: true,
  faviconData: true,
  faviconMime: true,
} as const;

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
};

/**
 * Public white-label icon (favicon/logo) - no auth required.
 * Serves from DB first; falls back to legacy disk uploads.
 */
export async function GET(req: NextRequest) {
  const kind = req.nextUrl.searchParams.get("kind") === "logo" ? "logo" : "favicon";
  const companyIdParam = req.nextUrl.searchParams.get("companyId");

  let companyId = companyIdParam;
  if (!companyId) {
    const tenant = await getCurrentTenant();
    companyId = tenant?.company.id ?? null;
  }

  if (!companyId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: brandBinarySelect,
  });

  if (!company) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const dbData =
    kind === "logo"
      ? company.logoData || company.faviconData
      : company.faviconData || company.logoData;
  const dbMime =
    kind === "logo"
      ? company.logoMime || company.faviconMime
      : company.faviconMime || company.logoMime;

  if (dbData && dbMime) {
    return new NextResponse(new Uint8Array(dbData), {
      headers: {
        "Content-Type": dbMime,
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  // Legacy disk fallback
  const fileUrl =
    kind === "logo"
      ? company.logoUrl || company.faviconUrl
      : company.faviconUrl || company.logoUrl;
  if (!fileUrl?.startsWith("/api/files/")) {
    return NextResponse.json({ error: "No icon" }, { status: 404 });
  }

  const relative = fileUrl.replace("/api/files/", "");
  const root = path.join(
    /* turbopackIgnore: true */ process.cwd(),
    process.env.UPLOAD_DIR || "uploads"
  );
  const fullPath = path.join(root, ...relative.split("/"));
  if (!fullPath.startsWith(root)) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }

  try {
    const data = await readFile(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    return new NextResponse(data, {
      headers: {
        "Content-Type": MIME[ext] || "image/png",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Missing file" }, { status: 404 });
  }
}
