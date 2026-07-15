import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";

export const companyRepo = {
  findBySlug(slug: string) {
    return prisma.company.findUnique({ where: { slug } });
  },
  findById(id: string) {
    return prisma.company.findUnique({ where: { id } });
  },
  create(data: {
    name: string;
    slug: string;
    primaryColor?: string;
    secondaryColor?: string;
  }) {
    // setupComplete defaults to false; trial starts at registration (Phase 7 billing)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);
    return prisma.company.create({
      data: {
        ...data,
        plan: "TRIAL",
        seatLimit: 25,
        trialEndsAt,
        billingStatus: "OK",
      },
    });
  },
  markSetupComplete(companyId: string) {
    return prisma.company.update({
      where: { id: companyId },
      data: { setupComplete: true },
    });
  },
  updateBranding(
    companyId: string,
    data: {
      name?: string;
      address?: string | null;
      primaryColor?: string;
      secondaryColor?: string;
      logoUrl?: string | null;
      faviconUrl?: string | null;
      logoData?: Uint8Array | null;
      logoMime?: string | null;
      faviconData?: Uint8Array | null;
      faviconMime?: string | null;
      customDomain?: string | null;
      whatsappNumber?: string | null;
      smtpConfig?: { fromName?: string; fromEmail?: string } | null;
    }
  ) {
    const { smtpConfig, ...rest } = data;
    const patch: Prisma.CompanyUpdateInput = {
      name: rest.name,
      address: rest.address,
      primaryColor: rest.primaryColor,
      secondaryColor: rest.secondaryColor,
      logoUrl: rest.logoUrl,
      faviconUrl: rest.faviconUrl,
      logoMime: rest.logoMime,
      faviconMime: rest.faviconMime,
      customDomain: rest.customDomain,
      whatsappNumber: rest.whatsappNumber,
      ...(rest.logoData !== undefined
        ? {
            logoData:
              rest.logoData === null
                ? null
                : (new Uint8Array(rest.logoData) as Uint8Array<ArrayBuffer>),
          }
        : {}),
      ...(rest.faviconData !== undefined
        ? {
            faviconData:
              rest.faviconData === null
                ? null
                : (new Uint8Array(rest.faviconData) as Uint8Array<ArrayBuffer>),
          }
        : {}),
    };
    if (smtpConfig === null) {
      patch.smtpConfig = Prisma.DbNull;
    } else if (smtpConfig !== undefined) {
      patch.smtpConfig = smtpConfig as Prisma.InputJsonValue;
    }
    return prisma.company.update({ where: { id: companyId }, data: patch });
  },
};
