# Cookbook — WorkPilot (White-Label HRMS)

> This is the single source of truth for building the product. Anything not
> covered here should follow the patterns established in this doc, not
> improvised ad hoc.

---

## 1. Product Vision

**WorkPilot** is a multi-tenant white-label HRMS that any company (SME) can
launch under its own brand — own name, logo, colors, domain — on a single
shared codebase, instead of forking the product per customer.

Two portals, one app:

- **Admin Portal** — Company Admin / HR / Manager manage employees,
  attendance, leave, reports, branding, settings.
- **Employee Portal** — Employees check in/out, apply leave, view payslips,
  see announcements.

**Core principle:** one codebase, N branded tenants, isolated by `companyId`.

---

## 2. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) | Frontend + backend in one deployable |
| UI | React 19, TypeScript, Tailwind CSS, shadcn/ui | Type safety, fast iteration, accessible primitives |
| Animation | Framer Motion | Micro-interactions for the neo-brutalist UI |
| Forms | React Hook Form + Zod | Type-safe validation shared client/server |
| Tables | TanStack Table | Attendance/employee/report grids |
| Charts | Recharts | Dashboard widgets |
| ORM | Prisma | Type-safe queries, migrations |
| Database | PostgreSQL | Relational data (companies → employees → attendance/leave), ACID, strong joins |
| Cache/Queue | Redis + BullMQ | Reminders, digest emails, scheduled jobs |
| Auth | Better Auth | Session/JWT, RBAC-friendly |
| Email | Resend | Transactional email (leave approved, welcome, etc.) |
| WhatsApp | Twilio WhatsApp API | Leave/attendance alerts |
| Push | Firebase Cloud Messaging | Browser push even when tab closed |
| Storage | AWS S3 / Cloudflare R2 | Documents, logos, salary slips |
| Deployment | Vercel (app) + Neon/Supabase/Railway (Postgres) + Upstash (Redis) | Managed, low-ops |

---

## 3. Why PostgreSQL (not MongoDB)

The domain is inherently relational: Company → Departments → Employees →
Attendance / Leave / Documents, with managers, approvals, and payroll all
depending on foreign keys and joins. MongoDB is better suited to
document-shaped, loosely-relational data (chat, catalogs, logs) — modeling
HRMS relations there means pushing referential integrity into application
code. Supabase is not a separate choice here; it's a managed Postgres, so it
remains compatible with everything below.

---

## 4. Multi-Tenant Strategy

**Shared database, shared schema, row-level isolation.**

- Every business table carries a `companyId` foreign key.
- All Prisma queries **must** scope by `companyId` — never trust a client-supplied
  ID without checking it belongs to the current tenant.
- Tenant is resolved once per request in `middleware.ts`:
  - Subdomain: `{slug}.yourdomain.com` → forwarded as `x-tenant-slug` header.
  - Custom domain: forwarded as `x-tenant-custom-domain` header, resolved to a
    `companyId` via a DB lookup on `companies.customDomain` in the root layout.
- A `getCurrentTenant()` helper (in `lib/tenant.ts`, to be added alongside
  auth wiring) should be the **only** place that reads these headers — every
  service/repository call takes `companyId` as an explicit argument rather
  than re-deriving it, so tenant leakage is easy to audit.

**Rule of thumb:** if a Prisma query touches a business table and doesn't
have `where: { companyId }` (or a relation filter that guarantees it), it's a bug.

---

## 5. White-Label Theming

Everything customer-facing is CSS-variable driven — no per-tenant component forks.

```css
:root {
  --primary: #2563eb;
  --secondary: #eff6ff;
  --background: #f8fafc;
  --card: #ffffff;
  --border: #111827;
}
```

- `lib/theme.ts` → `buildThemeStyle(company)` turns a `Company` row into an
  inline style string, injected on `<html style="...">` in the root layout
  **before first paint** (no flash of default theme).
- Components reference `bg-primary`, `text-primary-foreground`, etc. — never
  hardcoded hex values.
- Company also carries `logoUrl`, `faviconUrl`, `smtpConfig`, `whatsappNumber`
  — all resolved the same way, at the same layout level.

