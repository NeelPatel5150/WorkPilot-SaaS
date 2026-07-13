# Deploy WorkPilot to production

Step-by-step guide to run WorkPilot as a live multi-tenant HRMS.

---

## What you need

| Service | Purpose | Examples |
|---|---|---|
| **Node.js 20+** host | Next.js app (`npm run build` + `npm start`) | Vercel, Railway, Render, VPS |
| **PostgreSQL 15+** | Primary database | Neon, Supabase, Railway, RDS |
| **Redis** | BullMQ jobs (digests, reminders, email queue) | Upstash, Redis Cloud, self-hosted |
| **Domain + HTTPS** | Public URL for auth cookies & PWA | Cloudflare / your registrar |
| **Email (recommended)** | Invites, leave alerts, digests | Resend |
| **Object storage (optional)** | Logos, documents at scale | Cloudflare R2 / S3 |

Local Docker (`docker compose`) is for development only. Production should use managed Postgres + Redis.

---

## 1. Prepare environment variables

Copy `.env.example` and fill production values. **Never commit `.env`.**

### Required

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require"

BETTER_AUTH_SECRET="paste-a-long-random-secret-at-least-32-chars"
BETTER_AUTH_URL="https://your-domain.com"

REDIS_URL="rediss://default:PASSWORD@HOST:6379"

NEXT_PUBLIC_APP_URL="https://your-domain.com"
NEXT_PUBLIC_ROOT_DOMAIN="your-domain.com"
```

Generate `BETTER_AUTH_SECRET`:

```bash
openssl rand -base64 32
```

### Strongly recommended

```env
RESEND_API_KEY="re_..."
EMAIL_FROM="noreply@your-domain.com"
```

Without email, employee invites still create accounts but password emails will not send (temp password may appear in the admin invite response only).

### Optional

```env
# WhatsApp (Twilio)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=

# Push (FCM)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=

# File storage (R2/S3). If empty, files go to UPLOAD_DIR on the server disk.
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=
S3_ENDPOINT=
S3_REGION=auto
UPLOAD_DIR=uploads
```

**Checklist**

- [ ] `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` use `https://` and the same public host
- [ ] `BETTER_AUTH_SECRET` is unique per environment (not the demo value)
- [ ] Postgres allows SSL from your app host
- [ ] Redis is reachable from both the web app and the worker process

---

## 2. Database setup

On first deploy (or after pulling schema changes):

```bash
npm ci
npx prisma generate
npx prisma db push
# optional demo tenant (skip on real production):
# npx tsx prisma/seed.ts
```

Prefer `prisma migrate deploy` once you introduce migration files for a stricter production workflow. This repo commonly uses `db push` during early development.

After adding `Company.setupComplete`, existing tenants that should **not** see the onboarding wizard again:

```bash
npx tsx scripts/mark-setup-complete.ts
```

New companies from **Register** start with `setupComplete: false` and are sent through the wizard automatically.

---

## 3. Build and run the web app

```bash
npm ci
npx prisma generate
npm run build
npm start
```

`npm start` serves Next.js on port **3000** by default. Put a reverse proxy (Nginx, Caddy, Cloudflare) in front for TLS and `https://your-domain.com`.

### Vercel / similar

1. Connect the Git repo
2. Set all env vars in the dashboard
3. Build command: `prisma generate && next build` (or `npm run build` if generate is included)
4. Add a Postgres + Redis provider and paste URLs into env
5. Run `prisma db push` once against production (CI job or one-off shell)

Node serverless platforms still need a **separate always-on worker** for BullMQ (see next section).

---

## 4. Run the background worker

WorkPilot uses BullMQ for digests, document-expiry checks, and notification delivery. Without Redis + worker, those jobs will not run.

On the same machine or a second process/container:

```bash
npm ci
npx prisma generate
npm run worker
```

Keep this process supervised (`systemd`, PM2, Docker restart policy, Railway worker service).

Example PM2:

```bash
pm2 start npm --name workpilot-web -- start
pm2 start npm --name workpilot-worker -- run worker
pm2 save
```

---

## 5. Docker Compose production sketch (VPS)

Use managed DB/Redis if you can. If you self-host everything on one VPS:

1. Point DNS `A`/`AAAA` to the VPS
2. Install Docker + Node 20
3. Place `.env` next to the project
4. Start Postgres/Redis (or use `docker compose` services)
5. Build and run:

```bash
npm ci
npx prisma generate
npx prisma db push
npm run build
npm start          # process 1
npm run worker     # process 2
```

Terminate TLS with Caddy/Nginx; proxy to `127.0.0.1:3000`.

---

## 6. Go-live checklist

### Auth & security

- [ ] HTTPS only; HTTP redirects to HTTPS
- [ ] Fresh `BETTER_AUTH_SECRET`
- [ ] Demo seed account disabled or password changed (`admin@demo.local`)
- [ ] Uploads: avatars / logos / documents use DB storage (or S3/R2 if configured)

### Product

- [ ] Register a test company → onboarding (brand → timing → first employee)
- [ ] Admin can invite employee; employee can accept / set password
- [ ] Check-in / check-out works
- [ ] Leave apply + approve works
- [ ] Payslip generate / print works if you use payroll
- [ ] PWA: open site on phone → Install / Add to Home Screen
- [ ] Branding colors/logo appear after refresh

### Ops

- [ ] Worker process is running (`npm run worker`)
- [ ] Redis connected
- [ ] Resend (or SMTP path) sends a test invite email
- [ ] Backups enabled on Postgres (daily minimum)
- [ ] Monitor disk if using local `UPLOAD_DIR`

---

## 7. Client / tenant delivery models

| Model | How |
|---|---|
| **Shared SaaS** | One deploy; each company registers or you create them; isolation by `companyId` |
| **White-label subdomain** | `{slug}.your-domain.com` (tenant middleware) |
| **Custom domain** | Set `customDomain` on the company; DNS CNAME to your app |

Each tenant configures logo, colors, work timing, and employees under Admin → Settings / Branding (or via the post-register onboarding wizard).

---

## 8. Updating production

```bash
git pull
npm ci
npx prisma generate
npx prisma db push   # or migrate deploy
npm run build
# restart web + worker
```

Always take a DB backup before schema changes.

---

## 9. Troubleshooting

| Symptom | Likely cause |
|---|---|
| Login loops / session lost | `BETTER_AUTH_URL` ≠ public HTTPS URL |
| Register works, dashboard redirects to onboarding forever | Finish wizard or run `scripts/mark-setup-complete.ts` for that tenant |
| Invites created but no email | Missing `RESEND_API_KEY` / `EMAIL_FROM` |
| Digests / reminders never fire | Redis down or worker not running |
| Uploads fail on serverless | Configure S3/R2; local disk is ephemeral |
| Build fails on Prisma | Run `prisma generate` in the build step |

---

## Related docs

- Product overview → [README.md](./README.md)
- Local how-to → [HOW_TO_USE.md](./HOW_TO_USE.md)
- Product rules / architecture → [cookbook.md](./cookbook.md)
