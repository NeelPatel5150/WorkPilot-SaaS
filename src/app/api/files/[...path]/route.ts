import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { readFile } from "fs/promises";
import { requireUser } from "@/lib/session";

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
};

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const user = await requireUser();
  const segments = (await context.params).path;
  if (!segments?.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const companyId = segments[0];
  if (companyId !== user.companyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const root = path.join(
    /* turbopackIgnore: true */ process.cwd(),
    process.env.UPLOAD_DIR || "uploads"
  );
  const fullPath = path.join(root, ...segments);
  if (!fullPath.startsWith(root)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    const data = await readFile(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME[ext] || "application/octet-stream";
    const inline = contentType.startsWith("image/") || contentType === "application/pdf";
    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": inline
          ? "inline"
          : `attachment; filename="${segments.at(-1)}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
