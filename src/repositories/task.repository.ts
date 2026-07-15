import { prisma } from "@/lib/prisma";
import type {
  TaskAssigneeStatus,
  TaskPriority,
  TaskWorkType,
} from "@/generated/prisma";

export const taskRepo = {
  listForCompany(companyId: string) {
    return prisma.task.findMany({
      where: { companyId },
      include: {
        createdBy: { select: { id: true, name: true } },
        assignees: {
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
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  listForEmployee(companyId: string, employeeId: string) {
    return prisma.taskAssignee.findMany({
      where: { employeeId, task: { companyId } },
      include: {
        task: {
          include: {
            createdBy: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });
  },

  findById(companyId: string, id: string) {
    return prisma.task.findFirst({
      where: { id, companyId },
      include: {
        createdBy: { select: { id: true, name: true } },
        assignees: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeCode: true,
                userId: true,
              },
            },
          },
        },
      },
    });
  },

  create(data: {
    companyId: string;
    title: string;
    description?: string | null;
    dueDate?: Date | null;
    priority: TaskPriority;
    workType: TaskWorkType;
    boardStatus?: TaskAssigneeStatus;
    createdById: string;
    assigneeEmployeeIds: string[];
  }) {
    const boardStatus = data.boardStatus ?? "TODO";
    return prisma.task.create({
      data: {
        companyId: data.companyId,
        title: data.title,
        description: data.description ?? null,
        dueDate: data.dueDate ?? null,
        priority: data.priority,
        workType: data.workType,
        boardStatus,
        createdById: data.createdById,
        assignees: {
          create: data.assigneeEmployeeIds.map((employeeId) => ({
            employeeId,
            status: boardStatus,
            ...(boardStatus !== "TODO" ? { startedAt: new Date() } : {}),
            ...(boardStatus === "DONE" ? { completedAt: new Date() } : {}),
          })),
        },
      },
      include: {
        assignees: {
          include: {
            employee: {
              select: { id: true, userId: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });
  },

  async updateBoardStatus(
    companyId: string,
    taskId: string,
    boardStatus: TaskAssigneeStatus
  ) {
    const now = new Date();
    return prisma.$transaction(async (tx) => {
      const task = await tx.task.findFirst({
        where: { id: taskId, companyId },
        include: { assignees: true },
      });
      if (!task) return { count: 0 };

      await tx.task.update({
        where: { id: taskId },
        data: { boardStatus },
      });

      for (const a of task.assignees) {
        const startedAt =
          boardStatus === "TODO"
            ? null
            : a.startedAt ??
              (boardStatus === "IN_PROGRESS" ||
              boardStatus === "IN_REVIEW" ||
              boardStatus === "DONE"
                ? now
                : a.startedAt);
        await tx.taskAssignee.update({
          where: { id: a.id },
          data: {
            status: boardStatus,
            startedAt,
            completedAt: boardStatus === "DONE" ? now : null,
          },
        });
      }

      return { count: 1 };
    });
  },

  async updateAssigneeStatus(
    companyId: string,
    assigneeId: string,
    employeeId: string,
    status: TaskAssigneeStatus,
    note?: string | null
  ) {
    const existing = await prisma.taskAssignee.findFirst({
      where: {
        id: assigneeId,
        employeeId,
        task: { companyId },
      },
    });
    if (!existing) return { count: 0 };

    const now = new Date();
    const startedAt =
      status === "TODO"
        ? null
        : existing.startedAt ??
          (status === "IN_PROGRESS" || status === "IN_REVIEW" || status === "DONE"
            ? now
            : existing.startedAt);

    await prisma.$transaction([
      prisma.taskAssignee.updateMany({
        where: {
          id: assigneeId,
          employeeId,
          task: { companyId },
        },
        data: {
          status,
          note: note ?? undefined,
          startedAt,
          completedAt: status === "DONE" ? now : null,
        },
      }),
      // Keep admin company board in sync with this assignee’s progress
      prisma.task.updateMany({
        where: { id: existing.taskId, companyId },
        data: { boardStatus: status },
      }),
    ]);

    return { count: 1 };
  },

  delete(companyId: string, id: string) {
    return prisma.task.deleteMany({ where: { id, companyId } });
  },
};
