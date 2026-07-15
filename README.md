<p align="center">
  <img src="./public/icons/icon.svg" alt="WorkPilot" width="112" height="112" />
</p>

<h1 align="center">WorkPilot</h1>

<p align="center">
  <strong>White-label multi-tenant HRMS</strong><br />
  One codebase · Many companies · Each with its own brand, admin portal &amp; employee PWA
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=nextdotjs" />
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-7-2D3748?style=flat-square&logo=prisma&logoColor=white" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-15+-4169E1?style=flat-square&logo=postgresql&logoColor=white" />
  <img alt="MCP" src="https://img.shields.io/badge/MCP-Claude%20ready-D97706?style=flat-square" />
  <img alt="PWA" src="https://img.shields.io/badge/PWA-Installable-5A0FC8?style=flat-square&logo=pwa&logoColor=white" />
  <img alt="License" src="https://img.shields.io/badge/License-Private-lightgrey?style=flat-square" />
</p>

<p align="center">
  <a href="#why-workpilot">Why WorkPilot</a> ·
  <a href="#problems-workpilot-solves">Problems solved</a> ·
  <a href="#features">Features</a> ·
  <a href="#mcp-ai-ops">MCP / AI ops</a> ·
  <a href="#quick-start">Quick start</a> ·
  <a href="./MCP.md">MCP guide</a> ·
  <a href="./DEPLOY.md">Deploy</a>
</p>

---

## Why WorkPilot?

Most HR tools are either **one generic SaaS for everyone** (your brand disappears) or a **custom build per client** (cost and maintenance explode).

WorkPilot is built for the gap in between:

| Who | What they get |
|:---|:---|
| **Agencies & founders** | One deploy, many white-label companies. Sell the HRMS; each client feels it is *their* product. |
| **SME HR / Finance** | Attendance → leave → payroll → bank NEFT CSV in one place. No Excel maze at month end. |
| **Managers** | Team approvals without payroll secrets or vault access. |
| **Employees** | Punch, leave, payslips, documents on a mobile dock + installable PWA. |
| **Operators** | Platform console for seats, trials, and tenant health. |

**One product. Many branded tenants. Real isolation.**

Every company row is scoped by `companyId`. Branding (logo, colors, name) is injected before paint so the portal never flashes a generic default.

---

## Problems WorkPilot solves

### 1. “We need our own branded HRMS, not another Workday clone”

**Gap:** Generic HR software makes every company look the same. Agencies cannot rebrand without forking code.

**WorkPilot:**
- Company name, logo, favicon, primary / secondary colors  
- Work policy (start time, grace, weekly offs, optional geofence / IP)  
- Short onboarding: Brand → Timing → Invite team  

**Benefit:** Clients land in a portal that feels like *their* product from day one.

---

### 2. “Month-end payroll is Excel + panic”

**Gap:** Drafts, LOP, exceptions, and bank uploads live in different sheets. Mistakes ship to NEFT.

**WorkPilot:**
- Monthly salary slips with LOP and PF / ESI style lines  
- Payroll close checklist (pending exceptions, draft vs published counts)  
- Bank / IFSC / account on employee profiles  
- NEFT-style **bank salary CSV** for published months  
- Warn on **missing bank details** before export fails at the bank  

**Benefit:** Close the month inside the product. Chat or UI can ask “are we ready to pay?” and get a clear answer.

---

### 3. “Managers need approvals, not salary secrets”

**Gap:** One admin token often exposes payroll amounts and vault credentials to people who only need leave approvals.

**WorkPilot:**
- Role-aware RBAC (admin, HR, manager, employee)  
- Manager team-scoped leave / exception queues  
- **MCP Manager pack**: approvals + digests only (no payroll write, no project secrets)  
- **HR** and **Finance** packs for the right tool surface  

**Benefit:** Give Claude or a manager the smallest safe surface. Fewer accidents, clearer compliance.

---

### 4. “AI should run ops, not invent write mistakes”

**Gap:** Connecting ChatGPT / Claude to HR APIs is powerful and dangerous. Soft refusals or silent overwrites both hurt trust.

**WorkPilot MCP:**
- Admin creates a Bearer token (`wpmcp_…`) with checkbox scopes  
- Connect Claude Desktop / Claude Code / Cursor to `/api/mcp` (no repo clone)  
- Confirm-gated writes: approve leave or generate payroll only after the human says **confirm**, then the tool runs with `confirm: true`  
- Usage dashboard: last used, tool call counts, which prompts fired  

