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
    // setupComplete defaults to false in the schema (onboarding wizard)
    return prisma.company.create({ data });
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
      primaryColor?: string;
      secondaryColor?: string;
      logoUrl?: string | null;
      faviconUrl?: string | null;
      customDomain?: string | null;
      whatsappNumber?: string | null;
      smtpConfig?: { fromName?: string; fromEmail?: string } | null;
    }
  ) {
    const { smtpConfig, ...rest } = data;
    const patch: Prisma.CompanyUpdateInput = { ...rest };
    if (smtpConfig === null) {
      patch.smtpConfig = Prisma.DbNull;
    } else if (smtpConfig !== undefined) {
      patch.smtpConfig = smtpConfig as Prisma.InputJsonValue;
    }
    return prisma.company.update({ where: { id: companyId }, data: patch });
  },
};
