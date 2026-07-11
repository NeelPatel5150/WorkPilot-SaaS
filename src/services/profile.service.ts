import { prisma } from "@/lib/prisma";
import { saveUpload, deleteUpload } from "@/lib/storage";
import { ValidationError } from "@/lib/errors";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX = 5 * 1024 * 1024;

export async function updateUserAvatar(userId: string, companyId: string, file: File) {
  if (!file || file.size === 0) throw new ValidationError("Image is required");
  if (file.size > MAX) throw new ValidationError("Avatar must be under 5MB");
  if (!ALLOWED.has(file.type)) {
    throw new ValidationError("Use JPG, PNG, WEBP, or GIF");
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, companyId },
    select: { image: true },
  });
  if (!user) throw new ValidationError("User not found");

  const saved = await saveUpload(file, companyId);
  await prisma.user.update({
    where: { id: userId },
    data: { image: saved.fileUrl },
  });

  if (user.image?.startsWith("/api/files/")) {
    await deleteUpload(user.image);
  }

  return saved.fileUrl;
}
