/**
 * Optional local stdio MCP bridge.
 *
 * Preferred setup for most users: Claude Desktop + mcp-remote → live
 * https://…/api/mcp (see Admin → MCP → How to use). No clone needed.
 *
 * This script is only if you want a local stdio process. It still talks HTTP
 * to WorkPilot (JSON-RPC MCP on POST, or legacy REST { name, arguments }).
 *
 * Env:
 *   WORKPILOT_URL          e.g. https://workpilot-saas.vercel.app
 *   WORKPILOT_MCP_TOKEN    wpmcp_...
 */

const URL_BASE = (process.env.WORKPILOT_URL || "").replace(/\/$/, "");
const TOKEN = process.env.WORKPILOT_MCP_TOKEN || "";

if (!URL_BASE || !TOKEN) {
  console.error(
    "WORKPILOT_URL and WORKPILOT_MCP_TOKEN are required for the WorkPilot MCP bridge."
  );
  process.exit(1);
}

type JsonRpcReq = {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
};

async function apiJsonRpc(method: string, params?: Record<string, unknown>, id: number = 1) {
  const res = await fetch(`${URL_BASE}/api/mcp`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id,
      method,
      params: params ?? {},
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    result?: { content?: { type: string; text?: string }[]; isError?: boolean };
    error?: { message?: string } | string;
  };
  if (!res.ok) {
    throw new Error(
      typeof data.error === "string"
        ? data.error
        : data.error?.message ?? `Request failed (${res.status})`
    );
  }
  if (data.error) {
    throw new Error(
      typeof data.error === "string"
        ? data.error
        : data.error.message ?? "RPC error"
    );
  }
  const text = data.result?.content?.[0]?.text;
  if (typeof text === "string") {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }
  return data.result;
}

function send(msg: unknown) {
  const json = JSON.stringify(msg);
  const len = Buffer.byteLength(json, "utf8");
  process.stdout.write(`Content-Length: ${len}\r\n\r\n${json}`);
}

function reply(id: string | number | null | undefined, result: unknown) {
  send({ jsonrpc: "2.0", id: id ?? null, result });
}

function replyError(
  id: string | number | null | undefined,
  code: number,
  message: string
) {
  send({
    jsonrpc: "2.0",
    id: id ?? null,
    error: { code, message },
  });
}

async function handle(msg: JsonRpcReq) {
  const { id, method, params } = msg;

  if (method === "initialize") {
    reply(id, {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "workpilot", version: "1.0.0" },
    });
    return;
  }

  if (
    method === "notifications/initialized" ||
    method === "initialized" ||
    method === "notifications/cancelled"
  ) {
    return;
  }

  if (method === "ping") {
    reply(id, {});
    return;
  }

  if (method === "tools/list") {
    try {
      const result = (await apiJsonRpc("tools/list", {}, 1)) as {
        tools?: unknown[];
      };
      reply(id, { tools: result?.tools ?? [] });
    } catch (e) {
      replyError(id, -32000, e instanceof Error ? e.message : "List failed");
    }
    return;
  }

  if (method === "tools/call") {
    try {
      const name = String(params?.name ?? "");
      const args = (params?.arguments as Record<string, unknown>) ?? {};
      const result = await apiJsonRpc("tools/call", { name, arguments: args }, 2);
      reply(id, result);
    } catch (e) {
      reply(id, {
        isError: true,
        content: [
          {
            type: "text",
            text: e instanceof Error ? e.message : "Tool failed",
          },
        ],
      });
    }
    return;
  }

  if (id !== undefined && id !== null) {
    replyError(id, -32601, `Method not found: ${method}`);
  }
}

let buffer = Buffer.alloc(0);

process.stdin.on("data", (chunk: Buffer) => {
  buffer = Buffer.concat([buffer, chunk]);
  while (true) {
    const headerEnd = buffer.indexOf("\r\n\r\n");
    if (headerEnd === -1) break;
    const header = buffer.subarray(0, headerEnd).toString("utf8");
    const match = /Content-Length:\s*(\d+)/i.exec(header);
    if (!match) {
      buffer = buffer.subarray(headerEnd + 4);
      continue;
    }
    const length = Number(match[1]);
    const bodyStart = headerEnd + 4;
    if (buffer.length < bodyStart + length) break;
    const body = buffer.subarray(bodyStart, bodyStart + length).toString("utf8");
    buffer = buffer.subarray(bodyStart + length);
    try {
      const msg = JSON.parse(body) as JsonRpcReq;
      void handle(msg);
    } catch (e) {
      console.error("[workpilot-mcp] parse error", e);
    }
  }
});

process.stdin.resume();
