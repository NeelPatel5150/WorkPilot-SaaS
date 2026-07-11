import { requireUser, isAdminRole } from "@/lib/session";
import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/features/onboarding/components/onboarding-wizard";

export default async function OnboardingPage() {
  const user = await requireUser();
  if (!isAdminRole(user.role)) {
    redirect("/employee/dashboard");
  }
  if (user.company!.setupComplete) {
    redirect("/admin/dashboard");
  }

  const weeklyOffs = Array.isArray(user.company!.weeklyOffs)
    ? (user.company!.weeklyOffs as number[]).map(Number)
    : [0];

  return (
    <div className="min-h-dvh px-4 py-8 sm:px-6">
      <OnboardingWizard
        company={{
          name: user.company!.name,
          primaryColor: user.company!.primaryColor,
          secondaryColor: user.company!.secondaryColor,
          logoUrl: user.company!.logoUrl,
          workStartHour: user.company!.workStartHour,
          workStartMinute: user.company!.workStartMinute,
          graceMinutes: user.company!.graceMinutes,
          standardHours: user.company!.standardHours,
          weeklyOffs,
        }}
      />
    </div>
  );
}
