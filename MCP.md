# WorkPilot MCP — Complete Guide

This document explains **what MCP is**, **how WorkPilot implements it**, **how token-based auth works**, **how to create and use tokens**, and **useful features we can expand next**.

---

## 1. What is MCP?

**MCP (Model Context Protocol)** is an open protocol that lets AI clients (Claude Desktop, Cursor, Claude Code, custom agents) call **tools** and read **resources** on a remote server.

In WorkPilot terms:

| Without MCP | With MCP |
|-------------|----------|
| Admin opens UI and clicks | AI asks WorkPilot APIs through tools |
| Manual digests every morning | AI runs `get_ops_digest` + approvals list |
| Copy-paste between chat and HRMS | Same tenant data, scoped + audited |

WorkPilot exposes a **tenant-scoped MCP server** at:

```text
POST/GET  {APP_URL}/api/mcp
```

Example local:

```text
http://localhost:3000/api/mcp
```

---

## 2. How WorkPilot MCP is designed (white-label safe)

Important design rules:

1. **Every call is scoped to one company** (`companyId` from the token).
2. **No cookie/session login for MCP** — only **Bearer token** (`wpmcp_…`).
3. **Scopes** limit which tools the token can call (least privilege).
4. **Raw token is shown once** when created; DB stores only **SHA-256 hash**.
5. Token owner must be an **active admin** (`COMPANY_ADMIN` / `HR` / `SUPER_ADMIN`).
6. Sensitive binary fields (passwords, avatars, file blobs) are stripped from tool results.

```mermaid
flowchart LR
  Client[Claude_or_Cursor]
  Remote[mcp-remote_or_stdio_bridge]
  API["/api/mcp"]
  Auth[authenticateMcpBearer]
  Tools[callMcpTool]
  Services[HR_services_Prisma]
  DB[(Postgres_tenant_rows)]

  Client --> Remote --> API --> Auth --> Tools --> Services --> DB
  Auth -->|"companyId + scopes"| Tools
```

---

## 3. Files map (our implementation)

| Path | Role |
|------|------|
| [`src/app/api/mcp/route.ts`](src/app/api/mcp/route.ts) | HTTP + JSON-RPC MCP endpoint |
| [`src/features/mcp/tokens.ts`](src/features/mcp/tokens.ts) | Create / list / revoke / authenticate tokens |
| [`src/features/mcp/scopes.ts`](src/features/mcp/scopes.ts) | Scope catalog + defaults |
| [`src/features/mcp/tools.ts`](src/features/mcp/tools.ts) | Core tools (ops, attendance, leave, payroll…) |
| [`src/features/mcp/tools-extended.ts`](src/features/mcp/tools-extended.ts) | Extended tools + resources |
| [`src/features/mcp/prompts.ts`](src/features/mcp/prompts.ts) | Named prompt templates for clients |
| [`src/features/mcp/actions.ts`](src/features/mcp/actions.ts) | Server actions for Admin UI |
| [`src/features/mcp/components/mcp-admin-panel.tsx`](src/features/mcp/components/mcp-admin-panel.tsx) | Admin → MCP UI |
| [`src/app/(admin)/admin/mcp/page.tsx`](src/app/(admin)/admin/mcp/page.tsx) | Admin page |
| [`scripts/mcp/workpilot-mcp.ts`](scripts/mcp/workpilot-mcp.ts) | Optional local stdio bridge |
| Prisma `McpToken` model | Persistence |

---

## 4. Token-based auth (how it works)

### 4.1 Creating a token (Admin UI)

1. Login as company admin / HR.
2. Open **Admin → MCP**.
3. Enter a name (e.g. `Claude desktop – ops`).
4. Select **scopes** (or use the recommended default pack).
5. Optional: expiry date.
6. Click **Create**.
7. Copy the raw token **immediately** (`wpmcp_…`). It is **not** stored in plain text again.

### 4.2 What is stored in the database

`McpToken` row:

| Field | Meaning |
|-------|---------|
| `companyId` | Tenant boundary |
| `userId` | Admin who created / owns the token |
| `name` | Human label |
| `tokenPrefix` | First chars for UI (`wpmcp_ab12…`) |
| `tokenHash` | `sha256(rawToken)` — used for lookup |
| `scopes` | JSON string array of scope ids |
| `expiresAt` | Optional expiry |
| `revokedAt` | Soft revoke |
| `lastUsedAt` | Updated on successful auth |

Generation (simplified):

