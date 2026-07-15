import { randomUUID } from "crypto";
import { readFileSync } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import { authenticateMcpBearer, type McpActor } from "@/features/mcp/tokens";
import { callMcpTool, listToolsForScopes } from "@/features/mcp/tools";
import { getPromptForScopes, listPromptsForScopes } from "@/features/mcp/prompts";
import {
  MCP_RESOURCE_CATALOG,
  readMcpResource,
} from "@/features/mcp/tools-extended";
import { hasScope } from "@/features/mcp/scopes";
import { recordMcpUsage } from "@/features/mcp/usage";

export const runtime = "nodejs";

/** Protocol versions we accept / advertise (Streamable HTTP / MCP). */
const SUPPORTED_PROTOCOL_VERSIONS = [
  "2025-11-25",
  "2025-06-18",
  "2025-03-26",
  "2024-11-05",
] as const;
const DEFAULT_PROTOCOL_VERSION = "2025-03-26";

type JsonRpcId = string | number | null;

type JsonRpcMessage = {
  jsonrpc?: string;
  id?: JsonRpcId;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: unknown;
};

function mcpPublicBase(req: Request) {
  const env = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  if (env) return env;
  try {
    return new URL(req.url).origin;
  } catch {
    return "";
  }
}

/** PNG (+ optional HTTP URLs) for clients that honor SEP-973 icons. */
function buildServerIcons(base: string) {
  const icons: Array<{
    src: string;
    mimeType: string;
    sizes: string[];
  }> = [];

  try {
    // Prefer small PNG so data: URI stays light on every initialize
    const pngPath = path.join(process.cwd(), "public", "icons", "mcp-icon.png");
    const b64 = readFileSync(pngPath).toString("base64");
    icons.push({
      src: `data:image/png;base64,${b64}`,
      mimeType: "image/png",
      sizes: ["128x128"],
    });
  } catch {
    // optional asset
  }

  if (base) {
    icons.push({
      src: `${base}/icons/mcp-icon-256.png`,
      mimeType: "image/png",
      sizes: ["256x256"],
    });
    icons.push({
      src: `${base}/icons/mcp-icon.png`,
      mimeType: "image/png",
      sizes: ["128x128"],
    });
    icons.push({
      src: `${base}/icons/icon.svg`,
      mimeType: "image/svg+xml",
      sizes: ["512x512"],
    });
  }

  return icons;
}

function httpError(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("[mcp]", error);
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}

function jsonRpcResult(id: JsonRpcId | undefined, result: unknown, headers?: HeadersInit) {
  return NextResponse.json(
    { jsonrpc: "2.0", id: id ?? null, result },
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    }
  );
}

function jsonRpcError(
  id: JsonRpcId | undefined,
  code: number,
  message: string,
  status = 200
) {
  return NextResponse.json(
    {
      jsonrpc: "2.0",
      id: id ?? null,
      error: { code, message },
    },
    { status, headers: { "Content-Type": "application/json" } }
  );
}

function sanitizeMcpValue(value: unknown): unknown {
  if (value == null) return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(value)) return "[binary]";
  if (value instanceof Uint8Array) return "[binary]";
  if (Array.isArray(value)) return value.map(sanitizeMcpValue);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (
        k === "avatarData" ||
        k === "fileData" ||
        k === "logoData" ||
        k === "password" ||
        k === "passwordHash"
      ) {
        continue;
      }
      out[k] = sanitizeMcpValue(v);
    }
    return out;
  }
  return value;
}

function toolResultPayload(result: unknown) {
  const safe = sanitizeMcpValue(result);
  const text =
    typeof safe === "string" ? safe : JSON.stringify(safe, null, 2);
  // structuredContent must be a plain object (not an array) for many clients
  const structuredContent =
    safe !== null && typeof safe === "object" && !Array.isArray(safe)
      ? safe
      : Array.isArray(safe)
        ? { items: safe }
        : undefined;
  return {
    content: [{ type: "text" as const, text }],
    structuredContent,
  };
}

function toolErrorMessage(error: unknown) {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Tool execution failed";
}

function pickProtocolVersion(requested?: unknown) {
  if (
    typeof requested === "string" &&
    (SUPPORTED_PROTOCOL_VERSIONS as readonly string[]).includes(requested)
  ) {
    return requested;
  }
  return DEFAULT_PROTOCOL_VERSION;
}

function toMcpTools(actor: McpActor) {
  return listToolsForScopes(actor.scopes).map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema ?? { type: "object", properties: {} },
  }));
}