**Benefit:** Ops in chat with a clear human gate. Auditability on who used which tools.

---

### 5. “India-ready HR without enterprise bloat”

**Gap:** Global tools ignore holidays, PF/ESI flags, KYC fields, and bank NEFT formats that Indian SMEs need.

**WorkPilot:**
- India holiday packs and industry templates (IT / Factory / Clinic)  
- Bank, PAN, UAN, PF / ESI eligibility on employee  
- Employee self-edit for bank + KYC upload  
- Payslip YTD and printable payslips  

**Benefit:** Ship what SMEs actually use in India, not a 200-feature TO-DO list.

---

### 6. “SaaS billing and seats without a second app”

**Gap:** White-label SaaS needs seat limits and trials; many HR clones forget commercial controls.

**WorkPilot:**
- Company `plan`, `seatLimit`, `trialEndsAt`, `billingStatus`  
- Seat enforcement when creating employees  
- Trial banner for admins  
- `/platform` console for operators (`PLATFORM_ADMIN_EMAILS`)  

**Benefit:** Run multi-tenant commercially from the same codebase.

---

## Product at a glance

```text
  Register company  →  Onboarding wizard  →  Admin portal
       │                    │                      │
       │              Brand · Timing · Team        ├── People & departments
       │                                           ├── Attendance & exceptions
       │                                           ├── Leave & approvals
       │                                           ├── Payroll · bank CSV · close
       └───────────────────────────────────────────┴── Holidays · Docs · Reports · MCP
                                                       │
                                                       ▼
                                               Employee portal + PWA
                                               Punch · Leave · Payslips · Bank
```

| Portal | Who | What they do |
|:---|:---|:---|
| **Admin** | Company Admin, HR, Manager | People, attendance, approvals, payroll, branding, MCP tokens, audit |
| **Employee** | Staff | Check-in/out, leave, payslips, bank/KYC, announcements, profile |
| **Platform** | Operator emails only | Tenants, seats, trials (operator console) |

---

## Features

### White-label & onboarding

| Feature | Why it exists | Benefit |
|:---|:---|:---|
| Brand wizard | Clients expect *their* logo and colors | Instant “my company” feel |
| Work timing & offs | Late / attendance must match policy | Consistent rules per tenant |
| Invite first team | Empty product dies after signup | Admin starts with real people |
| Custom domain / subdomain ready | Agencies sell branded URLs | Feels independent of WorkPilot |

### People & org

| Feature | Why it exists | Benefit |
|:---|:---|:---|
| Roles (Admin / HR / Manager / Employee) | Wrong access is a compliance risk | Least-privilege by design |
| Departments, codes, designations | Org charts live in HR, not Slack | Clean roster for payroll and reports |
| Invite + must-change password | Shared passwords leak | Safer first login |
| Offboard / reactivate | Exits and returns are normal | Login revoked until restored |
| Bank, PAN, UAN, PF/ESI flags | India payroll needs these fields | Bank CSV and compliance ready |
| Employee bank + KYC self-edit | HR chasing screenshots is slow | Staff update their own details |

### Attendance

| Feature | Why it exists | Benefit |
|:---|:---|:---|
| Check-in / out + late rules | Policy without enforcement is theater | Real late / absent signals |
| Geofence / IP allowlist (optional) | Remote abuse and proxy punches | Tighten when the client needs it |
| Exceptions queue | Life happens (forgot punch, travel) | Managers clear exceptions before payroll |

### Leave

| Feature | Why it exists | Benefit |
|:---|:---|:---|
| Leave types & balances | One “CL” bucket is not enough | Configurable per company |
| Apply + cover person | Work continuity | Approvers see impact |
| Team-scoped manager approvals | Managers should not see whole company | Safer, faster decisions |

### Payroll & finance close

| Feature | Why it exists | Benefit |
|:---|:---|:---|
| Draft → edit → publish slips | Blind “generate everything” is risky | Human review before pay day |
| LOP and statutory-style lines | Indian salary math is not optional | Slip matches reality |
| Salary revisions history | Raises get disputed | Traceable changes |
| `payroll_close_status` | “Are we ready?” lives in chat or UI | Zero-Excel close checklist |
| `list_missing_bank_details` | Blank IFSC ruins NEFT uploads | Fix people before export |
| `export_bank_salary_csv` | Banks want a file, not screenshots | Published-month NEFT CSV |
| Print / PDF payslips | Employees still need paper | One-click print route |

### Comms, holidays, documents