```text
raw      = "wpmcp_" + randomBytes(24).base64url
hash     = sha256(raw)
prefix   = raw.slice(0, 12)
→ insert McpToken { tokenHash: hash, tokenPrefix: prefix, scopes, companyId, userId }
→ return raw to admin once
```

### 4.3 Authenticating a request

Every MCP call must send:

```http
Authorization: Bearer wpmcp_xxxxxxxxxxxxxxxx
```

Server (`authenticateMcpBearer`):

1. Require `Bearer ` prefix.
2. Require token starts with `wpmcp_` and length ≥ 20.
3. Hash the raw token → lookup `mcp_tokens.tokenHash`.
4. Reject if missing / revoked / expired.
5. Reject if owner user inactive or not admin.
6. Reject if `user.companyId !== token.companyId` (tenant mismatch).
7. Normalize scopes → build `McpActor`:

```ts
{
  tokenId, companyId, userId, role, scopes, name
}
```

8. Touch `lastUsedAt` (fire-and-forget).

**There is no separate MCP password.** Auth = valid Bearer token only.

### 4.4 Revoking

Admin → MCP → **Revoke**. Sets `revokedAt`. Subsequent calls return `401 Unauthorized`.

---

## 5. Scopes (permission model)

Scopes are **MCP-layer permissions**, independent of UI nav. A tool declares required scopes; `callMcpTool` refuses if missing.

Groups in [`scopes.ts`](src/features/mcp/scopes.ts):

| Group | Examples |
|-------|----------|
| Daily ops | `ops:digest`, `employees:read`, `attendance:read/write`, `approvals:*` |
| People | `documents:read`, `letters:read/write`, `employees:lifecycle` |
| Payroll | `payroll:read/write`, `reports:read` |
| Workspace | `tasks:*`, `projects:*`, `projects:secrets` |
| Company | `company:read/write`, `audit:read`, `notifications:*` |

**Default “safe” pack** (`MCP_DEFAULT_SCOPE_IDS`): mostly read + digest — good for Claude morning briefs without write or payroll generate.

Sensitive scopes (`sensitive: true`) — grant carefully:

- `employees:write`
- `attendance:write`
- `payroll:read` / `payroll:write`
- `letters:write`
- `projects:secrets` / `projects:credentials_write`
- `notifications:write`

---

## 6. Protocol: how `/api/mcp` speaks MCP

### 6.1 JSON-RPC (preferred — Claude / mcp-remote)

`POST /api/mcp` with body like:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": { "protocolVersion": "2025-03-26" }
}
```

Supported methods:

| Method | Purpose |
|--------|---------|
| `initialize` | Handshake + server info + session header |
| `ping` | Health |
| `tools/list` | Tools allowed for this token’s scopes |
| `tools/call` | Run a tool with `name` + `arguments` |
| `prompts/list` | Named prompts |
| `prompts/get` | Expand a prompt template |
| `resources/list` | Resource catalog |
| `resources/read` | Read JSON resource by URI |
| Notifications | `notifications/initialized` → HTTP 202 |

Protocol versions advertised: `2025-06-18`, `2025-03-26`, `2024-11-05`.

### 6.2 Legacy REST (scripts / smoke tests)

```json
{ "name": "get_ops_digest", "arguments": {} }
```

Response: `{ "ok": true, "result": … }`.

### 6.3 Convenience GET

```http
GET /api/mcp
Authorization: Bearer wpmcp_...
```

Returns token name, scopes, and tool list (for curl debugging).

### 6.4 Example curl

```bash
# List tools
curl -s -H "Authorization: Bearer wpmcp_YOUR_TOKEN" \
  http://localhost:3000/api/mcp | jq .

# Call a tool (JSON-RPC)
curl -s -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer wpmcp_YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":1,
    "method":"tools/call",
    "params":{ "name":"get_ops_digest", "arguments":{} }
  }'
