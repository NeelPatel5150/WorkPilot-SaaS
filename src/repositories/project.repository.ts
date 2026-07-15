import { prisma } from "@/lib/prisma";

const projectInclude = {
  credentials: { orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }] },
  shares: {
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeCode: true,
        },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
};

export const projectRepo = {
  listByCompany(companyId: string) {
    return prisma.project.findMany({
      where: { companyId },
      include: projectInclude,
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
    });
  },

  listSharedWithEmployee(companyId: string, employeeId: string) {
    return prisma.project.findMany({
      where: {
        companyId,
        shares: { some: { employeeId } },
      },
      include: {
        credentials: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
      orderBy: [{ name: "asc" }],
    });
  },

  findById(companyId: string, id: string) {
    return prisma.project.findFirst({
      where: { id, companyId },
      include: projectInclude,
    });
  },

  create(
    companyId: string,
    data: { name: string; description?: string | null; notes?: string | null }
  ) {
    return prisma.project.create({
      data: {
        companyId,
        name: data.name,
        description: data.description ?? null,
        notes: data.notes ?? null,
      },
      include: projectInclude,
    });
  },

  update(
    companyId: string,
    id: string,
    data: { name?: string; description?: string | null; notes?: string | null }
  ) {
    return prisma.project.updateMany({
      where: { id, companyId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
    });
  },

  delete(companyId: string, id: string) {
    return prisma.project.deleteMany({ where: { id, companyId } });
  },

  addCredential(
    projectId: string,
    data: { key: string; value: string; sortOrder?: number }
  ) {
    return prisma.projectCredential.create({
      data: {
        projectId,
        key: data.key,
        value: data.value,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  },

  deleteCredential(id: string, projectId: string) {
    return prisma.projectCredential.deleteMany({ where: { id, projectId } });
  },

  replaceCredentials(
    projectId: string,
    rows: { key: string; value: string }[]
  ) {
    return prisma.$transaction(async (tx) => {
      await tx.projectCredential.deleteMany({ where: { projectId } });
      if (!rows.length) return [];
      await tx.projectCredential.createMany({
        data: rows.map((r, i) => ({
          projectId,
          key: r.key,
          value: r.value,
          sortOrder: i,
        })),
      });
      return tx.projectCredential.findMany({
        where: { projectId },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
    });
  },

  async setShares(projectId: string, companyId: string, employeeIds: string[]) {
    const unique = Array.from(new Set(employeeIds.filter(Boolean)));
    const valid = await prisma.employee.findMany({
      where: { companyId, id: { in: unique } },
      select: { id: true },
    });
    const ids = valid.map((e) => e.id);

    await prisma.$transaction(async (tx) => {
      await tx.projectShare.deleteMany({ where: { projectId } });
      if (ids.length) {
        await tx.projectShare.createMany({
          data: ids.map((employeeId) => ({ projectId, employeeId })),
        });
      }
    });

    return prisma.project.findFirst({
      where: { id: projectId, companyId },
      include: projectInclude,
    });
  },
};
