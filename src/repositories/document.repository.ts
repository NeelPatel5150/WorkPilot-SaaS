import { prisma } from "@/lib/prisma";

export const documentRepo = {
  list(companyId: string, employeeId?: string | null) {
    return prisma.document.findMany({
      where: {
        companyId,
        ...(employeeId === undefined
          ? {}
          : employeeId === null
            ? { employeeId: null }
            : { OR: [{ employeeId }, { employeeId: null }] }),
      },
      include: { employee: true },
      orderBy: { createdAt: "desc" },
    });
  },
  create(data: {
    companyId: string;
    employeeId?: string | null;
    name: string;
    fileUrl: string;
    expiresAt?: Date | null;
  }) {
    return prisma.document.create({ data });
  },
  findById(companyId: string, id: string) {
    return prisma.document.findFirst({ where: { id, companyId } });
  },
  delete(companyId: string, id: string) {
    return prisma.document.deleteMany({ where: { id, companyId } });
  },
};
