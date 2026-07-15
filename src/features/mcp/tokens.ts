import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { isAdminRole } from "@/lib/session";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/lib/errors";
import { activityRepo } from "@/repositories/activity.repository";
import {
  MCP_SCOPE_IDS,
  normalizeScopes,
  type McpScopeId,
} from "@/features/mcp/scopes";
import type { UserRole } from "@/generated/prisma";

const TOKEN_PREFIX = "wpmcp_";

function hashToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

function generateRawToken() {
  return `${TOKEN_PREFIX}${randomBytes(24).toString("base64url")}`;
}

export type McpActor = {
  tokenId: string;
  companyId: string;
  userId: string;
  role: UserRole;
  scopes: McpScopeId[];
  name: string;
};

export async function createMcpToken(
  actor: { id: string; companyId: string; role: UserRole },
  input: { name: string; scopes: string[]; expiresAt?: Date | null }
) {
  if (!isAdminRole(actor.role)) {
    throw new ForbiddenError("Only admins can create MCP tokens");
  }

  const name = input.name.trim();
  if (name.length < 2) throw new ValidationError("Token name is required");

  const scopes = normalizeScopes(input.scopes);
  if (scopes.length === 0) {
    throw new ValidationError("Select at least one scope");
  }

  const raw = generateRawToken();
  const tokenHash = hashToken(raw);
  const tokenPrefix = raw.slice(0, 12);

  const row = await prisma.mcpToken.create({
    data: {
      companyId: actor.companyId,
      userId: actor.id,
      name,
      tokenPrefix,
      tokenHash,
      scopes,
      expiresAt: input.expiresAt ?? null,
    },
  });

  await activityRepo.log(actor.companyId, "mcp.token_created", actor.id, {
    tokenId: row.id,
    scopes,
  });

  return { token: row, raw };
}

export async function listMcpTokens(companyId: string, role: UserRole) {
  if (!isAdminRole(role)) {
    throw new ForbiddenError("Only admins can manage MCP tokens");
  }
  return prisma.mcpToken.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      tokenPrefix: true,
      scopes: true,
      lastUsedAt: true,
      revokedAt: true,
      expiresAt: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
    },
  });
}

export async function revokeMcpToken(
  actor: { id: string; companyId: string; role: UserRole },
  tokenId: string
) {
  if (!isAdminRole(actor.role)) {
    throw new ForbiddenError("Only admins can revoke MCP tokens");
  }

  const existing = await prisma.mcpToken.findFirst({
    where: { id: tokenId, companyId: actor.companyId },
  });
  if (!existing) throw new NotFoundError("MCP token not found");
  if (existing.revokedAt) return existing;

  const row = await prisma.mcpToken.update({
    where: { id: tokenId },
    data: { revokedAt: new Date() },
  });

  await activityRepo.log(actor.companyId, "mcp.token_revoked", actor.id, {
    tokenId,
  });

  return row;
}

export async function authenticateMcpBearer(
  authorization: string | null
): Promise<McpActor> {
  if (!authorization?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing Bearer token");
  }

  const raw = authorization.slice("Bearer ".length).trim();
  if (!raw.startsWith(TOKEN_PREFIX) || raw.length < 20) {
    throw new UnauthorizedError("Invalid MCP token");
  }

  const tokenHash = hashToken(raw);
  const row = await prisma.mcpToken.findUnique({
    where: { tokenHash },
    include: {
      user: { select: { id: true, role: true, isActive: true, companyId: true } },
    },
  });

  if (!row || row.revokedAt) {
    throw new UnauthorizedError("MCP token revoked or unknown");
  }
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
    throw new UnauthorizedError("MCP token expired");
  }
  if (!row.user.isActive || !row.user.companyId) {
    throw new UnauthorizedError("Token owner inactive");
  }
  if (!isAdminRole(row.user.role)) {
    throw new ForbiddenError("MCP is admin-only");
  }
  if (row.user.companyId !== row.companyId) {
    throw new UnauthorizedError("Token tenant mismatch");
  }

  const scopes = normalizeScopes(row.scopes);
  if (scopes.length === 0) {
    throw new ForbiddenError("Token has no scopes");
  }

  void prisma.mcpToken
    .update({
      where: { id: row.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => undefined);

  return {
    tokenId: row.id,
    companyId: row.companyId,
    userId: row.userId,
    role: row.user.role,
    scopes,
    name: row.name,
  };
}

export { MCP_SCOPE_IDS };
