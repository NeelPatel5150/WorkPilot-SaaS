"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Copy, KeyRound, ShieldAlert } from "lucide-react";
import {
  MCP_DEFAULT_SCOPE_IDS,
  MCP_SCOPE_GROUPS,
  MCP_SCOPE_PACKS,
  MCP_SCOPES,
} from "@/features/mcp/scopes";
import {
  createMcpTokenAction,
  revokeMcpTokenAction,
} from "@/features/mcp/actions";
import type { McpUsageSummary } from "@/features/mcp/usage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toastError, toastSuccess } from "@/store/toast";

type TokenRow = {
  id: string;
  name: string;
  tokenPrefix: string;
  scopes: unknown;
  lastUsedAt: Date | string | null;
  revokedAt: Date | string | null;
  expiresAt: Date | string | null;
  createdAt: Date | string;
  user: { name: string; email: string };
};

function scopeList(scopes: unknown): string[] {
  return Array.isArray(scopes)
    ? scopes.filter((s): s is string => typeof s === "string")
    : [];
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-1.5"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          toastSuccess("Copied", label);
          window.setTimeout(() => setCopied(false), 1600);
        } catch {
          toastError("Copy failed", "Could not copy to clipboard");
        }
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      Copy
    </Button>
  );
}

function buildClientConfig(appBaseUrl: string, token: string) {
  const bearer = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
  return JSON.stringify(
    {
      mcpServers: {
        workpilot: {
          command: "npx",
          args: [
            "-y",
            "mcp-remote",
            `${appBaseUrl}/api/mcp`,
            "--header",
            "Authorization:${AUTH_HEADER}",
          ],
          env: {
            AUTH_HEADER: bearer,
          },
        },
      },
    },
    null,
    2
  );
}

function buildClaudeCodeHttpJson(appBaseUrl: string, token: string) {
  const bearer = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
  return JSON.stringify(
    {
      type: "http",
      url: `${appBaseUrl}/api/mcp`,
      headers: {
        Authorization: bearer,
      },
    },
    null,
    2
  );
}

