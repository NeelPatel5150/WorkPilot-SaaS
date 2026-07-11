import { prisma } from "@/lib/prisma";
import { notifyAdmins } from "@/services/notification.service";
import { startOfDayUTC, formatDate } from "@/lib/utils";
import { getWorkPolicy, isLatePunch, isWeeklyOff } from "@/services/policy.service";

/** Daily admin digest: late, on leave tomorrow, pending leaves, open exceptions. */
export async function processAdminDigests() {
  const companies = await prisma.company.findMany({ select: { id: true, name: true } });
  let sent = 0;
  const today = startOfDayUTC();
  const tomorrow = startOfDayUTC(new Date(Date.now() + 24 * 60 * 60 * 1000));

  for (const company of companies) {
    const policy = await getWorkPolicy(company.id);
    if (isWeeklyOff(policy, today)) continue;

    const [attendance, leaveTomorrow, pendingLeaves, openExceptions, missingCheckout] =
      await Promise.all([
        prisma.attendance.findMany({
          where: { companyId: company.id, date: today },
          include: { employee: { select: { firstName: true, lastName: true } } },
        }),
        prisma.leaveRequest.findMany({
          where: {
            companyId: company.id,
            status: "APPROVED",
            startDate: { lte: tomorrow },
            endDate: { gte: tomorrow },
          },
          include: { employee: { select: { firstName: true, lastName: true } } },
        }),
        prisma.leaveRequest.count({
          where: { companyId: company.id, status: "PENDING" },
        }),
        prisma.attendanceException.count({
          where: { companyId: company.id, status: "PENDING" },
        }),
        prisma.attendance.count({
          where: {
            companyId: company.id,
            date: startOfDayUTC(new Date(Date.now() - 24 * 60 * 60 * 1000)),
            checkIn: { not: null },
            checkOut: null,
          },
        }),
      ]);

    const lateNames = attendance
      .filter((a) => a.checkIn && isLatePunch(policy, a.checkIn))
      .map((a) => `${a.employee.firstName} ${a.employee.lastName}`);

    const leaveNames = leaveTomorrow.map(
      (l) => `${l.employee.firstName} ${l.employee.lastName}`
    );

    const lines = [
      `Late today (${lateNames.length}): ${lateNames.slice(0, 8).join(", ") || "none"}`,
      `On leave tomorrow (${leaveNames.length}): ${leaveNames.slice(0, 8).join(", ") || "none"}`,
      `Pending leave approvals: ${pendingLeaves}`,
      `Open attendance exceptions: ${openExceptions}`,
      `Missing checkout (yesterday): ${missingCheckout}`,
    ];

    const hasSignal =
      lateNames.length > 0 ||
      leaveNames.length > 0 ||
      pendingLeaves > 0 ||
      openExceptions > 0 ||
      missingCheckout > 0;

    if (!hasSignal) continue;

    await notifyAdmins(
      company.id,
      `Daily HR digest · ${company.name}`,
      lines.join("\n"),
      { channels: ["in_app", "email", "whatsapp"] }
    );
    sent += 1;
  }

  return sent;
}

/** Alert HR on docs expiring in 14 days or expiring/expired today (once per day window). */
export async function processDocumentExpiryAlerts() {
  const today = startOfDayUTC();
  const in14 = startOfDayUTC(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000));
  const docs = await prisma.document.findMany({
    where: {
      OR: [{ expiresAt: today }, { expiresAt: in14 }],
    },
    include: {
      employee: { select: { firstName: true, lastName: true } },
    },
  });

  let sent = 0;
  for (const doc of docs) {
    if (!doc.expiresAt) continue;
    const expired = doc.expiresAt.getTime() <= today.getTime();
    const who = doc.employee
      ? `${doc.employee.firstName} ${doc.employee.lastName}`
      : "company-wide";
    await notifyAdmins(
      doc.companyId,
      expired ? "Document expired" : "Document expiring in 14 days",
      `"${doc.name}" (${who}) ${expired ? "expired" : "expires"} on ${formatDate(doc.expiresAt)}.`,
      { channels: ["in_app", "email"] }
    );
    sent += 1;
  }
  return sent;
}
