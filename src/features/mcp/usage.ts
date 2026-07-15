import { prisma } from "@/lib/prisma";
import { isAdminRole } from "@/lib/session";
import { ForbiddenError } from "@/lib/errors";
import type { UserRole } from "@/generated/prisma";

export type McpUsageKind = "tool" | "prompt";

/** Fire-and-forget usage log — never throws to callers. */
export function recordMcpUsage(input: {
  companyId: string;
  tokenId: string;
  kind: McpUsageKind;
  name: string;
  ok?: boolean;
}) {
  void prisma.mcpUsageEvent
    .create({
      data: {
        companyId: input.companyId,
        tokenId: input.tokenId,
        kind: input.kind,
        name: input.name.slice(0, 120),
        ok: input.ok !== false,
      },
    })
    .catch((err) => {
      console.error("[mcp] usage log failed", err);
    });
}

export type McpUsageSummary = {
  sinceDays: number;
  totalCalls: number;
  toolCalls: number;
  promptCalls: number;
  byTool: { name: string; count: number }[];
  byPrompt: { name: string; count: number }[];
  byToken: {
    tokenId: string;
    name: string;
    prefix: string;
    lastUsedAt: Date | string | null;
    callCount: number;
    revoked: boolean;
  }[];
  recent: {
    id: string;
    kind: string;
    name: string;
    ok: boolean;
    createdAt: Date | string;
    tokenName: string;
  }[];
};

export async function getMcpUsageSummary(
  companyId: string,
  role: UserRole,
  sinceDays = 30
): Promise<McpUsageSummary> {
  if (!isAdminRole(role)) {
    throw new ForbiddenError("Only admins can view MCP usage");
  }

  const since = new Date();
  since.setDate(since.getDate() - sinceDays);

  const [events, tokens] = await Promise.all([
    prisma.mcpUsageEvent.findMany({
      where: { companyId, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 5000,
      select: {
        id: true,
        kind: true,
        name: true,
        ok: true,
        tokenId: true,
        createdAt: true,
      },
    }),
    prisma.mcpToken.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        tokenPrefix: true,
        lastUsedAt: true,
        revokedAt: true,
      },
    }),
  ]);

  const toolCounts = new Map<string, number>();
  const promptCounts = new Map<string, number>();
  const tokenCounts = new Map<string, number>();
  let toolCalls = 0;
  let promptCalls = 0;

  for (const e of events) {
    tokenCounts.set(e.tokenId, (tokenCounts.get(e.tokenId) ?? 0) + 1);
    if (e.kind === "prompt") {
      promptCalls += 1;
      promptCounts.set(e.name, (promptCounts.get(e.name) ?? 0) + 1);
    } else {
      toolCalls += 1;
      toolCounts.set(e.name, (toolCounts.get(e.name) ?? 0) + 1);
    }
  }

  const sortDesc = (a: { count: number }, b: { count: number }) =>
    b.count - a.count;

  const tokenById = new Map(tokens.map((t) => [t.id, t]));

  return {
    sinceDays,
    totalCalls: events.length,
    toolCalls,
    promptCalls,
    byTool: [...toolCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort(sortDesc)
      .slice(0, 25),
    byPrompt: [...promptCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort(sortDesc)
      .slice(0, 25),
    byToken: tokens
      .map((t) => ({
        tokenId: t.id,
        name: t.name,
        prefix: t.tokenPrefix,
        lastUsedAt: t.lastUsedAt,
        callCount: tokenCounts.get(t.id) ?? 0,
        revoked: Boolean(t.revokedAt),
      }))
      .sort((a, b) => b.callCount - a.callCount),
    recent: events.slice(0, 40).map((e) => ({
      id: e.id,
      kind: e.kind,
      name: e.name,
      ok: e.ok,
      createdAt: e.createdAt,
      tokenName: tokenById.get(e.tokenId)?.name ?? "Unknown",
    })),
  };
}
