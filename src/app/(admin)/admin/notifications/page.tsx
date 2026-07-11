import { requireUser } from "@/lib/session";
import { listMyNotifications } from "@/services/notification.service";
import { PageHeader, EmptyState } from "@/components/shared/page";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { NotificationActions } from "@/features/notifications/components/notification-actions";

export default async function AdminNotificationsPage() {
  const user = await requireUser();
  const items = await listMyNotifications(user.companyId!, user.id);
  const inApp = items.filter((n) => n.channel === "in_app");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="In-app inbox. Email / WhatsApp / push run when API keys are set."
        actions={<NotificationActions />}
      />
      {inApp.length === 0 ? (
        <EmptyState
          title="No notifications"
          description="Leave requests and announcements will show up here."
        />
      ) : (
        <div className="space-y-3">
          {inApp.map((n) => (
            <Card key={n.id} className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black">{n.title}</h3>
                  {!n.readAt ? <Badge className="bg-[var(--primary)] text-white">New</Badge> : null}
                </div>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">{n.message}</p>
                <p className="mt-2 text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
                  {formatDate(n.createdAt)}
                </p>
              </div>
              {!n.readAt ? <NotificationActions markId={n.id} /> : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
