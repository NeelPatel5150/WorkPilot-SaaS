import { hashPassword, verifyPassword } from "better-auth/crypto";
import { prisma } from "@/lib/prisma";
import { deleteUpload } from "@/lib/storage";
import { ValidationError } from "@/lib/errors";
import { activityRepo } from "@/repositories/activity.repository";

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

  const buffer = new Uint8Array(await file.arrayBuffer()) as Uint8Array<ArrayBuffer>;
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

export async function changeUserPassword(
  userId: string,
  companyId: string,
  input: { currentPassword: string; newPassword: string; confirmPassword: string }
) {
  const currentPassword = input.currentPassword.trim();
  const newPassword = input.newPassword;
  const confirmPassword = input.confirmPassword;

  if (!currentPassword) throw new ValidationError("Current password is required");
  if (newPassword.length < 8) {
    throw new ValidationError("New password must be at least 8 characters");
  }
  if (newPassword !== confirmPassword) {
    throw new ValidationError("New passwords do not match");
  }
  if (currentPassword === newPassword) {
    throw new ValidationError("New password must be different from your current password");
  }

  const account = await prisma.account.findFirst({
    where: { userId, providerId: "credential" },
  });
  if (!account?.password) {
    throw new ValidationError("Password login is not set up for this account");
  }

  const ok = await verifyPassword({
    hash: account.password,
    password: currentPassword,
  });
  if (!ok) throw new ValidationError("Current password is incorrect");

  const hashed = await hashPassword(newPassword);
  await prisma.account.update({
    where: { id: account.id },
    data: { password: hashed },
  });

  await activityRepo.log(companyId, "user.password_changed", userId, { userId });
}