async function handleJsonRpc(actor: McpActor, msg: JsonRpcMessage, req: Request) {
  const method = msg.method;
  const id = msg.id;
  const isNotification = id === undefined && method != null;

  // JSON-RPC notification → 202 Accepted, empty body (Streamable HTTP)
  if (isNotification) {
    if (
      method === "notifications/initialized" ||
      method === "initialized" ||
      method === "notifications/cancelled"
    ) {
      return new NextResponse(null, { status: 202 });
    }
    return new NextResponse(null, { status: 202 });
  }

  if (!method) {
    return jsonRpcError(id, -32600, "Invalid Request: missing method");
  }

  if (method === "initialize") {
    const protocolVersion = pickProtocolVersion(msg.params?.protocolVersion);
    const sessionId = randomUUID();
    const base = mcpPublicBase(req);
    const icons = buildServerIcons(base);
    return jsonRpcResult(
      id,
      {
        protocolVersion,
        capabilities: {
          tools: { listChanged: false },
          prompts: { listChanged: false },
          resources: { subscribe: false, listChanged: false },
        },
        serverInfo: {
          name: "workpilot",
          title: "WorkPilot",
          version: "1.1.0",
          description:
            "White-label HRMS MCP — attendance, leave, payroll, and workspace tools for your company tenant.",
          ...(icons.length ? { icons } : {}),
        },
      },
      {
        "Mcp-Session-Id": sessionId,
        "MCP-Protocol-Version": protocolVersion,
      }
    );
  }

  if (method === "ping") {
    return jsonRpcResult(id, {});
  }

  if (method === "tools/list") {
    return jsonRpcResult(id, { tools: toMcpTools(actor) });
  }

  if (method === "prompts/list") {
    return jsonRpcResult(id, { prompts: listPromptsForScopes(actor.scopes) });
  }

  if (method === "prompts/get") {
    const name = String(msg.params?.name ?? "").trim();
    if (!name) {
      return jsonRpcError(id, -32602, "Invalid params: name is required");
    }
    const argObj =
      msg.params?.arguments && typeof msg.params.arguments === "object"
        ? (msg.params.arguments as Record<string, string>)
        : {};
    const prompt = getPromptForScopes(actor.scopes, name, argObj);
    if (!prompt) {
      recordMcpUsage({
        companyId: actor.companyId,
        tokenId: actor.tokenId,
        kind: "prompt",
        name,
        ok: false,
      });
      return jsonRpcError(id, -32602, `Unknown or unauthorized prompt: ${name}`);
    }
    recordMcpUsage({
      companyId: actor.companyId,
      tokenId: actor.tokenId,
      kind: "prompt",
      name,
      ok: true,
    });
    return jsonRpcResult(id, prompt);
  }

  if (method === "resources/list") {
    const resources = MCP_RESOURCE_CATALOG.filter((r) =>
      hasScope(actor.scopes, [...r.scopes])
    ).map((r) => ({
      uri: r.uri,
      name: r.name,
      description: r.description,
      mimeType: r.mimeType,
    }));
    return jsonRpcResult(id, { resources });
  }

  if (method === "resources/read") {
    const uri = String(msg.params?.uri ?? "").trim();
    if (!uri) {
      return jsonRpcError(id, -32602, "Invalid params: uri is required");
    }
    try {
      const text = await readMcpResource(actor, uri);
      return jsonRpcResult(id, {
        contents: [{ uri, mimeType: "application/json", text }],
      });
    } catch (error) {
      return jsonRpcResult(id, {
        isError: true,
        content: [{ type: "text", text: toolErrorMessage(error) }],
      });
    }
  }

  if (method === "tools/call") {
    const name = String(msg.params?.name ?? "").trim();
    if (!name) {
      return jsonRpcError(id, -32602, "Invalid params: name is required");
    }
    const args = (msg.params?.arguments as unknown) ?? {};
    try {
      const result = await callMcpTool(actor, name, args);
      return jsonRpcResult(id, toolResultPayload(result));
    } catch (error) {
      console.error("[mcp] tools/call", name, error);
      // MCP tools/call soft-errors are returned in result with isError
      return jsonRpcResult(id, {
        isError: true,
        content: [{ type: "text", text: toolErrorMessage(error) }],
      });
    }
  }

  // Echo protocol version header if client sends it (ignored otherwise)
  void req;
  return jsonRpcError(id, -32601, `Method not found: ${method}`);
}

/** Admin / curl convenience: list tools for this Bearer token. */
export async function GET(req: Request) {
  try {
    const actor = await authenticateMcpBearer(req.headers.get("authorization"));
    return NextResponse.json({
      server: "workpilot",
      version: "1.0.0",
      protocol: "mcp-jsonrpc",
      token: { name: actor.name, scopes: actor.scopes },
      tools: listToolsForScopes(actor.scopes),
    });
  } catch (error) {
    return httpError(error);
  }
}

/**
 * MCP Streamable HTTP (JSON-RPC 2.0) for Claude Desktop / mcp-remote.
 * Also accepts legacy REST: { "name", "arguments" } for older local scripts.
 */
export async function POST(req: Request) {
  try {
    const actor = await authenticateMcpBearer(req.headers.get("authorization"));
    const body = (await req.json().catch(() => null)) as JsonRpcMessage | {
      name?: string;
      arguments?: unknown;
      args?: unknown;
    } | null;

    if (!body || typeof body !== "object") {
      return jsonRpcError(null, -32700, "Parse error");
    }

    // Real MCP: JSON-RPC envelope
    if ("jsonrpc" in body || "method" in body) {
      return handleJsonRpc(actor, body as JsonRpcMessage, req);
    }

    // Legacy REST tool invoke (local scripts / smoke tests)
    const legacy = body as { name?: string; arguments?: unknown; args?: unknown };
    if (!legacy.name?.trim()) {
      return NextResponse.json(
        {
          error:
            "Expected MCP JSON-RPC ({ method: \"tools/call\", ... }) or legacy { name, arguments }",
        },
        { status: 422 }
      );
    }
    const result = await callMcpTool(
      actor,
      legacy.name.trim(),
      legacy.arguments ?? legacy.args ?? {}
    );
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    // Auth / fatal errors stay as HTTP errors so mcp-remote can surface them
    return httpError(error);
  }
}

/** Allow CORS preflight from local tooling if needed. */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
      "Access-Control-Allow-Headers":
        "Authorization, Content-Type, Accept, Mcp-Session-Id, MCP-Protocol-Version",
    },
  });
}

/** Streamable HTTP may DELETE a session — we are stateless, always OK. */
export async function DELETE() {
  return new NextResponse(null, { status: 204 });
}
