import { requireUser } from "@/lib/session";
import { PageHeader } from "@/components/shared/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandingForm } from "@/features/branding/components/branding-form";
import { TenantSettingsForm } from "@/features/branding/components/tenant-settings-form";
import { AvatarUploadCard } from "@/features/profile/components/avatar-setup";
import { WorkPolicyForm } from "@/features/settings/components/work-policy-form";

export default async function AdminSettingsPage() {
  const user = await requireUser();
  const company = user.company!;
  const smtp = (company.smtpConfig ?? {}) as { fromName?: string; fromEmail?: string };
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";
  const weeklyOffs = Array.isArray(company.weeklyOffs)
    ? (company.weeklyOffs as number[]).map(Number)
    : [0];

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Company branding and tenant details." />
      <Card>
        <CardHeader>
          <CardTitle>Your avatar</CardTitle>
        </CardHeader>
        <CardContent>
          <AvatarUploadCard currentImage={user.image} userName={user.name} />
        </CardContent>
      </Card>
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
      <BrandingForm
        name={company.name}
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
    </div>
  );
}
