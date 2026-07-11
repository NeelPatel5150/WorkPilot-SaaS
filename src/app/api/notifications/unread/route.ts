import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { notificationRepo } from "@/repositories/notification.repository";

export async function GET() {
  const user = await requireUser();
  const count = await notificationRepo.unreadCount(user.companyId!, user.id);
  return NextResponse.json({ count });
}
