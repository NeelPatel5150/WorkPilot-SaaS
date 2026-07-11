import Link from "next/link";
import { getSession, portalHomeForRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";
import { getAuthBrand } from "@/lib/auth-brand";

export default async function HomePage() {
  const session = await getSession();
  if (session?.user) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (user?.companyId) redirect(portalHomeForRole(user.role));
  }

  const brand = await getAuthBrand();
  const displayName = brand?.name ?? "WorkPilot";
  const logoSrc = brand
    ? `/api/brand/icon?kind=logo&companyId=${brand.companyId}`
    : null;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: brand
            ? `radial-gradient(circle at 15% 20%, ${brand.primaryColor}47, transparent 42%), radial-gradient(circle at 85% 10%, #fef08a 0%, transparent 35%), linear-gradient(180deg, ${brand.secondaryColor} 0%, #e2e8f0 100%)`
            : "radial-gradient(circle at 15% 20%, color-mix(in oklab, var(--primary) 28%, transparent), transparent 42%), radial-gradient(circle at 85% 10%, #fef08a 0%, transparent 35%), linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)",
        }}
      />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoSrc}
              alt={displayName}
              className="h-10 w-10 rounded-xl border-2 border-[var(--border)] bg-white object-contain p-1 shadow-[3px_3px_0_0_var(--border)]"
            />
          ) : null}
          <div>
            <p className="text-2xl font-black tracking-tight">{displayName}</p>
            {brand ? (
              <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
                Powered by WorkPilot
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="outline">Sign in</Button>
          </Link>
          <Link href="/register">
            <Button>Start free</Button>
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-20 pt-10 md:pt-20">
        <section className="max-w-3xl">
          <p className="mb-4 inline-block border-2 border-[var(--border)] bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] shadow-[4px_4px_0_0_var(--border)]">
            White-label HRMS
          </p>
          <h1 className="text-5xl font-black leading-[0.95] tracking-tight md:text-7xl">
            {displayName}
          </h1>
          <p className="mt-6 max-w-xl text-lg text-[var(--muted-foreground)] md:text-xl">
            {brand
              ? `Your branded portal for attendance, leave, payroll, and people — powered by WorkPilot.`
              : `Launch your branded WorkPilot portal — attendance, leave, payroll, and employees — on one shared codebase.`}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register">
              <Button size="lg">Create your company</Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="secondary">
                Employee login
              </Button>
            </Link>
          </div>
        </section>

        <section id="features" className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Multi-tenant",
              body: "Every company gets its own brand, domain, and isolated data.",
            },
            {
              title: "Attendance + Leave",
              body: "Check-in, working hours, approvals, and balances out of the box.",
            },
            {
              title: "Admin + Employee",
              body: "Two portals, one app — role-based access for HR and teams.",
            },
          ].map((f) => (
            <div key={f.title} className="nb-card bg-white p-5">
              <h3 className="text-lg font-black">{f.title}</h3>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">{f.body}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
