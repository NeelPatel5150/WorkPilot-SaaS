import { z } from "zod";
import { hasScope, type McpScopeId } from "@/features/mcp/scopes";
import type { McpActor } from "@/features/mcp/tokens";
import { ForbiddenError, ValidationError } from "@/lib/errors";

export type JsonSchema = Record<string, unknown>;

export type McpToolDef = {
  name: string;
  description: string;
  scopes: McpScopeId[];
  inputSchema: z.ZodType;
  jsonSchema: JsonSchema;
  handler: (actor: McpActor, args: unknown) => Promise<unknown>;
};

export const emptyObject: JsonSchema = {
  type: "object",
  properties: {},
  additionalProperties: false,
};

export const emptyInput = z.preprocess(
  (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {}),
  z.object({}).passthrough()
);

export function asToolArgs(args: unknown): Record<string, unknown> {
  if (args && typeof args === "object" && !Array.isArray(args)) {
    return args as Record<string, unknown>;
  }
  return {};
}

export const mcpInt = z.coerce.number().int();
export const mcpNum = z.coerce.number();
export const mcpBool = z.preprocess((v) => {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["true", "1", "yes"].includes(s)) return true;
    if (["false", "0", "no"].includes(s)) return false;
  }
  return v;
}, z.boolean());

export function upperEnum<const T extends [string, ...string[]]>(values: T) {
  return z.preprocess(
    (v) => (typeof v === "string" ? v.trim().toUpperCase() : v),
    z.enum(values)
  );
}

export function lowerEnum<const T extends [string, ...string[]]>(values: T) {
  return z.preprocess(
    (v) => (typeof v === "string" ? v.trim().toLowerCase() : v),
    z.enum(values)
  );
}

export const confirmShape = {
  dryRun: mcpBool.optional(),
  confirm: mcpBool.optional(),
};

export const confirmJsonProps = {
  dryRun: {
    type: "boolean",
    description: "If true, preview the action without applying changes.",
  },
  confirm: {
    type: "boolean",
    description:
      "Must be true to execute. Only set after the human replies “confirm” in chat.",
  },
};

export function requireScopes(actor: McpActor, scopes: McpScopeId[]) {
  if (!hasScope(actor.scopes, scopes)) {
    throw new ForbiddenError(
      `Missing scope(s): ${scopes.filter((s) => !actor.scopes.includes(s)).join(", ")}`
    );
  }
}

export function actorCtx(actor: McpActor) {
  return {
    id: actor.userId,
    companyId: actor.companyId,
    role: actor.role,
  };
}

export function isoOrNull(value: Date | string | null | undefined) {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export type WriteGate = "dryRun" | "execute";

/**
 * Gate sensitive MCP writes behind dryRun preview or confirm: true.
 * Ask the human in chat to say “confirm” before setting confirm: true.
 */
export function gateWrite(
  input: { dryRun?: boolean; confirm?: boolean },
  action: string
): WriteGate {
  if (input.dryRun === true) return "dryRun";
  if (input.confirm !== true) {
    throw new ValidationError(
      `Do not ${action} yet. First preview with dryRun: true (optional), then ask the human to reply “confirm”. Only then call again with confirm: true.`
    );
  }
  return "execute";
}

export function dryRunResult(action: string, preview: Record<string, unknown>) {
  return {
    dryRun: true,
    action,
    preview,
    message: "No changes applied. Re-run with confirm: true to execute.",
  };
}
