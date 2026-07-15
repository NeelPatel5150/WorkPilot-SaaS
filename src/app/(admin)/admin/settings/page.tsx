import { requireUser } from "@/lib/session";
import { listLeaveTypes } from "@/services/leave.service";
import { activityRepo } from "@/repositories/activity.repository";
import { PageHeader } from "@/components/shared/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandingForm } from "@/features/branding/components/branding-form";
import { TenantSettingsForm } from "@/features/branding/components/tenant-settings-form";
import { WorkPolicyForm } from "@/features/settings/components/work-policy-form";
import { LeaveTypesForm } from "@/features/settings/components/leave-types-form";
import { AuditLogCard } from "@/features/settings/components/audit-log-card";
import { AdminAccountCard } from "@/features/settings/components/admin-account-card";
import { isPlatformAdminEmail } from "@/services/platform.service";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function AdminSettingsPage() {
  const user = await requireUser();
  const company = user.company!;
  const smtp = (company.smtpConfig ?? {}) as { fromName?: string; fromEmail?: string };
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";
  const weeklyOffs = Array.isArray(company.weeklyOffs)
    ? (company.weeklyOffs as number[]).map(Number)
    : [0];
  const showPlatform = isPlatformAdminEmail(user.email);

  const [leaveTypes, auditLogs] = await Promise.all([
    listLeaveTypes(user.companyId!),
    activityRepo.list(user.companyId!, 100),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Your account, company policies, branding, and audit."
        actions={
          showPlatform ? (
            <Link href="/platform">
              <Button variant="outline">Platform console</Button>
            </Link>
          ) : null
        }
      />
      {showPlatform ? (
        <Card>
          <CardHeader>
            <CardTitle>Platform operator</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[var(--muted-foreground)]">
            Your email is in <code>PLATFORM_ADMIN_EMAILS</code>. Open the{" "}
            <Link href="/platform" className="font-bold underline">
              tenant console
            </Link>{" "}
            to suspend companies and manage plans/seats.
          </CardContent>
        </Card>
      ) : null}
      <AdminAccountCard
        userId={user.id}
        name={user.name}
        email={user.email}
        role={user.role}
        image={user.image}
        employeeCode={user.employee?.employeeCode ?? null}
      />
      <Card>
        <CardHeader>
          <CardTitle>Tenant</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="font-bold">Slug:</span> {company.slug}
          </p>
          <p>
            <span className="font-bold">Timezone:</span> {company.timezone}
          </p>
        </CardContent>
      </Card>
      <WorkPolicyForm
        policy={{
          workStartHour: company.workStartHour,
          workStartMinute: company.workStartMinute,
          graceMinutes: company.graceMinutes,
          standardHours: company.standardHours,
          weeklyOffs,
          officeLat: company.officeLat,
          officeLng: company.officeLng,
          geofenceRadiusM: company.geofenceRadiusM,
          officeIpAllowlist: company.officeIpAllowlist,
        }}
      />
      <LeaveTypesForm types={leaveTypes} />
      <BrandingForm
        name={company.name}
        address={company.address}
        primaryColor={company.primaryColor}
        secondaryColor={company.secondaryColor}
        logoUrl={company.logoUrl}
        faviconUrl={company.faviconUrl}
      />
      <TenantSettingsForm
        slug={company.slug}
        customDomain={company.customDomain}
        whatsappNumber={company.whatsappNumber}
        fromName={smtp.fromName ?? company.name}
        fromEmail={smtp.fromEmail ?? null}
        rootDomain={rootDomain}
      />
      <AuditLogCard logs={auditLogs} />
    </div>
  );
}
