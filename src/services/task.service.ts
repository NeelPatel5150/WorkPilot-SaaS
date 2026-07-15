import { taskRepo } from "@/repositories/task.repository";
import { activityRepo } from "@/repositories/activity.repository";
import { assertPermission } from "@/lib/session";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { formatDate, startOfDayUTC } from "@/lib/utils";
import { notifyUser } from "@/services/notification.service";
import { prisma } from "@/lib/prisma";
import { publishToUsers } from "@/lib/realtime";
import type {
  TaskAssigneeStatus,
  TaskPriority,
  TaskWorkType,
  UserRole,
} from "@/generated/prisma";

async function notifyWorkspaceTaskChanged(companyId: string, taskId: string) {
  try {
    const [assignees, admins] = await Promise.all([
      prisma.taskAssignee.findMany({
        where: { taskId },
        select: { employee: { select: { userId: true } } },
      }),
      prisma.user.findMany({
        where: {
          companyId,
          role: { in: ["SUPER_ADMIN", "COMPANY_ADMIN", "HR", "MANAGER"] },
          isActive: true,
        },
        select: { id: true },
      }),
    ]);
    publishToUsers(
      [
        ...assignees.map((a) => a.employee.userId),
        ...admins.map((a) => a.id),
      ],
      {
        type: "workspace",
        kind: "task_moved",
        companyId,
        taskId,
        at: new Date().toISOString(),
      }
    );
  } catch (error) {
    console.error("workspace realtime notify failed", error);
  }
}

const PRIORITIES = new Set<TaskPriority>(["LOW", "MEDIUM", "HIGH"]);
const WORK_TYPES = new Set<TaskWorkType>(["WORK", "FOLLOW_UP", "DOCUMENT", "OTHER"]);
const ASSIGNEE_STATUSES = new Set<TaskAssigneeStatus>([
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
]);

/** Prisma P2021 / missing table before `prisma db push`. */
function isSchemaMissingError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  if (e.code === "P2021" || e.code === "P2022") return true;
  const msg = (e.message || "").toLowerCase();
  return (
    msg.includes("does not exist") ||
    msg.includes("unknown table") ||
    msg.includes("no such table")
  );
}