```

---

## 7. Connect clients (token based)

### Important: Claude Code ≠ Claude Desktop

| Product | What `claude mcp add` does | Where config lives |
|---------|----------------------------|--------------------|
| **Claude Code** (terminal CLI) | Registers MCP for the CLI | `C:\Users\Neel\.claude.json` (or project scope) |
| **Claude Desktop** (Windows app) | **Does nothing** — Desktop ignores that command | `%APPDATA%\Claude\claude_desktop_config.json` |

So: terminal shows **Connected** for Claude Code, but the Desktop app will still show **no MCP** until you edit Desktop’s own config (section 7.2).

---

### 7.1 Claude Code one-liner (HTTP transport — recommended)

After you create a token in **Admin → MCP**, replace `wpmcp_YOUR_TOKEN` and run:

```bash
claude mcp add --transport http workpilot http://localhost:3000/api/mcp --header "Authorization: Bearer wpmcp_YOUR_TOKEN"
```

For a deployed app, use your public URL instead of localhost:

```bash
claude mcp add --transport http workpilot https://YOUR_APP_URL/api/mcp --header "Authorization: Bearer wpmcp_YOUR_TOKEN"
```

#### What each part means

| Piece | Meaning |
|-------|---------|
| `claude mcp add` | Claude Code CLI: register a new MCP server for this machine/project |
| `--transport http` | Talk to WorkPilot over **HTTP** (no local `npx mcp-remote` process) |
| `workpilot` | Local name of the server inside Claude Code (you choose it) |
| `http://localhost:3000/api/mcp` | WorkPilot MCP endpoint (must be running / reachable) |
| `--header "Authorization: Bearer …"` | Every MCP request sends this header — our token auth |

#### How this works (step by step)

```text
You (terminal)
    │  claude mcp add --transport http …
    ▼
Claude Code saves MCP config
    (name=workpilot, url=/api/mcp, Authorization header)
    │
    ▼
You open Claude Code chat / agent
    │
    ▼
Claude Code → HTTP POST http://localhost:3000/api/mcp
    Headers: Authorization: Bearer wpmcp_…
    Body:    JSON-RPC  { "method": "initialize" | "tools/list" | "tools/call", … }
    │
    ▼
WorkPilot authenticateMcpBearer(header)
    → McpActor { companyId, scopes, userId }
    │
    ▼
tools/list  → only tools allowed by token scopes
tools/call  → e.g. get_ops_digest, list_pending_approvals
    │
    ▼
Result JSON returned to Claude → Claude answers in chat
```

Important details:

1. **No separate MCP password** — only the `Bearer wpmcp_…` token.
2. **`--transport http`** means Claude Code is an MCP **client** over Streamable HTTP; WorkPilot is the **server** at `/api/mcp`.
3. Dev server must be up (`npm run dev`) when using `localhost`.
4. Token scopes control which tools Claude can see/call.
5. One company per token (the admin who created it).

#### Useful Claude Code commands

```bash
# See connected MCP servers
claude mcp list

# Remove WorkPilot (then re-add with a new token if needed)
claude mcp remove workpilot --scope local

# Alternate: add via JSON (same as Admin → MCP “Claude Code JSON”)
claude mcp add-json workpilot '{"type":"http","url":"http://localhost:3000/api/mcp","headers":{"Authorization":"Bearer wpmcp_YOUR_TOKEN"}}'
```

After adding, in Claude Code try:

> Use WorkPilot MCP: run get_token_context then get_ops_digest.

---

### 7.2 Claude Desktop (Windows app) — separate from CLI

JSON you opened under preferences (`coworkUserFilesPath`, `epitaxyPrefs`, …) is **not** the MCP config. Desktop MCP lives here:

```text
C:\Users\Neel\AppData\Roaming\Claude\claude_desktop_config.json
```

Or in the app: **Claude Desktop → Settings → Developer → Edit Config**.

#### Steps

