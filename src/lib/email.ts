import { Resend } from "resend";
import { activityRepo } from "@/repositories/activity.repository";
import { prisma } from "@/lib/prisma";

type SmtpConfig = {
  fromName?: string;
  fromEmail?: string;
};

export async function sendEmail(opts: {
  companyId: string;
  to: string;
  subject: string;
  html: string;
}) {
  const company = await prisma.company.findUnique({
    where: { id: opts.companyId },
    select: { name: true, smtpConfig: true },
  });

  const smtp = (company?.smtpConfig ?? {}) as SmtpConfig;
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = smtp.fromEmail || process.env.EMAIL_FROM || "noreply@localhost";
  const fromName = smtp.fromName || company?.name || "WorkPilot";
  const from = `${fromName} <${fromEmail}>`;

  if (!apiKey) {
    console.info(`[email:dev] From=${from} To=${opts.to} Subject=${opts.subject}`);
    await activityRepo.log(opts.companyId, "notification.email.skipped", null, {
      reason: "RESEND_API_KEY missing",
      to: opts.to,
      subject: opts.subject,
      from,
    });
    return { skipped: true };
  }

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }
  return result;
}