async function resolveAssigneeIds(
  companyId: string,
  input: { assignAll?: boolean; employeeIds?: string[] }
) {
  if (input.assignAll) {
    const rows = await prisma.employee.findMany({
      where: {
        companyId,
        employmentStatus: { in: ["ACTIVE", "ON_NOTICE"] },
        user: {
          isActive: true,
          role: { notIn: ["SUPER_ADMIN", "COMPANY_ADMIN"] },
        },
      },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  const ids = [...new Set((input.employeeIds ?? []).filter(Boolean))];
  if (ids.length === 0) {
    // Allow unassigned tasks (MCP / optional assignees on create).
    return [];
  }

  const valid = await prisma.employee.findMany({
    where: {
      companyId,
      id: { in: ids },
      employmentStatus: { in: ["ACTIVE", "ON_NOTICE"] },
      user: {
        isActive: true,
        role: { notIn: ["SUPER_ADMIN", "COMPANY_ADMIN"] },
      },
    },
    select: { id: true },
  });
  if (valid.length === 0) {
    throw new ValidationError("No valid employees selected for this task");
  }
  return valid.map((v) => v.id);
}

export async function listCompanyTasks(companyId: string, role: UserRole) {
  assertPermission(role, "tasks:manage");
  try {
    return await taskRepo.listForCompany(companyId);
  } catch (error) {
    if (isSchemaMissingError(error)) {
      console.error("Tasks tables missing — run: npx prisma db push");
      return [];
    }
    throw error;
  }
}

export async function listMyTasks(
  companyId: string,
  userId: string,
  role: UserRole
) {
  assertPermission(role, "tasks:view_own");
  const employee = await prisma.employee.findFirst({
    where: { companyId, userId },
  });
  if (!employee) return [];
  try {
    return await taskRepo.listForEmployee(companyId, employee.id);
  } catch (error) {
    if (isSchemaMissingError(error)) {
      console.error("Tasks tables missing — run: npx prisma db push");
      return [];
    }
    throw error;
  }
}

export async function createTask(
  actor: { id: string; companyId: string; role: UserRole },
  input: {
    title: string;
    description?: string;
    dueDate?: string;
    priority?: string;
    workType?: string;
    boardStatus?: string;
    assignAll?: boolean;
    employeeIds?: string[];
  }
) {
  assertPermission(actor.role, "tasks:manage");

  const title = input.title.trim();
  if (title.length < 2) throw new ValidationError("Task title is required");

  const priority = (input.priority || "MEDIUM").toUpperCase() as TaskPriority;
  if (!PRIORITIES.has(priority)) throw new ValidationError("Invalid priority");

  const workType = (input.workType || "WORK").toUpperCase() as TaskWorkType;
  if (!WORK_TYPES.has(workType)) throw new ValidationError("Invalid work type");

  const boardStatus = (
    input.boardStatus || "TODO"
  ).toUpperCase() as TaskAssigneeStatus;
  if (!ASSIGNEE_STATUSES.has(boardStatus)) {
    throw new ValidationError("Invalid board status");
  }

  let dueDate: Date | null = null;
  if (input.dueDate) {
    dueDate = startOfDayUTC(new Date(input.dueDate));
    if (Number.isNaN(dueDate.getTime())) {
      throw new ValidationError("Invalid due date");
    }
  }

  const assigneeIds = await resolveAssigneeIds(actor.companyId, {
    assignAll: input.assignAll,
    employeeIds: input.employeeIds,
  });

  let task;
  try {
    task = await taskRepo.create({
      companyId: actor.companyId,
      title,
      description: input.description?.trim() || null,
      dueDate,
      priority,
      workType,
      boardStatus,
      createdById: actor.id,
      assigneeEmployeeIds: assigneeIds,
    });
  } catch (error) {
    if (isSchemaMissingError(error)) {
      throw new ValidationError(
        "Tasks are not set up yet. Run `npx prisma db push` then try again."
      );
    }
    throw error;
  }

  await activityRepo.log(actor.companyId, "task.created", actor.id, {
    taskId: task.id,
    assignees: assigneeIds.length,
  });

  const dueLabel = dueDate ? ` Due ${formatDate(dueDate)}.` : "";
  await Promise.all(
    task.assignees.map((a) =>
      notifyUser({
        companyId: actor.companyId,
        userId: a.employee.userId,
        title: "New task assigned",
        message: `${title}.${dueLabel}`,
        channels: ["in_app", "email", "push"],
      })
    )
  );

  return task;
}

export async function updateTaskBoardStatus(
  actor: { id: string; companyId: string; role: UserRole },
  taskId: string,
  boardStatusRaw: string
) {
  assertPermission(actor.role, "tasks:manage");
  const boardStatus = boardStatusRaw.toUpperCase() as TaskAssigneeStatus;
  if (!ASSIGNEE_STATUSES.has(boardStatus)) {
    throw new ValidationError("Invalid board status");
  }

  const existing = await taskRepo.findById(actor.companyId, taskId);
  if (!existing) throw new NotFoundError("Task not found");

  await taskRepo.updateBoardStatus(actor.companyId, taskId, boardStatus);
  await activityRepo.log(actor.companyId, "task.board_moved", actor.id, {
    taskId,
    boardStatus,
  });
  await notifyWorkspaceTaskChanged(actor.companyId, taskId);

  return { success: true as const };
}

export async function updateMyTaskStatus(
  actor: { id: string; companyId: string; role: UserRole },
  input: {
    assigneeId: string;
    status: string;
    note?: string;
  }
) {
  assertPermission(actor.role, "tasks:view_own");

  const employee = await prisma.employee.findFirst({
    where: { companyId: actor.companyId, userId: actor.id },
  });
  if (!employee) throw new NotFoundError("Employee profile not found");

  const status = input.status.toUpperCase() as TaskAssigneeStatus;
  if (!ASSIGNEE_STATUSES.has(status)) {
    throw new ValidationError("Invalid status");
  }

  const row = await prisma.taskAssignee.findFirst({
    where: {
      id: input.assigneeId,
      employeeId: employee.id,
      task: { companyId: actor.companyId },
    },
    include: { task: true },
  });
  if (!row) throw new NotFoundError("Task not found");

  await taskRepo.updateAssigneeStatus(
    actor.companyId,
    input.assigneeId,
    employee.id,
    status,
    input.note?.trim() || null
  );

  await activityRepo.log(actor.companyId, "task.status_updated", actor.id, {
    taskId: row.taskId,
    status,
  });
  await notifyWorkspaceTaskChanged(actor.companyId, row.taskId);

  return { success: true as const };
}

export async function deleteTask(
  actor: { id: string; companyId: string; role: UserRole },
  taskId: string
) {
  assertPermission(actor.role, "tasks:manage");
  const existing = await taskRepo.findById(actor.companyId, taskId);
  if (!existing) throw new NotFoundError("Task not found");

  await taskRepo.delete(actor.companyId, taskId);
  await activityRepo.log(actor.companyId, "task.deleted", actor.id, { taskId });
}
