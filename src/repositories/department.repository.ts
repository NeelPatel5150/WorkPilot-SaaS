import { prisma } from "@/lib/prisma";

export const departmentRepo = {
  list(companyId: string) {
    return prisma.department.findMany({
      where: { companyId },
      include: { _count: { select: { employees: true } } },
      orderBy: { name: "asc" },
    });
  },
  findById(companyId: string, id: string) {
    return prisma.department.findFirst({ where: { id, companyId } });
  },
  create(companyId: string, name: string) {
    return prisma.department.create({ data: { companyId, name } });
  },
  delete(companyId: string, id: string) {
    return prisma.department.deleteMany({ where: { id, companyId } });
  },
  rename(companyId: string, id: string, name: string) {
    return prisma.department.updateMany({ where: { id, companyId }, data: { name } });
  },
};
