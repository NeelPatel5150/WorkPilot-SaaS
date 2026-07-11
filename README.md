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
  <img alt="PWA" src="https://img.shields.io/badge/PWA-Installable-5A0FC8?style=flat-square&logo=pwa&logoColor=white" />
  <img alt="License" src="https://img.shields.io/badge/License-Private-lightgrey?style=flat-square" />
</p>

<p align="center">
  <a href="#quick-start">Quick start</a> ·
  <a href="#features">Features</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="./HOW_TO_USE.md">How to use</a> ·
  <a href="./DEPLOY.md">Deploy</a> ·
  <a href="./cookbook.md">Cookbook</a>
</p>

---

## Why WorkPilot?

Sell or run a **branded HRMS for every client** from a single deploy. Companies register, complete a short onboarding wizard, and get their own colors, logo, admin portal, and employee app — without a separate codebase per tenant.

| | |
|---|---|
| **For agencies & founders** | One product, many white-label clients |
| **For SMEs** | Attendance, leave, payroll, announcements — without enterprise bloat |
| **For staff** | Mobile-friendly employee portal + installable PWA |

---

## Product at a glance

```text
  Register company  →  Onboarding wizard  →  Admin portal
       │                    │                      │
       │              Brand · Timing · Team        ├── Employees & departments
       │                                           ├── Attendance & exceptions
       │                                           ├── Leave & approvals
       │                                           ├── Payroll & payslips
       └───────────────────────────────────────────┴── Holidays · Docs · Reports
                                                       │
                                                       ▼
                                               Employee portal + PWA
                                               Punch · Leave · Payslips
```

**Two portals, one product**

| Portal | Who | What they do |
|:---|:---|:---|
| **Admin** | Company Admin, HR, Manager | People, attendance, leave approvals, payroll, branding, work policy, audit |
| **Employee** | Staff | Check-in/out, leave, payslips, announcements, profile — dock + PWA |

**True white-label per tenant**

- Company name, logo, favicon  
- Primary / secondary colors (CSS variables, no FOUC)  
- Work start, grace minutes, weekly offs, optional geofence / IP allowlist  
- Optional custom domain / subdomain  

Data isolation is **row-level**: every business row is scoped by `companyId`.

---

## Features

### Onboarding
1. **Brand** — name, colors, logo, favicon  
2. **Timing** — office start, grace, standard hours, weekly offs  
3. **Team** — invite first employee (skippable)  

Incomplete setup redirects admins to `/onboarding` until they finish or skip.

### People & org
- Roles: `SUPER_ADMIN` · `COMPANY_ADMIN` · `HR` · `MANAGER` · `EMPLOYEE`  
- Departments, designations, employee codes  
- Invite + must-change-password accept flow  
- Offboard (resign / terminate / notice) revokes login; **Activate** restores it  
- Company admins cannot be offboarded  

### Attendance
- Check-in / check-out with late detection from company policy  
- Weekly offs & holidays awareness  
- Optional geofence / office IP allowlist  
- Exceptions queue + employee requests  

### Leave
- Configurable leave types & balances  
- Apply, cover person, sandwich rules where configured  
- Manager team-scoped approvals; admin/HR broader scope  

### Payroll
- Monthly slips with LOP and PF / ESI / TDS-style lines  
- Draft → edit → publish → lock month  
- Print / PDF via `/api/payslips/[id]/print`  

### Comms & content
- In-app notifications (+ optional email / WhatsApp / push)  
- Announcements, holidays, documents & expiry digests  
- Activity / audit for admins  

### Reports & ops
- CSV / Excel exports where wired  
- BullMQ worker for digests & notification jobs  
- Installable PWA (service worker + dynamic web manifest)  

---

## Tech stack

| Layer | Choice |
|:---|:---|
| App | **Next.js 16** (App Router), **React 19**, TypeScript |
| UI | Tailwind CSS 4, neo-brutalist tokens, Framer Motion |
| Auth | Better Auth (email / password sessions) |
| Data | PostgreSQL + **Prisma 7** |
| Jobs | Redis + BullMQ (`npm run worker`) |
| Email | Resend *(optional locally)* |
| WhatsApp | Twilio *(optional)* |
| Push | Firebase Cloud Messaging *(optional)* |
| Storage | Local `UPLOAD_DIR` or S3-compatible (R2) |

> This Next.js version may differ from older docs — check `node_modules/next/dist/docs/` when unsure. Product rules: **[cookbook.md](./cookbook.md)**.

---

## Quick start

**Prerequisites:** Node.js **20+**, Docker Desktop (Postgres + Redis).

```bash
npm run docker:up
npm install
npm run db:setup
npm run dev
```

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
2. Complete **`/onboarding`** — Brand → Timing → Invite  
3. Land on the **Admin** dashboard  

In-app guides (branded per company):

- Admin → **How to use** → `/admin/how-to-use`  
- Employee → **How to use** → `/employee/how-to-use`  

### Install as PWA

- **Chrome / Edge (Android):** menu → Install app / Add to Home screen  
- **Safari (iOS):** Share → Add to Home Screen  

---

## Documentation

| Doc | Purpose |
|:---|:---|
| **[HOW_TO_USE.md](./HOW_TO_USE.md)** | Local run & day-to-day usage |
| **[DEPLOY.md](./DEPLOY.md)** | Production deploy checklist |
| **[cookbook.md](./cookbook.md)** | Architecture & product rules for builders |

---

## Project layout

```text
src/app/                 # Routes — admin, employee, onboarding, API
src/features/            # UI feature modules (forms, wizards, tables)
src/services/            # Business logic
src/repositories/        # Prisma data access
src/jobs/                # BullMQ worker
src/lib/                 # Auth, session, prisma, theme, tenant
src/components/          # Shared UI + layout (header, PWA, notifications)
prisma/schema.prisma     # Data model
public/icons/icon.svg    # Product logo / default PWA icon
public/sw.js             # Service worker
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

Production secrets, Resend, S3/R2, and worker setup → **[DEPLOY.md](./DEPLOY.md)**.

---

## Scripts

| Script | What it does |
|:---|:---|
| `npm run dev` | Next.js dev server |
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
- Branding injected as CSS variables **before paint**  

Do **not** invent a second theme fork per client — configure the company row instead.

---

## Production

Full guide: **[DEPLOY.md](./DEPLOY.md)**

1. Managed Postgres + Redis  
2. Set production env (`BETTER_AUTH_URL` = public HTTPS URL)  
3. `prisma generate` + `db push` (or migrations)  
4. `npm run build` && `npm start`  
5. Run **`npm run worker`** as a second process  
6. Configure Resend (and optionally R2/S3)  
7. Smoke-test: register → onboarding → invite → punch → leave  

---

## Security

- Never commit `.env` or live API keys  
- Change or remove the demo admin before public launch  
- Offboarded employees lose login until reactivated  
- Company admins cannot be offboarded from the UI or API  
- Prefer private object storage for uploads in production  

---

## Roadmap status

WorkPilot ships **Phase 1–2 HR foundations** plus payroll, exceptions, digests, PWA, and post-register onboarding.

Treat **[cookbook.md](./cookbook.md)** as the source of truth when extending the product.

---

<p align="center">
  <img src="./public/icons/icon.svg" alt="WorkPilot" width="48" height="48" />
  <br />
  <sub><strong>WorkPilot</strong> — white-label HRMS that feels like each company’s own product.</sub>
</p>
