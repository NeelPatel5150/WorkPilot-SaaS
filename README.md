# WorkPilot

**White-label multi-tenant HRMS** — one codebase, many companies, each with its own brand, admin portal, and employee portal.

Companies register → walk through a short **onboarding wizard** (brand → work timing → first employee) → run attendance, leave, payroll, and more under their own colors and logo.

| Doc | Purpose |
|---|---|
| **[HOW_TO_USE.md](./HOW_TO_USE.md)** | Local run + day-to-day usage |
| **[DEPLOY.md](./DEPLOY.md)** | Production deploy checklist |
| **[cookbook.md](./cookbook.md)** | Architecture & product rules for builders |

---

## What is this product?

WorkPilot is a SaaS HR platform for SMEs that want a branded HRMS without buying or hosting a separate app per company.

**Two portals, one product**

| Portal | Who | What they do |
|---|---|---|
| **Admin** | Company Admin, HR, Manager | Employees, departments, attendance, leave approvals, payroll, holidays, announcements, documents, branding, work policy, audit |
| **Employee** | Staff | Punch in/out, leave, payslips, announcements, profile, mobile-friendly dock + PWA |

**White-label**

Each tenant (company) owns:

- Display name, logo, favicon  
- Primary / secondary colors (CSS variables — no FOUC)  
- Work start time, grace minutes, weekly offs, optional geofence / IP allowlist  
- Optional custom domain / subdomain  

Isolation is row-level: every business row is scoped by `companyId`.

---

## Who it’s for

- Agencies / founders selling HRMS to multiple clients from one deploy  
- SMEs that need attendance + leave + basic Indian-style payroll without a heavy enterprise suite  
- Teams that want installable mobile UX (PWA) without a native app store release  

---

## Core features

### Onboarding (after register)

1. **Brand** — name, colors, logo, favicon  
2. **Timing** — office start, grace, standard hours, weekly offs  
3. **Team** — invite first employee (skippable)  

Admins with `setupComplete: false` are redirected to `/onboarding` until they finish or skip.

### People & org

- Multi-role: `SUPER_ADMIN`, `COMPANY_ADMIN`, `HR`, `MANAGER`, `EMPLOYEE`  
- Departments, designations, employee codes  
- Invite flow + must-change-password accept page  
- Offboarding: resign / terminate / notice kills login; admins can **Activate** again  

### Attendance

- Check-in / check-out with late detection from company work policy  
- Weekly offs & holidays awareness  
- Optional geofence / office IP allowlist  
- Attendance exceptions queue + employee requests  

### Leave

- Configurable leave types (e.g. Casual / Sick / EL-style) with balances  
- Apply, cover person, sandwich rules where configured  
- Manager team-scoped approvals; admin/HR broader scope  

### Payroll

- Monthly slips with LOP, PF / ESI / TDS-style statutory lines  
- Draft → edit → publish → lock month  
- Print / PDF via `/api/payslips/[id]/print`  

### Comms & content

- In-app notifications (+ optional email / WhatsApp / push)  
- Announcements, holidays, document uploads & expiry digests (worker)  
- Activity / audit views for admins  

### Reports & ops

- CSV / Excel exports where wired  
- BullMQ worker for digests and background notification jobs  
- PWA: installable shell, service worker, dynamic web manifest  

---

## Tech stack

| Layer | Choice |
|---|---|
| App | Next.js 16 (App Router), React 19, TypeScript |
| UI | Tailwind CSS 4, neo-brutalist brand tokens, Framer Motion |
| Auth | Better Auth (email/password sessions) |
| Data | PostgreSQL + Prisma 7 |
| Jobs | Redis + BullMQ (`npm run worker`) |
| Email | Resend (optional locally) |
| WhatsApp | Twilio (optional) |
| Push | Firebase Cloud Messaging (optional) |
| Storage | Local `UPLOAD_DIR` or S3-compatible (R2) |

Product conventions live in [cookbook.md](./cookbook.md). This Next.js version may differ from older Next docs — check `node_modules/next/dist/docs/` when unsure.

---

## Quick start (local)

**Prerequisites:** Node.js 20+, Docker Desktop (Postgres + Redis).

```bash
npm run docker:up
npm install
npm run db:setup
npm run dev
```

Optional background jobs:

```bash
npm run worker
```

Open **http://localhost:3000**

| | |
|---|---|
| Demo admin | `admin@demo.local` |
| Demo password | `password123` |
| Postgres (Docker) | user / pass / db = `workpilot` |

### Register a new company

1. Open **Register** on the marketing/login flow  
2. Create company + admin account  
3. You land on **`/onboarding`** — brand → timing → invite first employee  
4. Finish → **Admin dashboard**

In-app guides (branded):

- Admin → **How to use** → `/admin/how-to-use`  
- Employee → **How to use** → `/employee/how-to-use`  

---

## Project layout (high level)

```
src/app/                 # Next.js routes (admin, employee, onboarding, API)
src/features/            # UI feature modules (forms, wizards, tables)
src/services/            # Business logic
src/repositories/        # Prisma data access
src/jobs/                # BullMQ worker
src/lib/                 # auth, session, prisma, theme
prisma/schema.prisma     # Data model
public/sw.js             # PWA service worker
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
```

See [DEPLOY.md](./DEPLOY.md) for production secrets, Resend, S3, and worker setup.

---

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` / `npm start` | Production web process |
| `npm run worker` | BullMQ background worker |
| `npm run docker:up` | Start Postgres + Redis |
| `npm run db:setup` | Generate client, push schema, seed demo |
| `npm run db:studio` | Prisma Studio |
| `npx tsx scripts/mark-setup-complete.ts` | Mark all companies as past onboarding (ops helper) |

---

## Multi-tenant model

- Shared database, shared schema  
- Every business table includes `companyId`  
- Services always scope queries to the signed-in user’s company  
- Branding injected as CSS variables before paint  

Do not invent a second “theme fork” per client — configure the company row instead.

---

## Production

Full guide: **[DEPLOY.md](./DEPLOY.md)**

Short version:

1. Managed Postgres + Redis  
2. Set production env (`BETTER_AUTH_URL` = public HTTPS URL)  
3. `prisma generate` + `db push` (or migrations)  
4. `npm run build` && `npm start`  
5. Run **`npm run worker`** as a second process  
6. Configure Resend (and optionally R2/S3)  
7. Smoke-test register → onboarding → invite → punch → leave  

---

## Security notes

- Never commit `.env` or live API keys  
- Change or remove the demo admin before public launch  
- Offboarded employees lose login until reactivated  
- Uploads should use private object storage in production when possible  

---

## Status

WorkPilot includes Phase 1–2 HR foundations plus payroll, exceptions, digests, PWA, and post-register onboarding. Treat [cookbook.md](./cookbook.md) as the source of truth when extending the product.
