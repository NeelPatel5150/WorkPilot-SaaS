import { redirect } from "next/navigation";

/** Audit log lives under Settings now. */
export default function AdminAuditPage() {
  redirect("/admin/settings");
}
