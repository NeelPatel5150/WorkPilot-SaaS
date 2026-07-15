import { holidayRepo, announcementRepo } from "@/repositories/holiday.repository";
import { activityRepo } from "@/repositories/activity.repository";
import { assertPermission } from "@/lib/session";
import { ValidationError, NotFoundError } from "@/lib/errors";
import { formatDate, startOfDayUTC } from "@/lib/utils";
import { notifyCompanyUsers } from "@/services/notification.service";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/generated/prisma";

export async function listHolidays(companyId: string) {
  return holidayRepo.list(companyId);
}

export async function listUpcomingHolidays(companyId: string) {
  return holidayRepo.listUpcoming(companyId, startOfDayUTC());
}

export async function createHoliday(
  actor: { id: string; companyId: string; role: UserRole },
  name: string,
  date: string
) {
  assertPermission(actor.role, "settings:manage");
  const trimmed = name.trim();
  if (!trimmed) throw new ValidationError("Holiday name is required");
  const holidayDate = startOfDayUTC(new Date(date));
  if (Number.isNaN(holidayDate.getTime())) {
    throw new ValidationError("Invalid holiday date");
  }
  const holiday = await holidayRepo.create(actor.companyId, trimmed, holidayDate);

  await notifyCompanyUsers(
    actor.companyId,
    "New holiday announced",
    `${trimmed} on ${formatDate(holidayDate)}. Mark your calendars.`,
    { channels: ["in_app", "email", "push"] }
  );

  // If the holiday is tomorrow (or today), send the "before" reminder immediately
  const today = startOfDayUTC();
  const tomorrow = startOfDayUTC(new Date(Date.now() + 24 * 60 * 60 * 1000));
  if (
    holidayDate.getTime() === tomorrow.getTime() ||
    holidayDate.getTime() === today.getTime()
  ) {
    await notifyCompanyUsers(
      actor.companyId,
      holidayDate.getTime() === today.getTime()
        ? "Holiday today"
        : "Holiday tomorrow",
      `${trimmed} is ${holidayDate.getTime() === today.getTime() ? "today" : "tomorrow"} (${formatDate(holidayDate)}).`,
      { channels: ["in_app", "email", "push"] }
    );
    await prisma.holiday.update({
      where: { id: holiday.id },
      data: { reminderSentAt: new Date() },
    });
  }

  await activityRepo.log(actor.companyId, "holiday.created", actor.id, {
    holidayId: holiday.id,
  });
  return holiday;
}

/** Quiet bulk import for onboarding / CSV / Google Sheet (no per-row spam). */
export async function importHolidays(
  actor: { id: string; companyId: string; role: UserRole },
  rows: { name: string; date: string }[]
) {
  assertPermission(actor.role, "settings:manage");
  if (rows.length === 0) throw new ValidationError("No holidays to import");

  const existing = await holidayRepo.list(actor.companyId);
  const existingDates = new Set(
    existing.map((h) => startOfDayUTC(h.date).toISOString().slice(0, 10))
  );

  const toCreate: { name: string; date: Date }[] = [];
  const skipped: string[] = [];

  for (const row of rows) {
    const name = row.name.trim();
    const date = startOfDayUTC(new Date(row.date));
    if (!name || Number.isNaN(date.getTime())) {
      skipped.push(`${row.name || "?"} / ${row.date}`);
      continue;
    }
    const key = date.toISOString().slice(0, 10);
    if (existingDates.has(key)) {
      skipped.push(`${name} (${key}) already exists`);
      continue;
    }
    existingDates.add(key);
    toCreate.push({ name, date });
  }

  if (toCreate.length === 0) {
    throw new ValidationError(
      skipped.length
        ? `Nothing imported. ${skipped.slice(0, 3).join("; ")}`
        : "Nothing to import"
    );
  }

  await holidayRepo.createMany(actor.companyId, toCreate);
  await activityRepo.log(actor.companyId, "holiday.imported", actor.id, {
    count: toCreate.length,
  });

  return { imported: toCreate.length, skipped: skipped.length };
}

/** Day-before reminders for upcoming holidays (run from worker). */
export async function processHolidayReminders() {
  const tomorrow = startOfDayUTC(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const due = await prisma.holiday.findMany({
    where: {
      date: tomorrow,
      reminderSentAt: null,
    },
  });

  for (const holiday of due) {
    await notifyCompanyUsers(
      holiday.companyId,
      "Holiday tomorrow",
      `${holiday.name} is tomorrow (${formatDate(holiday.date)}). Enjoy the break!`,
      { channels: ["in_app", "email", "push"] }
    );
    await prisma.holiday.update({
      where: { id: holiday.id },
      data: { reminderSentAt: new Date() },
    });
  }

  return due.length;
}

export async function deleteHoliday(
  actor: { id: string; companyId: string; role: UserRole },
  id: string
) {
  assertPermission(actor.role, "settings:manage");
  await holidayRepo.delete(actor.companyId, id);
  await activityRepo.log(actor.companyId, "holiday.deleted", actor.id, { holidayId: id });
}

export async function updateHoliday(
  actor: { id: string; companyId: string; role: UserRole },
  id: string,
  name: string,
  date: string
) {
  assertPermission(actor.role, "settings:manage");
  const trimmed = name.trim();
  if (!trimmed) throw new ValidationError("Holiday name is required");
  const holidayDate = startOfDayUTC(new Date(date));
  if (Number.isNaN(holidayDate.getTime())) {
    throw new ValidationError("Invalid holiday date");
  }

  const existing = await prisma.holiday.findFirst({
    where: { id, companyId: actor.companyId },
  });
  if (!existing) throw new NotFoundError("Holiday not found");

  await holidayRepo.update(actor.companyId, id, {
    name: trimmed,
    date: holidayDate,
  });

  await activityRepo.log(actor.companyId, "holiday.updated", actor.id, {
    holidayId: id,
  });

  return { id, name: trimmed, date: holidayDate };
}

export async function listAnnouncements(companyId: string) {
  return announcementRepo.list(companyId);
}

export async function createAnnouncement(
  actor: { id: string; companyId: string; role: UserRole },
  title: string,
  body: string
) {
  assertPermission(actor.role, "settings:manage");
  if (!title.trim() || !body.trim()) {
    throw new ValidationError("Title and body are required");
  }
  const announcement = await announcementRepo.create(
    actor.companyId,
    title.trim(),
    body.trim()
  );

  await notifyCompanyUsers(
    actor.companyId,
    `Announcement: ${announcement.title}`,
    announcement.body.slice(0, 280),
    { channels: ["in_app", "email", "push"] }
  );

  await activityRepo.log(actor.companyId, "announcement.created", actor.id, {
    announcementId: announcement.id,
  });
  return announcement;
}

export async function deleteAnnouncement(
  actor: { id: string; companyId: string; role: UserRole },
  id: string
) {
  assertPermission(actor.role, "settings:manage");
  await announcementRepo.delete(actor.companyId, id);
}
