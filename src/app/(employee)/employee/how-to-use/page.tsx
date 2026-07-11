import { requireUser } from "@/lib/session";
import { HowToUseGuide } from "@/features/guide/components/how-to-use-guide";

export default async function EmployeeHowToUsePage() {
  const user = await requireUser();
  return (
    <HowToUseGuide
      audience="employee"
      brand={user.company!.name}
      logoUrl={user.company!.logoUrl}
    />
  );
}
