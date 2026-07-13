import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const INVITE_PREFIX = "invite:";
const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

export function inviteIdentifier(email: string) {
  return `${INVITE_PREFIX}${email.toLowerCase().trim()}`;
}

export async function createInviteToken(email: string) {
  const token = randomBytes(24).toString("hex");
  const identifier = inviteIdentifier(email);
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

  await prisma.verification.deleteMany({ where: { identifier } });
  await prisma.verification.create({
    data: {
      identifier,
      value: token,
      expiresAt,
    },
  });

  return token;
}

export async function verifyInviteToken(email: string, token: string) {
  if (!token?.trim()) return false;
  const row = await prisma.verification.findFirst({
    where: {
      identifier: inviteIdentifier(email),
      value: token.trim(),
      expiresAt: { gt: new Date() },
    },
  });
  return !!row;
}

export async function consumeInviteToken(email: string) {
  await prisma.verification.deleteMany({
    where: { identifier: inviteIdentifier(email) },
  });
}
