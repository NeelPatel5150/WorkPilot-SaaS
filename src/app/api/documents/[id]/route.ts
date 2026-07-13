import { requireUser } from "@/lib/session";
import { getDocumentFile } from "@/services/document.service";
import { employeeRepo } from "@/repositories/employee.repository";
import path from "path";
import { readFile } from "fs/promises";
import { documentRepo } from "@/repositories/document.repository";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await context.params;
  const employee = user.companyId
    ? await employeeRepo.findByUserId(user.companyId, user.id)
    : null;

  try {
    const file = await getDocumentFile(
      {
        companyId: user.companyId!,
        role: user.role,
        employeeId: employee?.id ?? null,
      },
      id
    );

    if (file) {
      const inline =
        file.mime.startsWith("image/") || file.mime === "application/pdf";
      return new Response(new Uint8Array(file.data), {
        status: 200,
        headers: {
          "Content-Type": file.mime,
          "Content-Disposition": inline
            ? `inline; filename="${file.name.replace(/"/g, "")}"`
            : `attachment; filename="${file.name.replace(/"/g, "")}"`,
          "Cache-Control": "private, max-age=3600",
        },
      });
    }

    // Legacy disk fallback for older uploads
    const doc = await documentRepo.findById(user.companyId!, id);
    if (!doc?.fileUrl?.startsWith("/api/files/")) {
      return new Response("Not found", { status: 404 });
    }
    const relative = doc.fileUrl.replace("/api/files/", "");
    const root = path.join(
      /* turbopackIgnore: true */ process.cwd(),
      process.env.UPLOAD_DIR || "uploads"
    );
    const fullPath = path.join(root, ...relative.split("/"));
    if (!fullPath.startsWith(root)) {
      return new Response("Invalid", { status: 400 });
    }
    const data = await readFile(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    const mime =
      ext === ".pdf"
        ? "application/pdf"
        : ext === ".png"
          ? "image/png"
          : ext === ".jpg" || ext === ".jpeg"
            ? "image/jpeg"
            : "application/octet-stream";
    return new Response(data, {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `inline; filename="${doc.name.replace(/"/g, "")}"`,
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