1. Install [Node.js LTS](https://nodejs.org) (Desktop uses `npx mcp-remote`).
2. Keep WorkPilot running (`npm run dev` → `http://localhost:3000`).
3. Open `claude_desktop_config.json` (create the file if missing).
4. Paste **this** shape (replace token; do not use the preferences JSON):

```json
{
  "mcpServers": {
    "workpilot": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "http://localhost:3000/api/mcp",
        "--header",
        "Authorization:${AUTH_HEADER}"
      ],
      "env": {
        "AUTH_HEADER": "Bearer wpmcp_YOUR_TOKEN"
      }
    }
  }
}
```

5. Save the file.
6. **Fully quit** Claude Desktop (system tray → Exit), then reopen.
7. New chat → look for MCP / tools (hammer icon) → `workpilot` tools.

Optional: copy the same block from **Admin → MCP → Claude Desktop config** (token auto-filled after create).

How Desktop differs from Claude Code:

| | Claude Code | Claude Desktop |
|--|-------------|----------------|
| Command | `claude mcp add --transport http …` | Edit `claude_desktop_config.json` |
| Transport | Native HTTP MCP | Local `npx mcp-remote` → HTTP |
| Config file | `.claude.json` | `claude_desktop_config.json` |

Admin UI builds a ready JSON config for Desktop / Cursor (same `mcp-remote` pattern).

```json
{
  "mcpServers": {
    "workpilot": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://YOUR_APP_URL/api/mcp",
        "--header",
        "Authorization:${AUTH_HEADER}"
      ],
      "env": {
        "AUTH_HEADER": "Bearer wpmcp_YOUR_TOKEN"
      }
    }
  }
}
```

How this differs from Claude Code HTTP:

| | Claude Code `--transport http` | Desktop / Cursor + `mcp-remote` |
|--|--------------------------------|----------------------------------|
| Transport | Client talks **HTTP directly** to `/api/mcp` | Local process (`npx mcp-remote`) bridges stdio ↔ HTTP |
| Setup | One CLI command | Paste JSON into Desktop config |
| Same auth | Bearer `wpmcp_…` | Bearer `wpmcp_…` |
| Same server | WorkPilot `/api/mcp` | WorkPilot `/api/mcp` |

Steps (Cursor / paste-into-Desktop summary):

1. Create token in **Admin → MCP**.
2. Copy Claude Desktop config from the panel.
3. Paste into `claude_desktop_config.json` (or Cursor MCP config).
4. Set URL to deployed host or `http://localhost:3000`.
5. Fully restart the app → ask: “Run WorkPilot ops digest.”

Optional local stdio bridge (instead of `mcp-remote`):

```bash
WORKPILOT_URL=http://localhost:3000 \
WORKPILOT_MCP_TOKEN=wpmcp_... \
npx tsx scripts/mcp/workpilot-mcp.ts
```

**Security:** If you pasted a real `wpmcp_…` token in chat or a screenshot, **revoke it** in Admin → MCP and create a new one before saving Desktop config.

## 8. How a tool call runs (end-to-end)

```text
1. Client → POST /api/mcp  { method: "tools/call", params: { name, arguments } }
2. authenticateMcpBearer → McpActor { companyId, scopes, userId, … }
3. Find tool definition by name (tools.ts + tools-extended.ts)
4. Check scopes with hasScope(actor.scopes, tool.scopes)
5. Validate arguments with Zod inputSchema
6. Execute handler → usually existing services (employee, leave, payroll…)
   - Handlers pass actor.companyId so all Prisma queries stay tenant-scoped
7. Sanitize result (strip passwords / binary)
8. Return MCP tool result { content: [{ type: "text", text: JSON }], structuredContent? }
```

Activity log examples: `mcp.token_created`, `mcp.create_employee`, `mcp.adjust_attendance`.

---

## 9. Current tools inventory (high level)

### Core (`tools.ts`)

- Ops: `get_ops_digest`, `get_company_info`, `get_token_context` (extended)
- People: `list_employees`, `get_employee_detail`, `list_lifecycle_status`
- Attendance: `list_today_attendance`, `list_recent_attendance`, `get_employee_timesheet`, `adjust_attendance`
- Leave / approvals: `list_leave_*`, `list_pending_approvals`, `decide_leave`, `decide_exception`
- Holidays / announcements / documents
- Tasks & projects (incl. credentials with scope)
- Payroll: `list_payslips`, `generate_payroll`, `publish_payslip`
- Reports, offer letters

### Extended (`tools-extended.ts`)

- `search_employees`, `create_employee`, `update_employee`, `offboard_employee`, `reactivate_employee`
- `import_employees_csv`, departments / leave types write
- Payslip detail / update / salary adjust
- Project create / share / credentials write
- `update_work_policy`, `list_audit_log`, notifications

### Prompts

- `daily_ops_brief`
- `pending_approvals_review`
- `payroll_month_check`

### Resources

- Employee roster URI
- Holiday calendar URI  
  (see `MCP_RESOURCE_CATALOG` in tools-extended)

---

## 10. How to create / extend MCP (developers)

### Add a new scope

1. Add entry to `MCP_SCOPES` in [`scopes.ts`](src/features/mcp/scopes.ts).
2. Rebuild types flow automatically from `as const`.
3. Grant it from Admin → MCP when creating tokens.

### Add a new tool

1. Prefer reusing an existing service under `src/services/`.
2. Append a tool object to `MCP_TOOLS` or `MCP_TOOLS_EXTENDED`:

```ts
{
  name: "list_bank_csv_ready",
  description: "…",
  scopes: ["payroll:read"] as const,
  inputSchema: z.object({ year: mcpInt, month: mcpInt.min(1).max(12) }),
  async handler(actor, args) {
    // use actor.companyId everywhere
    return { ... };
  },
}
```

3. Ensure Zod args + scope checks.
4. Never return secrets unless a dedicated sensitive scope is required.
5. Smoke: `GET /api/mcp` with token that includes the new scope.

### Add a prompt

Edit [`prompts.ts`](src/features/mcp/prompts.ts) — name, required scopes, template text instructing which tools to call.

### Security checklist for new tools

- [ ] Always filter by `actor.companyId`
- [ ] Correct scopes (read vs write)
- [ ] Mark write / PII / money as `sensitive: true` in scopes catalog
- [ ] Sanitize output
- [ ] Log important writes via `activityRepo`

---

## 11. What more can we add / expand (useful MCP features)

Prioritized for WorkPilot’s HR + white-label job:

### A. Payroll & finance (high leverage)

| Idea | Why | Status |
|------|-----|--------|
| `export_bank_salary_csv` | AI: “prepare NEFT file for March” | **Shipped** |
| `payroll_close_status` | Exceptions count + draft/publish summary | **Shipped** |
| `list_missing_bank_details` | Warn before CSV fail | **Shipped** |
| Confirm-gated `decide_leave` / `generate_payroll` | Chat “confirm” then `confirm: true` | **Shipped** |
| `list_salary_revisions` | Audit raises via chat | Planned |
| `update_employee_bank` | Scoped write for bank fields | Planned |

### B. Manager / approvals

| Idea | Why | Status |
|------|-----|--------|
| Manager / HR / Finance scope packs in Admin → MCP | Role presets (no Select-all only) | **Shipped** |
| `list_team_pending_for_manager` | Token scoped to manager email later | Planned |
| `bulk_decide_leaves` | Approve all short CL with comment | Planned |
| Prompt: `week_close_checklist` | Exceptions → LOP → publish | Planned |

### C. Compliance & documents

| Idea | Why |
|------|-----|
| `list_missing_kyc` | Employees without PAN/bank |
| `list_expiring_documents` (already) + `notify_document_owners` | Close the loop |
| Industry template apply tool | Onboarding via MCP |

### D. Platform ops (careful)

| Idea | Why |
|------|-----|
| Separate **platform** MCP with `PLATFORM_ADMIN_EMAILS` token | Tenant suspend / seat stats |
| Never mix platform + tenant tools on same token | Isolation |

### E. DX / reliability

| Idea | Why | Status |
|------|-----|--------|
| Tool usage dashboard on Admin → MCP | lastUsed + tool/prompt counts | **Shipped** |
| Rate limits per token | Abuse protection | Planned |
| Webhook / SSE `listChanged` | Live tool updates | Planned |
| Per-token IP allowlist | Enterprise | Planned |
| Read-only “demo” token preset | Sales demos | Planned |

### F. Skip for now

- OpenAI proposal generators inside MCP  
- Full ATS / recruiting automation  
- Biometric device drivers via MCP  

---

## 12. Ops tips & troubleshooting

| Symptom | Check |
|---------|--------|
| `401 Missing Bearer token` | Header `Authorization: Bearer wpmcp_…` |
| `401 Invalid / revoked / expired` | Recreate token; confirm not revoked |
| `403 MCP is admin-only` | Token owner role must be admin/HR |
| Tool missing from `tools/list` | Token scopes don’t include tool’s scopes |
| Wrong company data | Token is bound to creating admin’s company — create per tenant |
| Claude can’t connect to localhost | Use deployed URL or tunnel; or local stdio bridge |
| Env / URL | `NEXT_PUBLIC_APP_URL` must match what clients call |

---

## 13. Mental model (one paragraph)

WorkPilot MCP is a **scoped, token-authenticated, company-isolated JSON-RPC API** that wraps the same services as the admin portal. Admins mint a `wpmcp_` secret once; AI clients attach it as Bearer auth; every tool runs as that admin’s company with only the scopes granted. That is how white-label SaaS stays safe while giving Claude/Cursor real HRMS powers.

---

## Logos / icons in Claude connectors

WorkPilot advertises `serverInfo.icons` (PNG data URI + `/icons/mcp-icon.png` + SVG) on `initialize` per MCP SEP-973.

**Claude Desktop / Claude.ai often still show a letter monogram** (e.g. “w” for workpilot) for custom MCP connectors — they ignore third-party icons today. Spec-compliant clients (MCP Inspector, etc.) will show the logo.

To pick up new prompts/icons after a server change: restart `npm run dev`, then fully restart Claude Desktop (or toggle the workpilot connector off/on).

---

## Related UI

- **Admin → MCP** — create tokens, copy Claude config, revoke  
- Endpoint — `{APP_URL}/api/mcp`