| Feature | Why it exists | Benefit |
|:---|:---|:---|
| Announcements & notifications | Policy updates get lost in WhatsApp | In-app + optional email / push |
| India holiday packs | Calendar defaults matter | Faster year setup |
| Documents + expiry digests | KYC and contracts expire | Fewer missed renewals |
| Audit / activity log | “Who changed what?” | Admin accountability |

### MCP (Claude / AI ops)

| Feature | Why it exists | Benefit |
|:---|:---|:---|
| Token + scopes UI | AI access must be intentional | Admin picks exactly what tools work |
| Manager / HR / Finance packs | One “select all” is unsafe | Role-fit presets in one click |
| Confirm-gated writes | Accidental approve / payroll is costly | Human says “confirm” first |
| Usage dashboard | Silent AI usage is invisible | Last used, tool counts, prompts fired |
| Prompts for Claude connectors | Cold start into real ops | “Add from WorkPilot” playbooks |

Full guide: **[MCP.md](./MCP.md)**

### Platform & commercial

| Feature | Why it exists | Benefit |
|:---|:---|:---|
| Seats + plan + trial | SaaS needs metering | Control growth per tenant |
| `/platform` console | Operators need a home | Suspend / inspect without tenant UI |
| Installable PWA | Field staff are not on desktop | Punch and leave from home screen |

---

## MCP / AI ops

WorkPilot is not “ChatGPT bolted on.” It exposes **your company’s APIs** through the Model Context Protocol.

1. Admin → **MCP** → create token (or pick Manager / HR / Finance pack)  
2. Copy `wpmcp_…` once  
3. Connect Claude Desktop (`mcp-remote`) or Claude Code HTTP transport to `{APP_URL}/api/mcp`  
4. Ask things like:  
   - “Show payroll close status for this month”  
   - “List missing bank details”  
   - “Export bank salary CSV for June after confirm”  
5. Watch **Usage** for last used + which tools and prompts fired  

Sensitive actions such as **approve leave** and **generate payroll** require the human to say **confirm** in chat before the tool executes with `confirm: true`.

---

## Tech stack

| Layer | Choice |
|:---|:---|
| App | **Next.js 16** (App Router), **React 19**, TypeScript |
| UI | Tailwind CSS 4, product tokens, Framer Motion |
| Auth | Better Auth (email / password sessions) |
| Data | PostgreSQL + **Prisma 7** |
| Jobs | Redis + BullMQ (`npm run worker`) |
| Email | Resend *(optional locally)* |
| WhatsApp | Twilio *(optional)* |
| Push | Firebase Cloud Messaging *(optional)* |
| Storage | Local `UPLOAD_DIR` or S3-compatible (R2) |
| AI ops | MCP Streamable HTTP at `/api/mcp` |

> This Next.js line may differ from older training data. Prefer `node_modules/next/dist/docs/` and **[cookbook.md](./cookbook.md)** when extending.

---

## Quick start

**Prerequisites:** Node.js **20+**, Docker Desktop (Postgres + Redis).

**One command (recommended)**

```bash
# macOS / Linux / Git Bash / WSL
chmod +x setup.sh && ./setup.sh
```

```powershell
# Windows PowerShell
.\setup.ps1
```

Then:

```bash
npm run dev
```

**Manual steps** (same thing)

```bash
npm run docker:up
npm install
npm run db:setup
npm run dev
```

Supabase instead of Docker: put URLs in `.env`, then `./setup.sh --skip-docker`

Background jobs (optional for local):

```bash
npm run worker
```

