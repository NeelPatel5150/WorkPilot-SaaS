import Link from "next/link";
import { getInviteContext } from "@/services/employee.service";
import { AcceptInviteForm } from "@/features/employees/components/accept-invite-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const sp = await searchParams;
  const email = (sp.email || "").trim().toLowerCase();
  const invite = email ? await getInviteContext(email) : null;

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-10"
      style={{
        backgroundImage: invite
          ? `radial-gradient(ellipse 900px 480px at 10% -10%, ${invite.company.primaryColor}40, transparent 55%), radial-gradient(ellipse 700px 400px at 100% 0%, ${invite.company.secondaryColor}, transparent 50%), linear-gradient(165deg, ${invite.company.secondaryColor}, #f8fafc)`
          : undefined,
      }}
    >
      {!invite ? (
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invite not available</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-[var(--muted-foreground)]">
              This invite link is invalid, expired, or already accepted.
            </p>
            <Link href="/login" className="font-bold underline">
              Go to sign in
            </Link>
          </CardContent>
        </Card>
      ) : (
        <AcceptInviteForm
          email={invite.email}
          companyName={invite.company.name}
          employeeCode={invite.employeeCode}
          primaryColor={invite.company.primaryColor}
        />
      )}
    </div>
  );
}
