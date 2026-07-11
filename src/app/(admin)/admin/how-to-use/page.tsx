import { requireUser } from "@/lib/session";
import { HowToUseGuide } from "@/features/guide/components/how-to-use-guide";

export default async function AdminHowToUsePage() {
  const user = await requireUser();
  return (
    <HowToUseGuide
      audience="admin"
      brand={user.company!.name}
      logoUrl={user.company!.logoUrl}
    />
  );
}