export function McpAdminPanel({
  tokens: initialTokens,
  usage: initialUsage,
  appBaseUrl,
  company,
  adminEmail,
}: {
  tokens: TokenRow[];
  usage: McpUsageSummary;
  appBaseUrl: string;
  company: { id: string; name: string; slug: string; timezone: string } | null;
  adminEmail: string;
}) {
  const [tab, setTab] = useState<"tokens" | "usage" | "connect">("tokens");
  const [name, setName] = useState("Claude Desktop");
  const [selected, setSelected] = useState<string[]>([...MCP_DEFAULT_SCOPE_IDS]);
  const [rawToken, setRawToken] = useState<string | null>(null);
  const [tokens, setTokens] = useState(initialTokens);
  const [usage] = useState(initialUsage);
  const [pending, startTransition] = useTransition();

  const configJson = useMemo(
    () => buildClientConfig(appBaseUrl, rawToken ?? "wpmcp_PASTE_YOUR_TOKEN"),
    [appBaseUrl, rawToken]
  );

  const tokenValue = rawToken ?? "wpmcp_YOUR_TOKEN";
  const bearerValue = tokenValue.startsWith("Bearer ")
    ? tokenValue
    : `Bearer ${tokenValue}`;

  const claudeCodeCmd = `claude mcp add --transport http workpilot ${appBaseUrl}/api/mcp --header "Authorization: ${bearerValue}"`;
  const claudeMcpRemoveCmd = "claude mcp remove workpilot --scope local";

  const claudeCodeJson = useMemo(
    () => buildClaudeCodeHttpJson(appBaseUrl, rawToken ?? "wpmcp_YOUR_TOKEN"),
    [appBaseUrl, rawToken]
  );

  const curlCmd = `curl -s -H "Authorization: Bearer ${rawToken ?? "YOUR_TOKEN"}" ${appBaseUrl}/api/mcp`;

  const curlCallCmd = `curl -s -X POST ${appBaseUrl}/api/mcp -H "Authorization: Bearer ${rawToken ?? "YOUR_TOKEN"}" -H "Content-Type: application/json" -d "{\\"jsonrpc\\":\\"2.0\\",\\"id\\":1,\\"method\\":\\"tools/call\\",\\"params\\":{\\"name\\":\\"list_employees\\",\\"arguments\\":{}}}"`;

  const contextCheckCmd = `curl -s -X POST ${appBaseUrl}/api/mcp -H "Authorization: Bearer ${rawToken ?? "YOUR_TOKEN"}" -H "Content-Type: application/json" -d "{\\"jsonrpc\\":\\"2.0\\",\\"id\\":1,\\"method\\":\\"tools/call\\",\\"params\\":{\\"name\\":\\"get_token_context\\",\\"arguments\\":{}}}"`;

  function toggleScope(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  function createToken() {
    startTransition(async () => {
      const res = await createMcpTokenAction({ name, scopes: selected });
      if ("error" in res && res.error) {
        toastError("Could not create token", res.error);
        return;
      }
      if ("raw" in res && res.raw) {
        setRawToken(res.raw);
        toastSuccess("Token created", "Copy it now — it won’t be shown again.");
        setTab("connect");
        const list = await import("@/features/mcp/actions").then((m) =>
          m.listMcpTokensAction()
        );
        if ("tokens" in list && list.tokens) {
          setTokens(list.tokens as TokenRow[]);
        }
      }
    });
  }

  function revoke(id: string) {
    startTransition(async () => {
      const res = await revokeMcpTokenAction(id);
      if ("error" in res && res.error) {
        toastError("Revoke failed", res.error);
        return;
      }
      toastSuccess("Revoked", "Token can no longer call MCP tools.");
      setTokens((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, revokedAt: new Date().toISOString() } : t
        )
      );
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b-2 border-[var(--border)] pb-3">
        {(
          [
            ["tokens", "Tokens"],
            ["usage", "Usage"],
            ["connect", "How to use"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              tab === id
                ? "bg-[var(--primary)] text-white"
                : "bg-[var(--secondary)] text-[var(--foreground)] hover:opacity-90"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "tokens" ? (
        <div className="space-y-6">
          {company ? (
            <Card>
              <CardHeader>
                <CardTitle>Connection context</CardTitle>
                <CardDescription>
                  MCP tokens always scope to this company. After reconnecting Claude,
                  run <code>get_token_context</code> to verify the tenant.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
                <p>
                  <span className="text-[var(--muted-foreground)]">Company:</span>{" "}
                  <strong>{company.name}</strong> ({company.slug})
                </p>
                <p>
                  <span className="text-[var(--muted-foreground)]">Admin:</span>{" "}
                  {adminEmail}
                </p>
                <p>
                  <span className="text-[var(--muted-foreground)]">MCP URL:</span>{" "}
                  <code>{appBaseUrl}/api/mcp</code>
                </p>
                <p>
                  <span className="text-[var(--muted-foreground)]">Timezone:</span>{" "}
                  {company.timezone}
                </p>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Create MCP token
              </CardTitle>
              <CardDescription>
                Admin-only. Checkbox only what you need. Sensitive scopes stay off
                by default. No OpenAI — tools call WorkPilot only.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="mcp-name">Label</Label>
                <Input
                  id="mcp-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Claude Desktop · Ops"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelected(MCP_SCOPES.map((s) => s.id))}
                >
                  Select all
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelected([...MCP_DEFAULT_SCOPE_IDS])}
                >
                  Recommended ops set
                </Button>
                {MCP_SCOPE_PACKS.map((pack) => (
                  <Button
                    key={pack.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    title={pack.description}
                    onClick={() => {
                      setSelected([...pack.scopes]);
                      if (pack.id === "manager" && !name.toLowerCase().includes("manager")) {
                        setName("Claude · Manager");
                      } else if (pack.id === "hr" && !name.toLowerCase().includes("hr")) {
                        setName("Claude · HR");
                      } else if (
                        pack.id === "finance" &&
                        !name.toLowerCase().includes("finance")
                      ) {
                        setName("Claude · Finance");
                      }
                    }}
                  >
                    {pack.label} pack
                  </Button>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSelected(MCP_SCOPES.filter((s) => !s.sensitive).map((s) => s.id))
                  }
                >
                  All non-sensitive
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelected([])}
                >
                  Clear
                </Button>
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">
                Role packs:{" "}
                {MCP_SCOPE_PACKS.map((p) => p.label).join(" / ")} — Manager has no
                payroll or vault secrets.
              </p>

              {MCP_SCOPE_GROUPS.map((group) => {
                const scopes = MCP_SCOPES.filter((s) => s.group === group.id);
                if (!scopes.length) return null;
                return (
                  <div key={group.id} className="space-y-2">
                    <p className="text-xs font-black uppercase tracking-wide text-[var(--muted-foreground)]">
                      {group.label}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {scopes.map((scope) => {
                        const checked = selected.includes(scope.id);
                        return (
                          <label
                            key={scope.id}
                            className={`flex cursor-pointer gap-3 rounded-xl border-2 p-3 transition ${
                              checked
                                ? "border-[var(--primary)] bg-[var(--secondary)]"
                                : "border-[var(--border)] bg-white"
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="mt-1 h-4 w-4 accent-[var(--primary)]"
                              checked={checked}
                              onChange={() => toggleScope(scope.id)}
                            />
                            <span className="min-w-0">
                              <span className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-bold">{scope.label}</span>
                                {scope.sensitive ? (
                                  <Badge className="gap-1 border-amber-500 bg-amber-50 text-amber-950">
                                    <ShieldAlert className="h-3 w-3" />
                                    Sensitive
                                  </Badge>
                                ) : null}
                              </span>
                              <span className="mt-0.5 block text-xs text-[var(--muted-foreground)]">
                                {scope.description}
                              </span>
                              <span className="mt-1 block font-mono text-[10px] text-[var(--muted-foreground)]">
                                {scope.id}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <Button
                type="button"
                disabled={pending || selected.length === 0}
                onClick={createToken}
              >
                {pending ? "Creating…" : "Create token"}
              </Button>

              {rawToken ? (
                <div className="space-y-2 rounded-xl border-2 border-amber-400 bg-amber-50 p-4">
                  <p className="text-sm font-bold text-amber-950">
                    Copy this token now — it is shown only once.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="max-w-full flex-1 break-all rounded-lg bg-white px-3 py-2 font-mono text-xs">
                      {rawToken}
                    </code>
                    <CopyButton text={rawToken} label="MCP token" />
                  </div>
                  <Button type="button" size="sm" onClick={() => setTab("connect")}>
                    Continue to connect →
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Existing tokens</CardTitle>
              <CardDescription>Revoke anytime if a laptop or chat client is shared.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {tokens.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">No tokens yet.</p>
              ) : (
                tokens.map((t) => {
                  const scopes = scopeList(t.scopes);
                  const revoked = Boolean(t.revokedAt);
                  return (
                    <div
                      key={t.id}
                      className="flex flex-col gap-3 rounded-xl border-2 border-[var(--border)] p-4 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold">{t.name}</p>
                          {revoked ? (
                            <Badge className="bg-[var(--secondary)] text-[var(--muted-foreground)]">
                              Revoked
                            </Badge>
                          ) : (
                            <Badge className="border-[var(--primary)] text-[var(--primary)]">
                              Active
                            </Badge>
                          )}
                        </div>
                        <p className="font-mono text-xs text-[var(--muted-foreground)]">
                          {t.tokenPrefix}…
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          By {t.user.name} · {new Date(t.createdAt).toLocaleString()}
                          {t.lastUsedAt
                            ? ` · Last used ${new Date(t.lastUsedAt).toLocaleString()}`
                            : " · Never used"}
                        </p>
                        <div className="flex flex-wrap gap-1 pt-1">
                          {scopes.map((s) => (
                            <Badge key={s} className="font-mono text-[10px]">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {!revoked ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={pending}
                          onClick={() => revoke(t.id)}
                        >
                          Revoke
                        </Button>
                      ) : null}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      ) : tab === "usage" ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Last {usage.sinceDays} days</CardDescription>
                <CardTitle className="text-2xl">{usage.totalCalls}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-[var(--muted-foreground)]">
                Total tool + prompt calls
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Tool calls</CardDescription>
                <CardTitle className="text-2xl">{usage.toolCalls}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-[var(--muted-foreground)]">
                MCP tools/call
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Prompts fired</CardDescription>
                <CardTitle className="text-2xl">{usage.promptCalls}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-[var(--muted-foreground)]">
                Claude “Add from WorkPilot” prompts
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Tokens · last used</CardTitle>
              <CardDescription>
                Call volume in the last {usage.sinceDays} days (lastUsedAt updates on
                every authenticated MCP request).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {usage.byToken.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">No tokens yet.</p>
              ) : (
                usage.byToken.map((t) => (
                  <div
                    key={t.tokenId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-bold">
                        {t.name}{" "}
                        {t.revoked ? (
                          <span className="text-xs font-normal text-[var(--muted-foreground)]">
                            (revoked)
                          </span>
                        ) : null}
                      </p>
                      <p className="font-mono text-xs text-[var(--muted-foreground)]">
                        {t.prefix}…
                      </p>
                    </div>
                    <div className="text-right text-xs text-[var(--muted-foreground)]">
                      <p>
                        <span className="font-bold text-[var(--foreground)]">
                          {t.callCount}
                        </span>{" "}
                        calls
                      </p>
                      <p>
                        {t.lastUsedAt
                          ? `Last used ${new Date(t.lastUsedAt).toLocaleString()}`
                          : "Never used"}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top tools</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {usage.byTool.length === 0 ? (
                  <p className="text-sm text-[var(--muted-foreground)]">
                    No tool calls yet — connect Claude and run a tool.
                  </p>
                ) : (
                  usage.byTool.map((row) => (
                    <div
                      key={row.name}
                      className="flex justify-between gap-2 text-sm"
                    >
                      <code className="truncate">{row.name}</code>
                      <span className="font-bold tabular-nums">{row.count}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Prompts fired</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {usage.byPrompt.length === 0 ? (
                  <p className="text-sm text-[var(--muted-foreground)]">
                    No prompts yet.
                  </p>
                ) : (
                  usage.byPrompt.map((row) => (
                    <div
                      key={row.name}
                      className="flex justify-between gap-2 text-sm"
                    >
                      <code className="truncate">{row.name}</code>
                      <span className="font-bold tabular-nums">{row.count}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {usage.recent.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">Nothing yet.</p>
              ) : (
                usage.recent.map((e) => (
                  <div
                    key={e.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] py-1.5 text-xs last:border-0"
                  >
                    <div className="min-w-0">
                      <Badge className="mr-2 font-mono text-[10px]">{e.kind}</Badge>
                      <code>{e.name}</code>
                      {!e.ok ? (
                        <span className="ml-2 text-red-600">failed</span>
                      ) : null}
                      <span className="ml-2 text-[var(--muted-foreground)]">
                        · {e.tokenName}
                      </span>
                    </div>
                    <span className="text-[var(--muted-foreground)]">
                      {new Date(e.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>How to connect (anyone with a token)</CardTitle>
              <CardDescription>
                No WorkPilot repo clone. Create a token here, then connect Claude
                Code, Claude Desktop, or Cursor to{" "}
                <code>
                  {appBaseUrl}/api/mcp
                </code>{" "}
                with Bearer auth.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <section className="space-y-2 rounded-xl border-2 border-[var(--border)] p-4">
                <p className="font-bold">1. Create a token here</p>
                <ol className="list-decimal space-y-1.5 pl-5 text-[var(--muted-foreground)]">
                  <li>
                    Open the <strong>Tokens</strong> tab.
                  </li>
                  <li>
                    Choose scopes (or click <strong>Select all</strong> /{" "}
                    <strong>Recommended ops set</strong>).
                  </li>
                  <li>
                    Click <strong>Create token</strong> and <strong>Copy</strong>{" "}
                    the secret (starts with <code>wpmcp_</code>). Keep it private.
                  </li>
                </ol>
              </section>

              <section className="space-y-2 rounded-xl border-2 border-[var(--border)] p-4">
                <p className="font-bold">2a. Claude Code (terminal — recommended)</p>
                <p className="text-[var(--muted-foreground)]">
                  Same pattern as Anthropic docs: remote HTTP MCP with a Bearer
                  header. No <code>mcp-remote</code> wrapper needed.
                </p>
                <ol className="list-decimal space-y-1.5 pl-5 text-[var(--muted-foreground)]">
                  <li>
                    If you already connected WorkPilot with an old token or URL,
                    remove it first:{" "}
                    <code>claude mcp remove workpilot --scope local</code>
                  </li>
                  <li>
                    Install{" "}
                    <a
                      className="font-semibold text-[var(--primary)] underline"
                      href="https://docs.anthropic.com/en/docs/claude-code"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Claude Code
                    </a>
                    .
                  </li>
                  <li>
                    Run the command under <strong>Claude Code one-liner</strong>{" "}
                    below (token filled if you just created one).
                  </li>
                  <li>
                    Verify: <code>claude mcp list</code> or open Claude Code and
                    run <code>/mcp</code>.
                  </li>
                </ol>
                <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                  Optional JSON (<code>claude mcp add-json</code> /{" "}
                  <code>.mcp.json</code>): must include{" "}
                  <code>&quot;type&quot;: &quot;http&quot;</code> — a URL alone is
                  treated as broken stdio config.
                </p>
              </section>

              <section className="space-y-2 rounded-xl border-2 border-[var(--border)] p-4">
                <p className="font-bold">2b. Claude Desktop</p>
                <ol className="list-decimal space-y-1.5 pl-5 text-[var(--muted-foreground)]">
                  <li>
                    Install{" "}
                    <a
                      className="font-semibold text-[var(--primary)] underline"
                      href="https://nodejs.org"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Node.js LTS
                    </a>{" "}
                    (for <code>npx</code>).
                  </li>
                  <li>
                    Claude → <strong>Settings</strong> →{" "}
                    <strong>Developer</strong> → <strong>Edit Config</strong>.
                  </li>
                  <li>
                    Paste the <strong>Claude Desktop config</strong> below into{" "}
                    <code>claude_desktop_config.json</code>, save, fully Quit
                    Claude (tray → Exit), reopen.
                  </li>
                </ol>
              </section>

              <section className="space-y-2 rounded-xl border-2 border-[var(--border)] p-4">
                <p className="font-bold">2c. Cursor</p>
                <ol className="list-decimal space-y-1.5 pl-5 text-[var(--muted-foreground)]">
                  <li>
                    Cursor → Connectors / MCP settings → add server pointing at{" "}
                    <code>
                      {appBaseUrl}/api/mcp
                    </code>
                    .
                  </li>
                  <li>
                    Auth header: <code>Authorization: Bearer wpmcp_…</code> (same
                    token).
                  </li>
                  <li>
                    Or reuse the Claude Desktop <code>mcp-remote</code> JSON
                    block if your Cursor setup expects a stdio command.
                  </li>
                </ol>
              </section>

              <section className="space-y-2 rounded-xl border-2 border-[var(--border)] p-4">
                <p className="font-bold">3. MCP prompts (Claude Code)</p>
                <p className="text-[var(--muted-foreground)]">
                  After connecting, try prompts:{" "}
                  <code>daily_ops_brief</code>,{" "}
                  <code>pending_approvals_review</code>,{" "}
                  <code>payroll_month_check</code>. Sensitive writes need{" "}
                  <code>dryRun: true</code> first, then <code>confirm: true</code>.
                </p>
              </section>

              <section className="space-y-2 rounded-xl border-2 border-[var(--border)] p-4">
                <p className="font-bold">4. Ask for ops data</p>
                <p className="text-[var(--muted-foreground)]">
                  Examples: “Give me today’s WorkPilot ops digest.” · “List
                  departments.” · “List employees.” · “What leave is pending?”
                </p>
                <p className="mt-2 text-[var(--muted-foreground)]">
                  Tools only work for scopes on that token. Revoke anytime on the
                  Tokens tab.
                </p>
              </section>

              <section className="space-y-2 rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
                <p className="font-bold text-amber-950">If connect works but a tool fails</p>
                <ul className="list-disc space-y-1.5 pl-5 text-amber-950/80">
                  <li>
                    Create a fresh token with the scopes that tool needs (or
                    Recommended ops set).
                  </li>
                  <li>
                    Update the client header / config and restart the client.
                  </li>
                  <li>
                    Run the optional <strong>call tool</strong> curl below —
                    read the JSON error text (missing scope vs real failure).
                  </li>
                  <li>
                    List tools curl must return JSON with <code>tools</code>, not
                    an HTML login page.
                  </li>
                </ul>
              </section>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle>Remove old WorkPilot connection (Claude Code)</CardTitle>
                  <CardDescription className="mt-1">
                    Run this before adding a new token or URL so Claude does not keep
                    the previous server config.
                  </CardDescription>
                </div>
                <CopyButton text={claudeMcpRemoveCmd} label="Claude remove command" />
              </div>
            </CardHeader>
            <CardContent>
              <pre className="overflow-x-auto rounded-xl border-2 border-[var(--border)] bg-[var(--secondary)]/40 p-4 text-xs leading-relaxed whitespace-pre-wrap">
                {claudeMcpRemoveCmd}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle>Claude Code one-liner</CardTitle>
                  <CardDescription className="mt-1">
                    Remote HTTP transport. Token filled if you just created one.
                  </CardDescription>
                </div>
                <CopyButton text={claudeCodeCmd} label="Claude Code command" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <pre className="overflow-x-auto rounded-xl border-2 border-[var(--border)] bg-[var(--secondary)]/40 p-4 text-xs leading-relaxed whitespace-pre-wrap">
                {claudeCodeCmd}
              </pre>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-[var(--muted-foreground)]">
                  Or <code>claude mcp add-json workpilot &apos;…&apos;</code> with:
                </p>
                <CopyButton text={claudeCodeJson} label="Claude Code JSON" />
              </div>
              <pre className="overflow-x-auto rounded-xl border-2 border-[var(--border)] bg-[var(--secondary)]/40 p-4 text-xs leading-relaxed">
                {claudeCodeJson}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle>Claude Desktop config</CardTitle>
                  <CardDescription className="mt-1">
                    Uses <code>mcp-remote</code>. Paste into{" "}
                    <code>claude_desktop_config.json</code>.
                  </CardDescription>
                </div>
                <CopyButton text={configJson} label="Claude Desktop config" />
              </div>
            </CardHeader>
            <CardContent>
              <pre className="overflow-x-auto rounded-xl border-2 border-[var(--border)] bg-[var(--secondary)]/40 p-4 text-xs leading-relaxed">
                {configJson}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Verify token → company</CardTitle>
              <CardDescription>
                Calls <code>get_token_context</code> — confirms which company your
                token hits (must match the context above).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-start gap-2">
                <pre className="max-w-full flex-1 overflow-x-auto rounded-xl border-2 border-[var(--border)] bg-[var(--secondary)]/40 p-3 text-xs whitespace-pre-wrap">
                  {contextCheckCmd}
                </pre>
                <CopyButton text={contextCheckCmd} label="context check curl" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Optional: test the token</CardTitle>
              <CardDescription>
                List tools, then call one. You should see JSON (not HTML).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-start gap-2">
                <pre className="max-w-full flex-1 overflow-x-auto rounded-xl border-2 border-[var(--border)] bg-[var(--secondary)]/40 p-3 text-xs">
                  {curlCmd}
                </pre>
                <CopyButton text={curlCmd} label="list tools curl" />
              </div>
              <div className="flex flex-wrap items-start gap-2">
                <pre className="max-w-full flex-1 overflow-x-auto rounded-xl border-2 border-[var(--border)] bg-[var(--secondary)]/40 p-3 text-xs whitespace-pre-wrap">
                  {curlCallCmd}
                </pre>
                <CopyButton text={curlCallCmd} label="call tool curl" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
