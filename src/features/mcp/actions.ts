"use server";

import { revalidatePath } from "next/cache";
import { requireUser, isAdminRole } from "@/lib/session";
import { toActionError } from "@/lib/errors";
import {
  createMcpToken,
  listMcpTokens,
  revokeMcpToken,
} from "@/features/mcp/tokens";
import { MCP_SCOPES } from "@/features/mcp/scopes";
import { getMcpUsageSummary } from "@/features/mcp/usage";

export async function createMcpTokenAction(input: {
  name: string;
  scopes: string[];
}) {
  try {
    const user = await requireUser();
    if (!isAdminRole(user.role)) {
      return { error: "Only admins can create MCP tokens" };
    }
    const { token, raw } = await createMcpToken(
      { id: user.id, companyId: user.companyId!, role: user.role },
      { name: input.name, scopes: input.scopes }
    );
    revalidatePath("/admin/mcp");
    return {
      success: true as const,
      id: token.id,
      raw,
      prefix: token.tokenPrefix,
      scopes: token.scopes as string[],
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function revokeMcpTokenAction(tokenId: string) {
  try {
    const user = await requireUser();
    if (!isAdminRole(user.role)) {
      return { error: "Only admins can revoke MCP tokens" };
    }
    await revokeMcpToken(
      { id: user.id, companyId: user.companyId!, role: user.role },
      tokenId
    );
    revalidatePath("/admin/mcp");
    return { success: true as const };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getMcpCatalogAction() {
  return { scopes: MCP_SCOPES };
}

export async function listMcpTokensAction() {
  try {
    const user = await requireUser();
    if (!isAdminRole(user.role)) {
      return { error: "Only admins can manage MCP tokens" };
    }
    const tokens = await listMcpTokens(user.companyId!, user.role);
    return { success: true as const, tokens };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getMcpUsageAction(sinceDays = 30) {
  try {
    const user = await requireUser();
    if (!isAdminRole(user.role)) {
      return { error: "Only admins can view MCP usage" };
    }
    const usage = await getMcpUsageSummary(
      user.companyId!,
      user.role,
      sinceDays
    );
    return { success: true as const, usage };
  } catch (error) {
    return toActionError(error);
  }
}