Open **[http://localhost:3000](http://localhost:3000)**

| | |
|:---|:---|
| Demo admin | `admin@demo.local` |
| Demo password | `password123` |
| Postgres (Docker) | user / pass / db = `workpilot` |

### Register a new company

1. Open **Register** and create company + admin  
2. Complete **`/onboarding`** (Brand → Timing → Invite)  
3. Land on the **Admin** dashboard  

In-app guides:

- Admin → **How to use** → `/admin/how-to-use`  
- Employee → **How to use** → `/employee/how-to-use`  

### Install as PWA

- **Chrome / Edge (Android):** menu → Install app / Add to Home screen  
- **Safari (iOS):** Share → Add to Home Screen  

---

## Documentation

| Doc | Purpose |
|:---|:---|
| **[HOW_TO_USE.md](./HOW_TO_USE.md)** | Local run and day-to-day usage |
| **[MCP.md](./MCP.md)** | Tokens, scopes, Claude Desktop / Code, tools & prompts |
| **[DEPLOY.md](./DEPLOY.md)** | Production deploy checklist |
| **[DEPLOY_VERCEL_SUPABASE.md](./DEPLOY_VERCEL_SUPABASE.md)** | Vercel + Supabase go-live |
| **[cookbook.md](./cookbook.md)** | Architecture and product rules for builders |
| **[AGENTS.md](./AGENTS.md)** | Notes for AI coding agents in this repo |

---

## Project layout

```text
src/app/                 # Routes — admin, employee, onboarding, platform, API
src/features/            # UI modules (forms, wizards, MCP admin panel)
src/features/mcp/        # MCP tools, prompts, scopes, usage
src/services/            # Business logic
src/repositories/        # Prisma data access
src/jobs/                # BullMQ worker
src/lib/                 # Auth, session, prisma, theme, tenant
src/components/          # Shared UI + layout (header, PWA, notifications)
prisma/schema.prisma     # Data model (incl. MCP tokens & usage)
public/icons/icon.svg    # Product logo / default PWA icon
public/sw.js             # Service worker
MCP.md                   # MCP connector guide
DEPLOY.md                # Production guide
```

---

## Environment

Copy `.env.example` → `.env`. Minimum for local:

```env
DATABASE_URL=postgresql://workpilot:workpilot@localhost:5432/workpilot?schema=public
DIRECT_URL=postgresql://workpilot:workpilot@localhost:5432/workpilot?schema=public
BETTER_AUTH_SECRET=dev-secret-change-me-to-32-chars-min
BETTER_AUTH_URL=http://localhost:3000
REDIS_URL=redis://localhost:6379
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_ROOT_DOMAIN=localhost:3000
PLATFORM_ADMIN_EMAILS=you@example.com
```

Production secrets, Resend, S3/R2, and worker setup → **[DEPLOY.md](./DEPLOY.md)**.

---

## Scripts

| Script | What it does |
|:---|:---|
| `npm run dev` | Next.js dev server (webpack) |
| `npm run build` / `npm start` | Production web process |
| `npm run worker` | BullMQ background worker |
| `npm run docker:up` / `docker:down` | Start / stop Postgres + Redis |
| `npm run db:setup` | Generate client, push schema, seed demo |
| `npm run db:studio` | Prisma Studio |
| `npm run db:seed` | Re-seed demo data |
| `npm run lint` | ESLint |

---

## Multi-tenant model

- Shared database, shared schema  
- Every business table includes `companyId`  
- Services always scope queries to the signed-in user’s company  
- MCP tokens are bound to the creating admin’s company  
- Branding injected as CSS variables **before paint**  

Do **not** invent a second theme fork per client. Configure the company row instead.

---

## Production

Full guide: **[DEPLOY.md](./DEPLOY.md)**

1. Managed Postgres + Redis  
2. Set production env (`BETTER_AUTH_URL` = public HTTPS URL)  
3. `prisma generate` + `db push` (or migrations)  
4. `npm run build` && `npm start`  
5. Run **`npm run worker`** as a second process  
6. Configure Resend (and optionally R2/S3)  
7. Smoke-test: register → onboarding → invite → punch → leave → payroll → MCP token  

---

## Security

- Never commit `.env` or live API keys (including `wpmcp_` tokens)  
- Change or remove the demo admin before public launch  
- Offboarded employees lose login until reactivated  
- Company admins cannot be offboarded from the UI or API  
- Prefer private object storage for uploads in production  
- MCP: use Manager / Finance packs instead of Select all; revoke tokens when devices are shared  
- Confirm-gated writes exist so chat cannot silently approve leave or generate payroll  

---

## What “done” looks like today

WorkPilot is past “demo HR.” It ships:

- White-label onboarding and dual portals (admin + employee PWA)  
- Attendance, leave, exceptions, payroll close, bank CSV  
- India-oriented KYC / bank / holiday / industry templates  
- MCP for Claude with scoped packs, confirm gates, and a usage dashboard  
- Seats, trials, and a platform operator console  

Treat **[cookbook.md](./cookbook.md)** and **[MCP.md](./MCP.md)** as the source of truth when extending the product.

---

<p align="center">
  <img src="./public/icons/icon.svg" alt="WorkPilot" width="48" height="48" />
</p>

<p align="center">
  <strong>WorkPilot</strong>
</p>

<p align="center">
  <sub>WorkPilot — white-label HRMS that feels like each company’s own product.</sub>
</p>
