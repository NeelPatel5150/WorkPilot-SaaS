import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { listTenantsForPlatform } from "@/services/platform.service";
import { PageHeader, StatCard } from "@/components/shared/page";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TenantActions } from "@/features/platform/components/tenant-actions";
import { formatDate } from "@/lib/utils";

export default async function PlatformTenantsPage() {
  const session = await requireSession();
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  const tenants = await listTenantsForPlatform(user!.email);
  const active = tenants.filter((t) => t.isActive).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tenants"
        description="Suspend companies, check seats/usage, and manage billing manually."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Companies" value={tenants.length} />
        <StatCard label="Active" value={active} />
        <StatCard label="Suspended" value={tenants.length - active} />
      </div>
      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Seats</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <p className="font-black">{t.name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {t.slug}
                    {t.customDomain ? ` · ${t.customDomain}` : ""}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Joined {formatDate(t.createdAt)} · {t.slipCount} slips
                  </p>
                </TableCell>
                <TableCell>
                  <Badge>{t.plan}</Badge>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    {t.billingStatus}
                    {t.trialEndsAt
                      ? ` · trial to ${formatDate(t.trialEndsAt)}`
                      : ""}
                  </p>
                </TableCell>
                <TableCell className="font-bold">
                  {t.employeeCount}/{t.seatLimit}
                </TableCell>
                <TableCell>
                  {t.hasLogo ? "Logo ✓" : "No logo"}
                  <span
                    className="ml-2 inline-block h-3 w-3 rounded-full border border-[var(--border)]"
                    style={{ background: t.primaryColor }}
                  />
                </TableCell>
                <TableCell>
                  <Badge>{t.isActive ? "Active" : "Suspended"}</Badge>
                  {!t.setupComplete ? (
                    <p className="text-xs text-[var(--muted-foreground)]">Setup incomplete</p>
                  ) : null}
                </TableCell>
                <TableCell>
                  <TenantActions
                    companyId={t.id}
                    isActive={t.isActive}
                    plan={t.plan}
                    seatLimit={t.seatLimit}
                    billingStatus={t.billingStatus}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
