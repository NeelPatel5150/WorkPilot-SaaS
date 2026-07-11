# How to use WorkPilot

Simple guide to run and use the app.

---

## First time setup

1. **Start Docker Desktop** (must be running)

2. **Open terminal** in this folder and run:

```bash
npm run docker:up
npm install
npm run db:setup
npm run dev
```

3. Open browser: **http://localhost:3000**

Database login (Docker): user `workpilot` / password `workpilot` / db `workpilot`

---

## Login (demo account)

| | |
|---|---|
| Email | `admin@demo.local` |
| Password | `password123` |

After login you go to the **Admin** portal.

### New company (register)

1. Open **Register** and create company + admin account  
2. You land on **Onboarding** (`/onboarding`): **Brand → Timing → Invite first employee**  
3. Finish (or skip) → Admin dashboard  

Existing demo company is already marked setup-complete so it skips the wizard.

In-app guides (white-labeled):
- Admin → **How to use** (`/admin/how-to-use`)
- Employee → **How to use** (`/employee/how-to-use`)

### Install as mobile app (PWA)

On phone Chrome/Edge: menu → **Install app** / **Add to Home screen**.  
Safari iOS: Share → **Add to Home Screen**.  
Employees get a bottom dock for Punch / Leave / Guide.

---

## Create your own company

1. Go to **http://localhost:3000/register**
2. Enter company name, your name, email, password
3. Click **Create company**
4. You become the company admin

---

## What you can do

### As Admin (`/admin/...`)

- **Dashboard** — employees, present today, pending leaves
- **Employees** — add people (email + temp password)
- **Departments** — create teams
- **Attendance** — see everyone’s check-in/out
- **Leaves** — approve or reject requests
- **Holidays** — company holiday calendar
- **Announcements** — broadcast to all staff (+ notifications)
- **Documents** — upload / download company files
- **Reports** — CSV + Excel export
- **Notifications** — in-app inbox
- **Settings** — company name + brand colors

### As Employee (`/employee/...`)

Ask admin to create your account, then log in with that email/password.

- **Dashboard** — today’s status + leave balances
- **Attendance** — **Check in** / **Check out**
- **Leaves** — apply leave, see status
- **Documents** — view shared files
- **Notifications** — inbox
- **Profile** — your details

---

## Optional: email / WhatsApp / push

Add keys in `.env` (otherwise messages log to the terminal in dev):

- `RESEND_API_KEY` + `EMAIL_FROM` → email
- `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` + `TWILIO_WHATSAPP_FROM` → WhatsApp
- `FIREBASE_*` → browser push (stub until fully wired)

Optional worker (Redis must be up):

```bash
npm run worker
```

Without the worker, notifications still send (inline fallback).

---

## Every day (after first setup)

```bash
npm run docker:up
npm run dev
```

Then open http://localhost:3000

---

## Useful commands

| Command | What it does |
|---|---|
| `npm run docker:up` | Start database + Redis |
| `npm run docker:down` | Stop database |
| `npm run db:setup` | Reset schema + demo data |
| `npm run db:studio` | Open database UI |
| `npm run worker` | BullMQ notification worker |
| `npm run dev` | Start the app |
| `npm run build` | Production build |

---

## Tips

- Keep **Docker Desktop** on while using the app
- Demo password is only for local testing
- Brand colors in **Settings** change the look of the whole portal
- Full product rules live in `cookbook.md`
