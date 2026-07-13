import Link from "next/link";
import {
  Clock,
  CalendarDays,
  Users,
  Wallet,
  Bell,
  Settings,
  Smartphone,
  ShieldCheck,
  FileText,
  Megaphone,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Audience = "admin" | "employee";

const ADMIN_STEPS = [
  {
    icon: Settings,
    title: "Brand your portal",
    body: "Settings → logo, colors, leave types, domain, and audit log. The whole app follows your brand.",
  },
  {
    icon: Users,
    title: "Add people",
    body: "Employees → invite with email. They set a password and land in the employee portal.",
  },
  {
    icon: Clock,
    title: "Set work timing",
    body: "Settings → start time, grace minutes, weekly offs, optional geofence/IP so late & LOP stay fair.",
  },
  {
    icon: CalendarDays,
    title: "Approve leave & exceptions",
    body: "Leaves and Exceptions queues. Managers can approve their team; HR/admin sees all.",
  },
  {
    icon: Wallet,
    title: "Run payroll",
    body: "Pick employee → preview attendance/LOP → draft slip with PF/ESI/TDS → edit → publish → lock month.",
  },
  {
    icon: Megaphone,
    title: "Announce & share docs",
    body: "Announcements and Documents notify the team. Set expiry on IDs/contracts for HR alerts.",
  },
];

const EMPLOYEE_STEPS = [
  {
    icon: Smartphone,
    title: "Install this app",
    body: "On phone: browser menu → Add to Home Screen / Install. Punch and leave without opening a tab.",
  },
  {
    icon: Clock,
    title: "Daily punch",
    body: "Attendance → Check in when you start, Check out when you leave. Allow location if your office uses geofence.",
  },
  {
    icon: CalendarDays,
    title: "Apply leave",
    body: "Leaves → pick type (CL/SL/EL…), dates, half-day if needed, who covers, then submit for approval.",
  },
  {
    icon: ShieldCheck,
    title: "Fix a missed punch",
    body: "Forgot punch or missing checkout? Request an attendance exception. Admin/manager reviews it.",
  },
  {
    icon: FileText,
    title: "Payslips & documents",
    body: "Payslips open after HR publishes. Documents holds policies and letters shared with you.",
  },
  {
    icon: Bell,
    title: "Stay notified",
    body: "Bell shows leave decisions, announcements, holidays, and payslip-ready alerts.",
  },
];

export function HowToUseGuide({
  audience,
  brand,
  logoUrl,
}: {
  audience: Audience;
  brand: string;
  logoUrl?: string | null;
}) {
  const steps = audience === "admin" ? ADMIN_STEPS : EMPLOYEE_STEPS;
  const otherHref =
    audience === "admin" ? "/employee/how-to-use" : "/admin/how-to-use";

  return (
    <div className="space-y-6">
      <section
        className="relative overflow-hidden rounded-3xl border-2 border-[var(--border)] p-6 shadow-[8px_8px_0_0_var(--border)] sm:p-8"
        style={{
          backgroundImage:
            "linear-gradient(135deg, color-mix(in srgb, var(--primary) 22%, white) 0%, white 42%, color-mix(in srgb, var(--secondary) 70%, white) 72%, color-mix(in srgb, var(--warning) 18%, white) 100%)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-40"
          style={{
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--primary) 50%, transparent), transparent 70%)",
          }}
        />
        <div className="relative flex flex-wrap items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-[var(--border)] bg-white shadow-[3px_3px_0_0_var(--border)]">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-full w-full object-contain p-1" />
            ) : (
              <span className="text-xl font-black text-[var(--primary)]">
                {brand.charAt(0)}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
              {brand} · How to use
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
              {audience === "admin" ? "Run HR with clarity" : "Your day, sorted"}
            </h1>
            <p className="mt-2 max-w-xl text-sm font-medium text-[var(--muted-foreground)] sm:text-base">
              {audience === "admin"
                ? "Quick map of what each admin screen is for, from branding to payroll lock."
                : "Field-friendly guide: install the app, punch in, apply leave, and track payslips."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border-2 border-[var(--border)] bg-white px-3 py-1 text-xs font-black shadow-[2px_2px_0_0_var(--border)]">
                {audience === "admin" ? "Admin guide" : "Employee guide"}
              </span>
              <span className="rounded-full border-2 border-[var(--border)] bg-white/80 px-3 py-1 text-xs font-bold text-[var(--muted-foreground)]">
                Powered by WorkPilot
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <Card
              key={step.title}
              className="overflow-hidden !p-0 shadow-[5px_5px_0_0_var(--border)]"
            >
              <div
                className="h-1.5 w-full"
                style={{ backgroundImage: "var(--stat-accent)" }}
              />
              <CardContent className="space-y-2 p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[var(--border)] bg-[var(--secondary)] text-xs font-black">
                    {i + 1}
                  </span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[var(--border)] bg-white">
                    <Icon className="h-4 w-4 text-[var(--primary)]" />
                  </div>
                  <h2 className="text-base font-black">{step.title}</h2>
                </div>
                <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
                  {step.body}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card
        className="overflow-hidden border-2 !p-0"
        style={{ backgroundImage: "var(--card-shine)" }}
      >
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black">
              {audience === "admin"
                ? "Need the employee view?"
                : "Install tip for Android / iPhone"}
            </p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              {audience === "admin"
                ? "Open the employee guide to see what your team experiences on mobile."
                : "Chrome/Edge: menu → Install app. Safari (iOS): Share → Add to Home Screen."}
            </p>
          </div>
          {audience === "admin" ? (
            <Link href="/employee/dashboard">
              <Button variant="outline" type="button">
                Open employee portal
              </Button>
            </Link>
          ) : (
            <Link href="/employee/attendance">
              <Button type="button">Go to punch</Button>
            </Link>
          )}
        </CardContent>
      </Card>

      {audience === "admin" ? (
        <p className="text-center text-xs text-[var(--muted-foreground)]">
          Looking for developer setup? See the repo file{" "}
          <code className="font-mono font-bold">HOW_TO_USE.md</code>.
        </p>
      ) : (
        <p className="text-center text-xs text-[var(--muted-foreground)]">
          Managers and HR use a different portal - ask admin if you need access.
          <span className="hidden"> {otherHref}</span>
        </p>
      )}
    </div>
  );
}