**Design style — Neo Brutalism:**
white cards, thick black borders (2px), offset shadows (6-8px, no blur),
16-20px rounded corners, bold typography, Lucide icons. Utility classes
`.nb-card`, `.nb-button`, `.nb-input` in `globals.css` encode this so new
components stay consistent without repeating the recipe.

---

## 6. Roles & Permissions (RBAC)

```
Super Admin  →  full platform (cross-company, for the SaaS operator)
Company Admin →  full access within their company
HR            →  employees, attendance, leave, departments, payroll (view)
Manager       →  team attendance/leave approval, view reports
Employee      →  own attendance, own leave
```

Default matrix lives in `lib/permissions.ts` as `ROLE_PERMISSIONS`. If a
company needs custom roles beyond the five defaults, store the override in
`roles.permissions` (JSON) and check that first, falling back to the static
matrix. Always check permissions server-side (route handler / server action)
— client-side checks are UX only, never the security boundary.

---

## 7. Folder Structure

```
src/
  app/
    (admin)/       dashboard, employees, attendance, leaves, departments, reports, settings
    (employee)/    dashboard, attendance, leaves, profile
    (auth)/        login, register
    api/           auth, attendance, leaves, notifications, webhooks
  components/
    ui/            shadcn/ui primitives
    shared/        cross-feature components
    layout/        shells, sidebar, header
  features/        one folder per domain (attendance, leaves, employees, departments, payroll, reports, notifications, branding)
  services/        business logic — orchestrates repositories, enforces RBAC + tenant scoping
  repositories/     Prisma queries only, one file per model/domain, always companyId-scoped
  lib/             prisma client, permissions, theme engine, tenant resolution, utils
  hooks/           React hooks
  store/           client state
  types/           shared TS types
  config/          nav items, feature flags
  emails/          React Email templates
  jobs/            BullMQ job definitions
  middleware.ts     tenant resolution
```

**Layering rule:** `app/` calls `services/`, `services/` calls
`repositories/`, `repositories/` calls Prisma. Never let a route handler
import Prisma directly — that's how tenant-scoping bugs sneak in.

---

## 8. Database Schema (Phase 1 core)

Full schema lives in `prisma/schema.prisma`. Summary of core tables:

| Table | Key relations |
|---|---|
| `companies` | root tenant record — branding, domain, SMTP, WhatsApp |
| `users` | login identity, scoped `@@unique([companyId, email])` |
| `roles` | custom permission overrides per company |
| `departments` | belongs to company, has employees |
| `employees` | belongs to company + user + department, self-relation for manager |
| `attendance` | one row per employee per date, `@@unique([employeeId, date])` |
| `leave_types` / `leave_requests` / `leave_balances` | approval workflow, per-employee balances by year |
| `holidays`, `announcements` | company-wide calendar/feed content |
| `notifications` | per-user, channel-tagged (email/whatsapp/push/in_app) |
| `documents` | company or employee-scoped file references (S3/R2 URL) |
| `activity_logs` | audit trail |
| `settings` | key/value JSON per company for anything not worth its own column |

Every table above includes `id`, `companyId`, `createdAt` (`updatedAt` where
rows mutate). This is the pattern for any future table too.

---

## 9. Notification System

Trigger: employee performs an action (e.g. applies leave).

```
Employee applies leave
        ↓
Admin/Manager receives: Email (Resend) + WhatsApp (Twilio) + Browser Push (FCM) + In-app
        ↓
Employee later receives: Leave Approved/Rejected, Attendance Reminder, Birthday, Announcement
```

Implementation pattern:
- A `NotificationService` fans out to each channel — each channel failing
  independently should not block the others (wrap each send in its own
  try/catch, log failures to `activity_logs`).
- Heavy/slow sends (email, WhatsApp) go through **BullMQ** jobs, not inline
  in the request — the leave-application route should enqueue and return
  immediately.
- Every notification also gets an `in_app` row so the notification bell has
  a persistent source of truth even if push/email fail.
- Future channels (Slack, Teams, Telegram, Discord) plug in as additional
  fan-out targets in the same service, not separate code paths.

