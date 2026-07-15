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
      select: {
        id: true,
        companyId: true,
        employeeId: true,
        name: true,
        fileUrl: true,
        fileMime: true,
        expiresAt: true,
        createdAt: true,
        employee: true,
      },
      orderBy: { createdAt: "desc" },
    });
  },
  create(data: {
    companyId: string;
    employeeId?: string | null;
    name: string;
    fileUrl: string;
    fileData?: Uint8Array;
    fileMime?: string;
    expiresAt?: Date | null;
  }) {
    const { fileData, ...rest } = data;
    return prisma.document.create({
      data: {
        ...rest,
        ...(fileData !== undefined
          ? { fileData: new Uint8Array(fileData) as Uint8Array<ArrayBuffer> }
          : {}),
      },
    });
  },
  findById(companyId: string, id: string) {
    return prisma.document.findFirst({ where: { id, companyId } });
  },
  findFileById(companyId: string, id: string) {
    return prisma.document.findFirst({
      where: { id, companyId },
      select: {
        id: true,
        name: true,
        fileUrl: true,
        fileData: true,
        fileMime: true,
        companyId: true,
        employeeId: true,
      },
    });
  },
  delete(companyId: string, id: string) {
    return prisma.document.deleteMany({ where: { id, companyId } });
  },
};
