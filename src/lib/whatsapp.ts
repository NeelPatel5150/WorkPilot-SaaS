import twilio from "twilio";
import { activityRepo } from "@/repositories/activity.repository";
import { prisma } from "@/lib/prisma";

export async function sendWhatsApp(opts: {
  companyId: string;
  to: string;
  body: string;
}) {
  const company = await prisma.company.findUnique({
    where: { id: opts.companyId },
    select: { whatsappNumber: true },
  });

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from =
    company?.whatsappNumber ||
    process.env.TWILIO_WHATSAPP_FROM ||
    null;

  if (!sid || !token || !from) {
    console.info(`[whatsapp:dev] To=${opts.to} Body=${opts.body}`);
    await activityRepo.log(opts.companyId, "notification.whatsapp.skipped", null, {
      reason: "Twilio credentials or company WhatsApp number missing",
      to: opts.to,
    });
    return { skipped: true };
  }

  const client = twilio(sid, token);
  const to = opts.to.startsWith("whatsapp:") ? opts.to : `whatsapp:${opts.to}`;
  return client.messages.create({
    from: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
    to,
    body: opts.body,
  });
}