---

## 10. Modules Checklist

**Admin Portal:** Dashboard, Employee Management, Departments, Attendance,
Leave Management, Holidays, Announcements, Documents, Payroll, Reports,
Notifications, Audit Logs, Settings, Company Branding, Role & Permission
Management.

**Employee Portal:** Dashboard, Check-In/Out, Break Timer, Attendance
History, Apply Leave, Leave Balance, Documents, Announcements, Salary Slips,
Notifications, Support Tickets, Profile, Settings.

**Attendance:** daily check-in/out, break tracking, working hours, overtime,
late/early-exit flags, GPS + office-IP verification, QR attendance, selfie
capture, biometric integration hook, shift management.

**Leave:** casual/sick/medical/WFH/half-day/comp-off/maternity/paternity,
multi-level approval, attachment upload, approval timeline, running balance.

**Reports:** daily/monthly attendance, leave, employee, department, late
arrival, payroll — exportable as CSV/Excel/PDF.

**AI (Phase 4):** attendance insights, leave prediction, productivity
trends, smart search, HR assistant chatbot, auto announcement generator.

---

## 11. Security Checklist

- Better Auth for session/JWT management; never roll custom auth.
- RBAC enforced server-side on every mutating route/action.
- Rate limiting on auth + leave-application endpoints (Redis-backed).
- CSRF protection on state-changing routes.
- Parameterized queries only (Prisma handles this — never raw string SQL).
- Sanitize/escape any user-generated content rendered as HTML (announcements,
  support tickets) to prevent XSS.
- Audit log every sensitive action: role changes, employee deactivation,
  payroll edits, branding changes.
- Signed, expiring URLs for S3/R2 document access — never public buckets for
  salary slips or personal documents.

---

## 12. Roadmap

| Phase | Scope |
|---|---|
| **1** | Auth, Company creation (tenant onboarding), Employee Management, Attendance, Leave |
| **2** | Notifications (email/WhatsApp/push), Reports, Branding UI, Holidays, Documents |
| **3** | Payroll, Performance, Assets, Support Tickets |
| **4** | AI Features, Mobile App, Public APIs, Third-Party Integrations (Slack/Teams) |

Build and ship in this order — don't start Payroll before Attendance/Leave
are solid, since payroll reports depend on clean attendance data.

---

## 13. Local Setup

```bash
git clone <repo>
cd WorkPilot-saas
cp .env.example .env        # fill DATABASE_URL, BETTER_AUTH_SECRET, etc.
npm install
npx prisma generate
npm run db:push             # or db:migrate once schema stabilizes
npm run dev
```

---

## 14. Coding Conventions

- **Naming:** camelCase for variables/functions, PascalCase for components
  and Prisma models, kebab-case for route segments.
- **Server Actions vs Route Handlers:** use Server Actions for
  form-driven mutations inside a portal (e.g. apply leave); use Route
  Handlers (`app/api/...`) for anything needing to be called by external
  systems (webhooks, mobile app, third-party integrations).
- **Validation:** every input — form or API — validated with a Zod schema
  before it reaches a service function. Define schemas once in
  `features/<domain>/schema.ts` and reuse client + server side.
- **Errors:** services throw typed errors (`class NotFoundError`,
  `class ForbiddenError`), caught at the route/action boundary and mapped to
  proper HTTP status / user-facing message. Don't leak raw Prisma errors to the client.
- **No orphan components:** every UI component lives under either
  `components/ui` (generic primitive), `components/shared` (cross-feature),
  or `features/<domain>/components` (domain-specific) — never loose in `app/`.

---

## 15. What "Done" Looks Like Per Phase 1 Feature

Before marking any Phase 1 module complete, confirm:

- [ ] Companyid scoping verified (tried querying as Tenant B, confirmed no leak)
- [ ] RBAC checked server-side for every mutating action
- [ ] Zod validation on all inputs
- [ ] Empty/loading/error states designed (not just happy path)
- [ ] Mobile-responsive (employee portal will be used on phones for check-in)
- [ ] Relevant activity_logs entry written for audit-worthy actions
