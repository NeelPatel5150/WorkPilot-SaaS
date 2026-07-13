# Go live: Vercel + Supabase (end-to-end)

This guide takes WorkPilot from your laptop to a public URL on **Vercel**, with **Supabase Postgres** as the database. Avatars, logos, favicons, and documents are stored **in the database**, so they work on Vercel without S3/R2.

---

## What you will have at the end

| Piece | Provider |
|---|---|
| Web app | Vercel |
| Database | Supabase (PostgreSQL) |
| Domain | `https://your-app.vercel.app` (or custom domain) |
| Email (recommended) | Resend |

Optional later: Redis/Upstash + worker for digests/reminders.

---

## Step 1 — Supabase project + database URL

1. Open [https://supabase.com](https://supabase.com) and sign in.
2. Click **New project**.
3. Pick org, name (e.g. `workpilot`), database password (save it), region close to you.
4. Wait until the project is ready.
5. Go to **Project Settings → Database**.
6. Under **Connection string**, choose **URI**.
7. Copy two URLs if available:

### A) Session / direct (port `5432`) — good for `prisma db push`

```text
postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-xxxx.supabase.com:5432/postgres
```

### B) Pooler / transaction (port `6543`) — good for the Vercel app

```text
postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-xxxx.pooler.supabase.com:6543/postgres
```

**Important**

- Replace `[YOUR-PASSWORD]` with the real password.
- If the password has special characters (`@ # % + /`), URL-encode them.
- Add `?sslmode=require` at the end if it is not already there.

Example:

```env
DATABASE_URL="postgresql://postgres.xxxxx:YOUR_PASSWORD@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require"
DIRECT_URL="postgresql://postgres.xxxxx:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres?sslmode=require"
```

For this app, **at minimum set `DATABASE_URL`**. Setting both is safer.

---

## Step 2 — Create tables on Supabase (from your PC)

In the project folder:

```powershell
# Point local .env at Supabase temporarily (or edit .env)
# DATABASE_URL="postgresql://...supabase...?sslmode=require"

npx prisma generate
npx prisma db push
```

You should see something like: *Your database is now in sync with your Prisma schema.*

Optional demo seed (skip for real production):

```powershell
npx tsx prisma/seed.ts
```

Check in Supabase → **Table Editor**: you should see tables like `user`, `company`, `leave_types`, `documents`, etc.

---

## Step 3 — Push code to GitHub

1. Create a GitHub repo (private is fine).
2. From the project:

```powershell
git status
git add .
# Do NOT commit .env
git commit -m "Prepare WorkPilot for Vercel deploy"
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git push -u origin HEAD
```

Confirm `.env` is in `.gitignore` and never pushed.

---

## Step 4 — Deploy on Vercel

1. Open [https://vercel.com](https://vercel.com) → sign in with GitHub.
2. **Add New… → Project** → import your WorkPilot repo.
3. Framework: **Next.js** (auto-detected).
4. Before Deploy, open **Environment Variables** and add:

### Required env vars

| Name | Value |
|---|---|
| `DATABASE_URL` | Supabase pooler URI + `sslmode=require` |
| `DIRECT_URL` | Supabase direct URI + `sslmode=require` (optional but recommended) |
| `BETTER_AUTH_SECRET` | Long random string (32+ chars) |
| `BETTER_AUTH_URL` | `https://YOUR_PROJECT.vercel.app` |
| `NEXT_PUBLIC_APP_URL` | `https://YOUR_PROJECT.vercel.app` |
| `NEXT_PUBLIC_ROOT_DOMAIN` | `YOUR_PROJECT.vercel.app` |

Generate secret (PowerShell):

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

Or:

```bash
openssl rand -base64 32
```

### Recommended

| Name | Value |
|---|---|
| `RESEND_API_KEY` | from [resend.com](https://resend.com) |
| `EMAIL_FROM` | e.g. `noreply@yourdomain.com` (must be allowed in Resend) |

### Optional (skip for first launch)

- `REDIS_URL` — digests/reminders
- Twilio / Firebase — WhatsApp / push

5. Set env for **Production** (and Preview if you want).
6. Click **Deploy**.

### Build settings

If the build fails on Prisma, set **Build Command** to:

```bash
prisma generate && next build
```

Or ensure `package.json` build already runs generate.

---

## Step 5 — Fix URLs after first deploy

After the first deploy, Vercel gives you a URL like:

`https://workpilot-xxx.vercel.app`

1. Vercel → Project → **Settings → Environment Variables**
2. Update:
   - `BETTER_AUTH_URL` = that exact HTTPS URL (no trailing slash)
   - `NEXT_PUBLIC_APP_URL` = same
   - `NEXT_PUBLIC_ROOT_DOMAIN` = host only, e.g. `workpilot-xxx.vercel.app`
3. **Redeploy** (Deployments → … → Redeploy) so public env vars apply.

Mismatch here causes login/session loops.

---

## Step 6 — Smoke test on production

1. Open `https://YOUR_PROJECT.vercel.app`
2. **Register** a new company
3. Finish onboarding (Brand → Timing → Holidays → Invite) or skip
4. Upload **avatar**, **logo**, a **document** — they should persist after refresh/redeploy
5. Invite an employee (needs Resend for email; otherwise copy accept link from admin backup card)
6. Employee accept → set password → punch / leave

---

## Step 7 — Custom domain (optional)

1. Vercel → Project → **Settings → Domains** → add `hr.yourdomain.com`
2. Add the DNS records Vercel shows
3. Update env to the custom domain and redeploy:
   - `BETTER_AUTH_URL=https://hr.yourdomain.com`
   - `NEXT_PUBLIC_APP_URL=https://hr.yourdomain.com`
   - `NEXT_PUBLIC_ROOT_DOMAIN=hr.yourdomain.com`  
     (or apex / root domain if you use subdomains per tenant)

---

## File storage note (already handled)

| Asset | Storage |
|---|---|
| Avatars | Postgres (`user.avatarData`) → `/api/avatars/{id}` |
| Logo / favicon | Postgres (`company.logoData` / `faviconData`) → `/api/brand/icon` |
| Documents | Postgres (`document.fileData`) → `/api/documents/{id}` |

No S3/R2 required for these on Vercel.

---

## What still needs Redis + worker (optional)

Without Redis / `npm run worker`:

- App UI still works
- Holiday day-before reminders / digests / queued emails may not run

Add later: Upstash Redis + a small Railway/Render process running `npm run worker`.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Build: Prisma client missing | Build command includes `prisma generate` |
| Runtime: DB connection error | Check Supabase URL, password encoding, `sslmode=require`, allow connections |
| Login loops | `BETTER_AUTH_URL` must equal public HTTPS URL |
| Invite created, no email | Add `RESEND_API_KEY` + verified `EMAIL_FROM` |
| Empty DB / missing tables | Run `npx prisma db push` against Supabase from local |
| Logo/avatar 404 | Re-upload after this DB-storage update |

---

## Quick checklist

- [ ] Supabase project created  
- [ ] `DATABASE_URL` copied with SSL  
- [ ] `prisma db push` succeeded  
- [ ] Code on GitHub (no `.env`)  
- [ ] Vercel project linked  
- [ ] Env vars set + redeployed with correct HTTPS URLs  
- [ ] Register → onboarding → avatar/logo/doc test  

You are live.
