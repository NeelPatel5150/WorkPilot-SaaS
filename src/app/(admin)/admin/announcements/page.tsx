import { requireUser } from "@/lib/session";
import { listAnnouncements } from "@/services/holiday.service";
import { PageHeader, EmptyState } from "@/components/shared/page";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { AnnouncementForms } from "@/features/announcements/components/announcement-forms";

export default async function AdminAnnouncementsPage() {
  const user = await requireUser();
  const items = await listAnnouncements(user.companyId!);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Announcements"
        description="Broadcast updates to everyone in the company."
      />
      <AnnouncementForms />
      {items.length === 0 ? (
        <EmptyState title="No announcements" description="Post your first company update." />
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <Card key={a.id} className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-black">{a.title}</h3>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">{a.body}</p>
                <p className="mt-2 text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
                  {formatDate(a.createdAt)}
                </p>
              </div>
              <AnnouncementForms deleteId={a.id} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
