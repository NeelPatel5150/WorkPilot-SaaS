import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { notificationRepo } from "@/repositories/notification.repository";

export async function GET() {
  const user = await requireUser();
  const items = await notificationRepo.listForUser(user.companyId!, user.id, 12);
  const inApp = items.filter((n) => n.channel === "in_app");
  return NextResponse.json({
    items: inApp.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      readAt: n.readAt,
      createdAt: n.createdAt,
    })),
    unread: inApp.filter((n) => !n.readAt).length,
  });
}
