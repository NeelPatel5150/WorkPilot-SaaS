import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const uploadRoot = () =>
  path.join(/* turbopackIgnore: true */ process.cwd(), process.env.UPLOAD_DIR || "uploads");

export async function saveUpload(file: File, companyId: string) {
  const dir = path.join(uploadRoot(), companyId);
  await mkdir(dir, { recursive: true });

  const ext = path.extname(file.name) || "";
  const safeName = `${Date.now()}-${randomUUID()}${ext}`;
  const fullPath = path.join(dir, safeName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(fullPath, buffer);

  const fileUrl = `/api/files/${companyId}/${safeName}`;
  return { fileUrl, fullPath, originalName: file.name };
}

export async function deleteUpload(fileUrl: string) {
  if (!fileUrl.startsWith("/api/files/")) return;
  const relative = fileUrl.replace("/api/files/", "");
  const fullPath = path.join(uploadRoot(), relative);
  try {
    await unlink(fullPath);
  } catch {
    // ignore missing file
  }
}
