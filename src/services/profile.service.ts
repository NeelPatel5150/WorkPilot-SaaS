import { prisma } from "@/lib/prisma";
import { deleteUpload } from "@/lib/storage";
import { ValidationError } from "@/lib/errors";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
/** Avatars live in Postgres — keep small. */
const MAX = 800 * 1024;

export function avatarPublicUrl(userId: string) {
  return `/api/avatars/${userId}`;
}

export async function updateUserAvatar(userId: string, companyId: string, file: File) {
  if (!file || file.size === 0) throw new ValidationError("Image is required");
  if (file.size > MAX) {
    throw new ValidationError("Avatar must be under 800KB (compress or crop the photo)");
  }
  if (!ALLOWED.has(file.type)) {
    throw new ValidationError("Use JPG, PNG, WEBP, or GIF");
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, companyId },
    select: { image: true },
  });
  if (!user) throw new ValidationError("User not found");

  const buffer = Buffer.from(await file.arrayBuffer());
  const imageUrl = `${avatarPublicUrl(userId)}?v=${Date.now()}`;

  await prisma.user.update({
    where: { id: userId },
    data: {
      avatarData: buffer,
      avatarMime: file.type,
      image: imageUrl,
    },
  });

  // Clean up legacy disk uploads from older versions
  if (user.image?.startsWith("/api/files/")) {
    await deleteUpload(user.image);
  }

  return imageUrl;
}

export async function getUserAvatar(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarData: true, avatarMime: true },
  });
  if (!user?.avatarData || !user.avatarMime) return null;
  return {
    data: Buffer.from(user.avatarData),
    mime: user.avatarMime,
  };
}
