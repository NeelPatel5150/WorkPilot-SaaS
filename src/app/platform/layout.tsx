import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { isPlatformAdminEmail } from "@/services/platform.service";
import { prisma } from "@/lib/prisma";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    redirect("/login");
  }

  if (!isPlatformAdminEmail(user.email)) {
    const configured = Boolean(
      (process.env.PLATFORM_ADMIN_EMAILS || "").trim()
    );
    return (
      <div className="mx-auto max-w-lg space-y-4 p-6">
        <h1 className="text-xl font-black">Platform access denied</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          No separate platform password. Use your normal WorkPilot login. Your
          account email must be listed in <code>PLATFORM_ADMIN_EMAILS</code> in{" "}
          <code>.env</code>, then restart <code>npm run dev</code>.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>
            Logged in as: <strong>{user.email}</strong>
          </li>
          <li>
            <code>PLATFORM_ADMIN_EMAILS</code> set:{" "}
            <strong>{configured ? "yes" : "no (missing)"}</strong>
          </li>
          <li>
            Tip: the email in <code>.env</code> must match this login email
            exactly (e.g. <code>neel@workpilot.com</code>).
          </li>
        </ul>
        <Link href="/admin/dashboard" className="font-bold underline">
          Back to admin
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b-2 border-[var(--border)] bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
              WorkPilot platform
            </p>
            <h1 className="text-lg font-black">Tenant console</h1>
          </div>
          <a href="/admin/dashboard" className="text-sm font-bold underline">
            Back to company
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">{children}</main>
    </div>
  );
}
