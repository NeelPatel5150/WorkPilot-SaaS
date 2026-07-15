import { z } from "zod";
import { hasScope, type McpScopeId } from "@/features/mcp/scopes";
import type { McpActor } from "@/features/mcp/tokens";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { startOfDayUTC } from "@/lib/utils";
import {
  getEmployeeOrThrow,
  listEmployeeLeaveBalances,
} from "@/services/employee.service";
import { employeeRepo } from "@/repositories/employee.repository";
import { departmentRepo } from "@/repositories/department.repository";
import {
  adminAdjustAttendance,
  getEmployeeMonthTimesheet,
  listCompanyAttendance,
  listTodayAttendance,
} from "@/services/attendance.service";
import {
  decideLeave,
  listCompanyLeaves,
  listLeaveTypes,
} from "@/services/leave.service";
import {
  decideException,
  listPendingExceptions,
} from "@/services/exception.service";
import {
  createTask,
  deleteTask,
  listCompanyTasks,
  updateTaskBoardStatus,
} from "@/services/task.service";
import { listProjects } from "@/services/project.service";
import { projectRepo } from "@/repositories/project.repository";
import { taskRepo } from "@/repositories/task.repository";
import {
  generateMonthPayroll,
  listSalarySlipsForCompany,
  publishSalarySlip,
} from "@/services/payroll.service";
import {
  createAnnouncement,
  createHoliday,
  importHolidays,
  listAnnouncements,
  listHolidays,
} from "@/services/holiday.service";
import { listDocuments } from "@/services/document.service";
import { buildReportRows } from "@/services/report.service";
import { createOfferLetter, listOfferLetters } from "@/services/letter.service";
import { prisma } from "@/lib/prisma";
import { activityRepo } from "@/repositories/activity.repository";
import { assertPermission } from "@/lib/session";
import type { TaskAssigneeStatus, TaskPriority } from "@/generated/prisma";
import {
  confirmJsonProps,
  dryRunResult,
  gateWrite,
} from "@/features/mcp/helpers";
import { MCP_TOOLS_EXTENDED } from "@/features/mcp/tools-extended";
import { recordMcpUsage } from "@/features/mcp/usage";

type JsonSchema = Record<string, unknown>;

type ToolDef = {
  name: string;
  description: string;
  scopes: McpScopeId[];
  inputSchema: z.ZodType;
  jsonSchema: JsonSchema;
  handler: (actor: McpActor, args: unknown) => Promise<unknown>;
};

function requireScopes(actor: McpActor, scopes: McpScopeId[]) {
  if (!hasScope(actor.scopes, scopes)) {
    throw new ForbiddenError(
      `Missing scope(s): ${scopes.filter((s) => !actor.scopes.includes(s)).join(", ")}`
    );
  }
}

function actorCtx(actor: McpActor) {
  return {
    id: actor.userId,
    companyId: actor.companyId,
    role: actor.role,
  };
}

const emptyObject: JsonSchema = {
  type: "object",
  properties: {},
  additionalProperties: false,
};

/** Accept {} / null / [] / missing — clients disagree on empty tool args. */
const emptyInput = z.preprocess(
  (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {}),
  z.object({}).passthrough()
);

function asToolArgs(args: unknown): Record<string, unknown> {
  if (args && typeof args === "object" && !Array.isArray(args)) {
    return args as Record<string, unknown>;
  }
  return {};
}

/** LLM clients often send numbers/enums as strings. */
const mcpInt = z.coerce.number().int();
const mcpNum = z.coerce.number();
const mcpBool = z.preprocess((v) => {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["true", "1", "yes"].includes(s)) return true;
    if (["false", "0", "no"].includes(s)) return false;
  }
  return v;
}, z.boolean());

function upperEnum<const T extends [string, ...string[]]>(values: T) {
  return z.preprocess(
    (v) => (typeof v === "string" ? v.trim().toUpperCase() : v),
    z.enum(values)
  );
}

function lowerEnum<const T extends [string, ...string[]]>(values: T) {
  return z.preprocess(
    (v) => (typeof v === "string" ? v.trim().toLowerCase() : v),
    z.enum(values)
  );
}

const BOARD = upperEnum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]);
const PRIORITY = upperEnum(["LOW", "MEDIUM", "HIGH"]);
const DECISION = upperEnum(["APPROVED", "REJECTED"]);
const LEAVE_STATUS = upperEnum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
]);
const REPORT_KIND = lowerEnum(["attendance", "leave", "employees", "late"]);
const LETTER_TYPE = upperEnum(["OFFER", "APPOINTMENT"]);

function isoOrNull(value: Date | string | null | undefined) {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export const MCP_TOOLS: ToolDef[] = [
  {
    name: "get_ops_digest",
    description:
      "Admin dashboard snapshot: late/absent today, pending approvals, open tasks.",
    scopes: ["ops:digest"],
    inputSchema: emptyInput,
    jsonSchema: emptyObject,
    async handler(actor) {
      requireScopes(actor, ["ops:digest"]);
      const [today, leaves, exceptions, tasks] = await Promise.all([
        listTodayAttendance(actor.companyId, actor.role, actor.userId).catch(
          () => []
        ),
        listCompanyLeaves(actor.companyId, actor.role, actor.userId).catch(
          () => []
        ),
        listPendingExceptions(actor.companyId, actor.role).catch(() => []),
        listCompanyTasks(actor.companyId, actor.role).catch(() => []),
      ]);

      const late = today.filter((r) => r.status === "LATE" || r.isLate);
      const present = today.filter(
        (r) => r.status === "PRESENT" || r.status === "LATE"
      );
      const pendingLeaves = leaves.filter((l) => l.status === "PENDING");
      const openTasks = tasks.filter((t) => t.boardStatus !== "DONE");

      return {
        date: new Date().toISOString().slice(0, 10),
        attendance: {
          punchedIn: present.length,
          late: late.map((r) => ({
            employeeId: r.employeeId,
            name: r.employee
              ? `${r.employee.firstName} ${r.employee.lastName}`
              : null,
            checkIn: r.checkIn,
          })),
        },
        approvals: {
          pendingLeaves: pendingLeaves.length,
          pendingExceptions: exceptions.length,
        },
        workspace: {
          openTasks: openTasks.length,
          byStatus: {
            TODO: openTasks.filter((t) => t.boardStatus === "TODO").length,
            IN_PROGRESS: openTasks.filter((t) => t.boardStatus === "IN_PROGRESS")
              .length,
            IN_REVIEW: openTasks.filter((t) => t.boardStatus === "IN_REVIEW")
              .length,
          },
        },
      };
    },
  },
  {
    name: "get_company_info",
    description: "Get company branding, timezone, and work policy.",
    scopes: ["company:read"],
    inputSchema: emptyInput,
    jsonSchema: emptyObject,
    async handler(actor) {
      requireScopes(actor, ["company:read"]);
      return prisma.company.findUniqueOrThrow({
        where: { id: actor.companyId },
        select: {
          name: true,
          slug: true,
          address: true,
          primaryColor: true,
          secondaryColor: true,
          timezone: true,
          workStartHour: true,
          workStartMinute: true,
          graceMinutes: true,
          standardHours: true,
          weeklyOffs: true,
        },
      });
    },
  },
  {
    name: "list_departments",
    description: "List company departments.",
    scopes: ["departments:read"],
    inputSchema: emptyInput,
    jsonSchema: emptyObject,
    async handler(actor) {
      requireScopes(actor, ["departments:read"]);
      // Scope-gated; skip web RBAC — MCP token already requires admin role.
      const rows = await departmentRepo.list(actor.companyId);
      return rows.map((d) => ({
        id: d.id,
        name: d.name,
        employeeCount: d._count?.employees ?? 0,
      }));
    },
  },
  {
    name: "list_employees",
    description: "List employees (id, name, code, department, role).",
    scopes: ["employees:read"],
    inputSchema: emptyInput,
    jsonSchema: emptyObject,
    async handler(actor) {
      requireScopes(actor, ["employees:read"]);
      // Scope-gated; skip web RBAC — MCP token already requires admin role.
      const rows = await employeeRepo.list(actor.companyId);
      return rows.map((e) => ({
        id: e.id,
        employeeCode: e.employeeCode,
        firstName: e.firstName,
        lastName: e.lastName,
        email: e.user?.email ?? null,
        role: e.user?.role ?? null,
        department: e.department?.name ?? null,
        designation: e.designation,
        employmentStatus: e.employmentStatus,
        onboardingDone: e.onboardingDone,
      }));
    },
  },
  {
    name: "get_employee_detail",
    description:
      "One employee: profile, manager, leave balances (no salary figures).",
    scopes: ["employees:detail"],
    inputSchema: z.object({
      employeeId: z.string().min(1),
      year: mcpInt.optional(),
    }),
    jsonSchema: {
      type: "object",
      properties: {
        employeeId: { type: "string" },
        year: { type: "number" },
      },
      required: ["employeeId"],
      additionalProperties: false,
    },
    async handler(actor, args) {
      requireScopes(actor, ["employees:detail"]);
      const { employeeId, year } = args as {
        employeeId: string;
        year?: number;
      };
      const e = await getEmployeeOrThrow(actor.companyId, employeeId);
      const balances = await listEmployeeLeaveBalances(
        actor.companyId,
        actor.role,
        employeeId,
        year
      );
      return {
        id: e.id,
        employeeCode: e.employeeCode,
        firstName: e.firstName,
        lastName: e.lastName,
        email: e.user?.email ?? null,
        role: e.user?.role ?? null,
        phone: e.phone,
        designation: e.designation,
        department: e.department?.name ?? null,
        manager: e.manager
          ? `${e.manager.firstName} ${e.manager.lastName}`
          : null,
        employmentStatus: e.employmentStatus,
        onboardingDone: e.onboardingDone,
        joiningDate: isoOrNull(e.joiningDate),
        leaveBalances: balances,
      };
    },
  },
  {
    name: "list_lifecycle_status",
    description:
      "Employees incomplete onboarding, on notice, resigned, or terminated.",
    scopes: ["employees:lifecycle"],
    inputSchema: emptyInput,
    jsonSchema: emptyObject,
    async handler(actor) {
      requireScopes(actor, ["employees:lifecycle"]);
      const rows = await employeeRepo.list(actor.companyId);
      return {
        onboardingIncomplete: rows
          .filter(
            (e) =>
              !e.onboardingDone &&
              (e.employmentStatus === "ACTIVE" ||
                e.employmentStatus === "ON_NOTICE")
          )
          .map((e) => ({
            id: e.id,
            name: `${e.firstName} ${e.lastName}`,
            code: e.employeeCode,
            status: e.employmentStatus,
          })),
        onNotice: rows
          .filter((e) => e.employmentStatus === "ON_NOTICE")
          .map((e) => ({
            id: e.id,
            name: `${e.firstName} ${e.lastName}`,
            code: e.employeeCode,
          })),
        exited: rows
          .filter((e) =>
            ["RESIGNED", "TERMINATED"].includes(e.employmentStatus)
          )
          .map((e) => ({
            id: e.id,
            name: `${e.firstName} ${e.lastName}`,
            code: e.employeeCode,
            status: e.employmentStatus,
          })),
      };
    },
  },
  {
    name: "list_today_attendance",
    description: "List today's attendance punches.",
    scopes: ["attendance:read"],
    inputSchema: emptyInput,
    jsonSchema: emptyObject,
    async handler(actor) {
      requireScopes(actor, ["attendance:read"]);
      const rows = await listTodayAttendance(
        actor.companyId,
        actor.role,
        actor.userId
      );
      return rows.map((r) => ({
        id: r.id,
        employeeId: r.employeeId,
        employee: r.employee
          ? `${r.employee.firstName} ${r.employee.lastName}`
          : null,
        date: isoOrNull(r.date),
        checkIn: isoOrNull(r.checkIn),
        checkOut: isoOrNull(r.checkOut),
        status: r.status,
        isLate: r.isLate,
      }));
    },
  },
  {
    name: "list_recent_attendance",
    description: "List recent company attendance.",
    scopes: ["attendance:read"],
    inputSchema: emptyInput,
    jsonSchema: emptyObject,
    async handler(actor) {
      requireScopes(actor, ["attendance:read"]);
      const rows = await listCompanyAttendance(
        actor.companyId,
        actor.role,
        actor.userId
      );
      return rows.slice(0, 100).map((r) => ({
        id: r.id,
        employeeId: r.employeeId,
        employee: r.employee
          ? `${r.employee.firstName} ${r.employee.lastName}`
          : null,
        date: isoOrNull(r.date),
        checkIn: isoOrNull(r.checkIn),
        checkOut: isoOrNull(r.checkOut),
        status: r.status,
      }));
    },
  },
  {
    name: "get_employee_timesheet",
    description: "Month timesheet for one employee (summary + daily punches, no salary).",
    scopes: ["attendance:read"],
    inputSchema: z.object({
      employeeId: z.string().min(1),
      year: mcpInt,
      month: mcpInt.min(1).max(12),
    }),
    jsonSchema: {
      type: "object",
      properties: {
        employeeId: { type: "string" },
        year: { type: "number" },
        month: { type: "number" },
      },
      required: ["employeeId", "year", "month"],
      additionalProperties: false,
    },
    async handler(actor, args) {
      requireScopes(actor, ["attendance:read"]);
      const { employeeId, year, month } = args as {
        employeeId: string;
        year: number;
        month: number;
      };
      const sheet = await getEmployeeMonthTimesheet(
        actor.companyId,
        actor.role,
        employeeId,
        year,
        month,
        actor.userId
      );
      // Never return raw Prisma employee (salary / avatar Bytes).
      return {
        employee: {
          id: sheet.employee.id,
          employeeCode: sheet.employee.employeeCode,
          name: `${sheet.employee.firstName} ${sheet.employee.lastName}`,
          department: sheet.employee.department?.name ?? null,
        },
        year: sheet.year,
        month: sheet.month,
        summary: sheet.summary,
        days: sheet.days.map((d) => ({
          date: isoOrNull(d.date),
          weekday: d.weekday,
          checkIn: isoOrNull(d.checkIn),
          checkOut: isoOrNull(d.checkOut),
          workingHours: d.workingHours,
          overtimeHours: d.overtimeHours,
          status: d.status,
          isLate: d.isLate,
          isEarlyExit: d.isEarlyExit,
        })),
      };
    },
  },
  {
    name: "adjust_attendance",
    description: "Admin set/fix check-in and optional check-out for a day.",
    scopes: ["attendance:write"],
    inputSchema: z.object({
      employeeId: z.string().min(1),
      date: z.string().min(1),
      checkIn: z.string().min(1),
      checkOut: z.string().optional(),
      dryRun: mcpBool.optional(),
    }),
    jsonSchema: {
      type: "object",
      properties: {
        employeeId: { type: "string" },
        date: { type: "string", description: "YYYY-MM-DD" },
        checkIn: { type: "string", description: "ISO datetime" },
        checkOut: { type: "string", description: "ISO datetime" },
        dryRun: {
          type: "boolean",
          description: "If true, preview without saving.",
        },
      },
      required: ["employeeId", "date", "checkIn"],
      additionalProperties: false,
    },
    async handler(actor, args) {
      requireScopes(actor, ["attendance:write"]);
      const input = args as {
        employeeId: string;
        date: string;
        checkIn: string;
        checkOut?: string;
        dryRun?: boolean;
      };
      if (input.dryRun === true) {
        return dryRunResult("adjust_attendance", {
          employeeId: input.employeeId,
          date: input.date,
          checkIn: input.checkIn,
          checkOut: input.checkOut ?? null,
        });
      }
      const date = startOfDayUTC(new Date(input.date));
      const checkIn = new Date(input.checkIn);
      const checkOut = input.checkOut ? new Date(input.checkOut) : null;
      if (Number.isNaN(date.getTime())) {
        throw new ValidationError("Invalid date (use YYYY-MM-DD)");
      }
      if (Number.isNaN(checkIn.getTime())) {
        throw new ValidationError("Invalid checkIn datetime");
      }
      if (checkOut && Number.isNaN(checkOut.getTime())) {
        throw new ValidationError("Invalid checkOut datetime");
      }
      await adminAdjustAttendance(actorCtx(actor), {
        employeeId: input.employeeId,
        date,
        checkIn,
        checkOut,
      });
      await activityRepo.log(actor.companyId, "mcp.adjust_attendance", actor.userId, {
        tokenId: actor.tokenId,
        employeeId: input.employeeId,
        date: input.date,
      });
      return { success: true };
    },
  },
  {
    name: "list_leave_types",
    description: "List configured leave types.",
    scopes: ["leaves:read"],
    inputSchema: emptyInput,
    jsonSchema: emptyObject,
    async handler(actor) {
      requireScopes(actor, ["leaves:read"]);
      const rows = await listLeaveTypes(actor.companyId);
      return rows.map((t) => ({
        id: t.id,
        name: t.name,
        code: t.code,
        defaultDays: t.defaultDays,
        requiresProof: t.requiresProof,
        carryForward: t.carryForward,
        isApplicable: t.isApplicable,
      }));
    },
  },
  {
    name: "list_leave_requests",
    description: "List leave requests (optional status filter).",
    scopes: ["leaves:read"],
    inputSchema: z.object({
      status: LEAVE_STATUS.optional(),
    }),
    jsonSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"],
        },
      },
      additionalProperties: false,
    },
    async handler(actor, args) {
      requireScopes(actor, ["leaves:read"]);
      const { status } = args as { status?: string };
      const rows = await listCompanyLeaves(
        actor.companyId,
        actor.role,
        actor.userId
      );
      const filtered = status ? rows.filter((r) => r.status === status) : rows;
      return filtered.slice(0, 100).map((r) => ({
        id: r.id,
        status: r.status,
        startDate: isoOrNull(r.startDate),
        endDate: isoOrNull(r.endDate),
        isHalfDay: r.isHalfDay,
        leaveType: r.leaveType?.name,
        employee: `${r.employee.firstName} ${r.employee.lastName}`,
        employeeId: r.employeeId,
        reason: r.reason,
      }));
    },
  },
  {
    name: "list_pending_approvals",
    description: "Pending leave + attendance exceptions.",
    scopes: ["approvals:read"],
    inputSchema: emptyInput,
    jsonSchema: emptyObject,
    async handler(actor) {
      requireScopes(actor, ["approvals:read"]);
      const [leaves, exceptions] = await Promise.all([
        listCompanyLeaves(actor.companyId, actor.role, actor.userId),
        listPendingExceptions(actor.companyId, actor.role),
      ]);
      return {
        leaves: leaves
          .filter((l) => l.status === "PENDING")
          .map((r) => ({
            id: r.id,
            employee: `${r.employee.firstName} ${r.employee.lastName}`,
            leaveType: r.leaveType?.name,
            startDate: r.startDate,
            endDate: r.endDate,
            isHalfDay: r.isHalfDay,
          })),
        exceptions: exceptions.map((e) => ({
          id: e.id,
          type: e.type,
          date: e.date,
          employee: `${e.employee.firstName} ${e.employee.lastName}`,
          reason: e.reason,
        })),
      };
    },
  },
  {
    name: "decide_leave",
    description:
      "Approve or reject a leave request. Ask the human to reply “confirm” in chat, then call with confirm: true (or dryRun: true to preview).",
    scopes: ["approvals:write"],
    inputSchema: z.object({
      requestId: z.string().min(1),
      decision: DECISION,
      comment: z.string().optional(),
      dryRun: mcpBool.optional(),
      confirm: mcpBool.optional(),
    }),
    jsonSchema: {
      type: "object",
      properties: {
        requestId: { type: "string" },
        decision: { type: "string", enum: ["APPROVED", "REJECTED"] },
        comment: { type: "string" },
        ...confirmJsonProps,
      },
      required: ["requestId", "decision"],
      additionalProperties: false,
    },
    async handler(actor, args) {
      requireScopes(actor, ["approvals:write"]);
      const input = args as {
        requestId: string;
        decision: "APPROVED" | "REJECTED";
        comment?: string;
        dryRun?: boolean;
        confirm?: boolean;
      };
      const gate = gateWrite(input, "decide leave");
      if (gate === "dryRun") {
        return dryRunResult("decide_leave", {
          requestId: input.requestId,
          decision: input.decision,
          comment: input.comment ?? null,
        });
      }
      await decideLeave(actorCtx(actor), input.requestId, input.decision, input.comment);
      return { success: true };
    },
  },
  {
    name: "decide_exception",
    description:
      "Approve or reject an attendance exception. Requires confirm: true after the human says “confirm” in chat (or dryRun: true to preview).",
    scopes: ["approvals:write"],
    inputSchema: z.object({
      exceptionId: z.string().min(1),
      decision: DECISION,
      comment: z.string().optional(),
      dryRun: mcpBool.optional(),
      confirm: mcpBool.optional(),
    }),
    jsonSchema: {
      type: "object",
      properties: {
        exceptionId: { type: "string" },
        decision: { type: "string", enum: ["APPROVED", "REJECTED"] },
        comment: { type: "string" },
        ...confirmJsonProps,
      },
      required: ["exceptionId", "decision"],
      additionalProperties: false,
    },
    async handler(actor, args) {
      requireScopes(actor, ["approvals:write"]);
      const input = args as {
        exceptionId: string;
        decision: "APPROVED" | "REJECTED";
        comment?: string;
        dryRun?: boolean;
        confirm?: boolean;
      };
      const gate = gateWrite(input, "decide exception");
      if (gate === "dryRun") {
        return dryRunResult("decide_exception", {
          exceptionId: input.exceptionId,
          decision: input.decision,
          comment: input.comment ?? null,
        });
      }
      await decideException(
        actorCtx(actor),
        input.exceptionId,
        input.decision,
        input.comment
      );
      return { success: true };
    },
  },
  {
    name: "post_announcement",
    description: "Create and publish a company announcement.",
    scopes: ["announcements:write"],
    inputSchema: z.object({
      title: z.string().min(1),
      body: z.string().min(1),
    }),
    jsonSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        body: { type: "string" },
      },
      required: ["title", "body"],
      additionalProperties: false,
    },
    async handler(actor, args) {
      requireScopes(actor, ["announcements:write"]);
      const { title, body } = args as { title: string; body: string };
      const row = await createAnnouncement(actorCtx(actor), title, body);
      return { id: row.id, title: row.title };
    },
  },
  {
    name: "list_holidays",
    description: "List company holidays.",
    scopes: ["holidays:read"],
    inputSchema: emptyInput,
    jsonSchema: emptyObject,
    async handler(actor) {
      requireScopes(actor, ["holidays:read"]);
      const rows = await listHolidays(actor.companyId);
      return rows.map((h) => ({
        id: h.id,
        name: h.name,
        date: isoOrNull(h.date),
      }));
    },
  },
  {
    name: "list_announcements",
    description: "List company announcements.",
    scopes: ["holidays:read"],
    inputSchema: emptyInput,
    jsonSchema: emptyObject,
    async handler(actor) {
      requireScopes(actor, ["holidays:read"]);
      const rows = await listAnnouncements(actor.companyId);
      return rows.slice(0, 100).map((a) => ({
        id: a.id,
        title: a.title,
        body: a.body,
        createdAt: isoOrNull(a.createdAt),
      }));
    },
  },
  {
    name: "create_holiday",
    description: "Add one company holiday.",
    scopes: ["holidays:write"],
    inputSchema: z.object({
      name: z.string().min(1),
      date: z.string().min(1),
    }),
    jsonSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        date: { type: "string", description: "YYYY-MM-DD" },
      },
      required: ["name", "date"],
      additionalProperties: false,
    },
    async handler(actor, args) {
      requireScopes(actor, ["holidays:write"]);
      const { name, date } = args as { name: string; date: string };
      const row = await createHoliday(actorCtx(actor), name, date);
      return { id: row.id, name: row.name, date: isoOrNull(row.date) };
    },
  },
  {
    name: "import_holidays",
    description: "Bulk import holidays [{ name, date }].",
    scopes: ["holidays:write"],
    inputSchema: z.object({
      rows: z.array(
        z.object({ name: z.string(), date: z.string() })
      ),
    }),
    jsonSchema: {
      type: "object",
      properties: {
        rows: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              date: { type: "string" },
            },
            required: ["name", "date"],
          },
        },
      },
      required: ["rows"],
      additionalProperties: false,
    },
    async handler(actor, args) {
      requireScopes(actor, ["holidays:write"]);
      const { rows } = args as { rows: { name: string; date: string }[] };
      return importHolidays(actorCtx(actor), rows);
    },
  },
  {
    name: "list_documents",
    description: "List company documents (metadata only).",
    scopes: ["documents:read"],
    inputSchema: emptyInput,
    jsonSchema: emptyObject,
    async handler(actor) {
      requireScopes(actor, ["documents:read"]);
      const rows = await listDocuments({
        companyId: actor.companyId,
        role: actor.role,
      });
      return rows.slice(0, 200).map((d) => ({
        id: d.id,
        name: d.name,
        employeeId: d.employeeId,
        expiresAt: isoOrNull(d.expiresAt),
        createdAt: isoOrNull(d.createdAt),
      }));
    },
  },
  {
    name: "list_expiring_documents",
    description: "Documents expiring within N days (default 30).",
    scopes: ["documents:read"],
    inputSchema: z.object({
      withinDays: mcpInt.min(1).max(365).optional(),
    }),
    jsonSchema: {
      type: "object",
      properties: { withinDays: { type: "number" } },
      additionalProperties: false,
    },
    async handler(actor, args) {
      requireScopes(actor, ["documents:read"]);
      const withinDays = (args as { withinDays?: number }).withinDays ?? 30;
      const rows = await listDocuments({
        companyId: actor.companyId,
        role: actor.role,
      });
      const now = Date.now();
      const end = now + withinDays * 24 * 60 * 60 * 1000;
      return rows
        .filter((d) => {
          if (!d.expiresAt) return false;
          const t = new Date(d.expiresAt).getTime();
          return t >= now && t <= end;
        })
        .slice(0, 200)
        .map((d) => ({
          id: d.id,
          name: d.name,
          employeeId: d.employeeId,
          expiresAt: isoOrNull(d.expiresAt),
        }));
    },
  },
  {
    name: "list_tasks",
    description: "List workspace board tasks.",
    scopes: ["tasks:read"],
    inputSchema: emptyInput,
    jsonSchema: emptyObject,
    async handler(actor) {
      requireScopes(actor, ["tasks:read"]);
      const rows = await listCompanyTasks(actor.companyId, actor.role);
      return rows.slice(0, 200).map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        dueDate: isoOrNull(t.dueDate),
        priority: t.priority,
        boardStatus: t.boardStatus,
        assignees: t.assignees?.map((a) => ({
          employeeId: a.employeeId,
          name: `${a.employee.firstName} ${a.employee.lastName}`,
          status: a.status,
        })),
      }));
    },
  },
  {
    name: "create_task",
    description:
      "Create a task. Assignees optional: employeeIds, assignAll=true, or omit for unassigned.",
    scopes: ["tasks:write"],
    inputSchema: z.object({
      title: z.string().min(2),
      description: z.string().optional(),
      dueDate: z.string().optional(),
      priority: PRIORITY.optional(),
      boardStatus: BOARD.optional(),
      employeeIds: z.array(z.string()).optional(),
      assignAll: mcpBool.optional(),
    }),
    jsonSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        dueDate: { type: "string" },
        priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
        boardStatus: {
          type: "string",
          enum: ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"],
        },
        employeeIds: { type: "array", items: { type: "string" } },
        assignAll: { type: "boolean" },
      },
      required: ["title"],
      additionalProperties: false,
    },
    async handler(actor, args) {
      requireScopes(actor, ["tasks:write"]);
      const task = await createTask(actorCtx(actor), args as never);
      return { id: task.id, title: task.title, boardStatus: task.boardStatus };
    },
  },
  {
    name: "update_task_status",
    description: "Move a task on the board.",
    scopes: ["tasks:write"],
    inputSchema: z.object({
      taskId: z.string().min(1),
      boardStatus: BOARD,
    }),
    jsonSchema: {
      type: "object",
      properties: {
        taskId: { type: "string" },
        boardStatus: {
          type: "string",
          enum: ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"],
        },
      },
      required: ["taskId", "boardStatus"],
      additionalProperties: false,
    },
    async handler(actor, args) {
      requireScopes(actor, ["tasks:write"]);
      const input = args as { taskId: string; boardStatus: string };
      await updateTaskBoardStatus(actorCtx(actor), input.taskId, input.boardStatus);
      return { success: true };
    },
  },
  {
    name: "update_task",
    description: "Edit task title, description, due date, or priority.",
    scopes: ["tasks:write"],
    inputSchema: z.object({
      taskId: z.string().min(1),
      title: z.string().min(2).optional(),
      description: z.string().nullable().optional(),
      dueDate: z.string().nullable().optional(),
      priority: PRIORITY.optional(),
    }),
    jsonSchema: {
      type: "object",
      properties: {
        taskId: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
        dueDate: { type: "string" },
        priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
      },
      required: ["taskId"],
      additionalProperties: false,
    },
    async handler(actor, args) {
      requireScopes(actor, ["tasks:write"]);
      assertPermission(actor.role, "tasks:manage");
      const input = args as {
        taskId: string;
        title?: string;
        description?: string | null;
        dueDate?: string | null;
        priority?: TaskPriority;
      };
      const existing = await taskRepo.findById(actor.companyId, input.taskId);
      if (!existing) throw new NotFoundError("Task not found");

      let dueDate: Date | null | undefined = undefined;
      if (input.dueDate === null) dueDate = null;
      else if (typeof input.dueDate === "string") {
        dueDate = startOfDayUTC(new Date(input.dueDate));
        if (Number.isNaN(dueDate.getTime())) {
          throw new ValidationError("Invalid due date");
        }
      }

      await prisma.task.update({
        where: { id: input.taskId },
        data: {
          ...(input.title !== undefined ? { title: input.title.trim() } : {}),
          ...(input.description !== undefined
            ? { description: input.description?.trim() || null }
            : {}),
          ...(dueDate !== undefined ? { dueDate } : {}),
          ...(input.priority !== undefined ? { priority: input.priority } : {}),
        },
      });
      return { success: true };
    },
  },
  {
    name: "set_task_assignees",
    description: "Replace task assignees with the given employee IDs.",
    scopes: ["tasks:write"],
    inputSchema: z.object({
      taskId: z.string().min(1),
      employeeIds: z.array(z.string()),
    }),
    jsonSchema: {
      type: "object",
      properties: {
        taskId: { type: "string" },
        employeeIds: { type: "array", items: { type: "string" } },
      },
      required: ["taskId", "employeeIds"],
      additionalProperties: false,
    },
    async handler(actor, args) {
      requireScopes(actor, ["tasks:write"]);
      assertPermission(actor.role, "tasks:manage");
      const { taskId, employeeIds } = args as {
        taskId: string;
        employeeIds: string[];
      };
      const existing = await taskRepo.findById(actor.companyId, taskId);
      if (!existing) throw new NotFoundError("Task not found");

      const unique = [...new Set(employeeIds)];
      if (unique.length) {
        const found = await prisma.employee.findMany({
          where: { companyId: actor.companyId, id: { in: unique } },
          select: { id: true },
        });
        if (found.length !== unique.length) {
          throw new ValidationError("One or more employee IDs are invalid");
        }
      }

      await prisma.$transaction(async (tx) => {
        await tx.taskAssignee.deleteMany({ where: { taskId } });
        if (unique.length) {
          await tx.taskAssignee.createMany({
            data: unique.map((employeeId) => ({
              taskId,
              employeeId,
              status: existing.boardStatus as TaskAssigneeStatus,
            })),
          });
        }
      });

      await activityRepo.log(actor.companyId, "mcp.set_task_assignees", actor.userId, {
        tokenId: actor.tokenId,
        taskId,
        employeeIds: unique,
      });
      return { success: true, assigneeCount: unique.length };
    },
  },
  {
    name: "delete_task",
    description: "Delete a workspace task.",
    scopes: ["tasks:write"],
    inputSchema: z.object({ taskId: z.string().min(1) }),
    jsonSchema: {
      type: "object",
      properties: { taskId: { type: "string" } },
      required: ["taskId"],
      additionalProperties: false,
    },
    async handler(actor, args) {
      requireScopes(actor, ["tasks:write"]);
      const { taskId } = args as { taskId: string };
      await deleteTask(actorCtx(actor), taskId);
      return { success: true };
    },
  },
  {
    name: "list_projects",
    description: "List projects (names/descriptions only).",
    scopes: ["projects:read"],
    inputSchema: emptyInput,
    jsonSchema: emptyObject,
    async handler(actor) {
      requireScopes(actor, ["projects:read"]);
      const rows = await listProjects(actor.companyId, actor.role);
      return rows.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        credentialCount: p.credentials?.length ?? 0,
        shareCount: p.shares?.length ?? 0,
      }));
    },
  },
  {
    name: "get_project_credentials",
    description: "Read project vault credentials (sensitive).",
    scopes: ["projects:secrets"],
    inputSchema: z.object({ projectId: z.string().min(1) }),
    jsonSchema: {
      type: "object",
      properties: { projectId: { type: "string" } },
      required: ["projectId"],
      additionalProperties: false,
    },
    async handler(actor, args) {
      requireScopes(actor, ["projects:secrets"]);
      const { projectId } = args as { projectId: string };
      const project = await projectRepo.findById(actor.companyId, projectId);
      if (!project) throw new NotFoundError("Project not found");
      await activityRepo.log(
        actor.companyId,
        "mcp.project_credentials_read",
        actor.userId,
        { tokenId: actor.tokenId, projectId }
      );
      return {
        id: project.id,
        name: project.name,
        credentials: (project.credentials ?? []).map((c) => ({
          key: c.key,
          value: c.value,
        })),
      };
    },
  },
  {
    name: "list_payslips",
    description: "List salary slip summaries for a year/month.",
    scopes: ["payroll:read"],
    inputSchema: z.object({
      year: mcpInt.optional(),
      month: mcpInt.min(1).max(12).optional(),
    }),
    jsonSchema: {
      type: "object",
      properties: {
        year: { type: "number" },
        month: { type: "number" },
      },
      additionalProperties: false,
    },
    async handler(actor, args) {
      requireScopes(actor, ["payroll:read"]);
      const { year, month } = args as { year?: number; month?: number };
      const now = new Date();
      const rows = await listSalarySlipsForCompany(
        actor.companyId,
        actor.role,
        year ?? now.getUTCFullYear(),
        month ?? now.getUTCMonth() + 1
      );
      return rows.map((s) => ({
        id: s.id,
        employeeId: s.employeeId,
        employee: s.employee
          ? `${s.employee.firstName} ${s.employee.lastName}`
          : null,
        year: s.year,
        month: s.month,
        netPay: s.netPay,
        status: s.status,
      }));
    },
  },
  {
    name: "generate_payroll",
    description:
      "Generate month payroll drafts. Ask the human to reply “confirm” in chat, then call with confirm: true. publish defaults false — set true only when intentional.",
    scopes: ["payroll:write"],
    inputSchema: z.object({
      year: mcpInt,
      month: mcpInt.min(1).max(12),
      employeeId: z.string().optional(),
      publish: mcpBool.optional(),
      defaultBasic: mcpNum.optional(),
      dryRun: mcpBool.optional(),
      confirm: mcpBool.optional(),
    }),
    jsonSchema: {
      type: "object",
      properties: {
        year: { type: "number" },
        month: { type: "number" },
        employeeId: { type: "string" },
        publish: { type: "boolean" },
        defaultBasic: { type: "number" },
        ...confirmJsonProps,
      },
      required: ["year", "month"],
      additionalProperties: false,
    },
    async handler(actor, args) {
      requireScopes(actor, ["payroll:write"]);
      const input = args as {
        year: number;
        month: number;
        employeeId?: string;
        publish?: boolean;
        defaultBasic?: number;
        dryRun?: boolean;
        confirm?: boolean;
      };
      const gate = gateWrite(input, "generate payroll");
      if (gate === "dryRun") {
        return dryRunResult("generate_payroll", {
          year: input.year,
          month: input.month,
          employeeId: input.employeeId ?? null,
          publish: input.publish === true,
          defaultBasic: input.defaultBasic ?? null,
        });
      }
      return generateMonthPayroll(actorCtx(actor), {
        ...input,
        publish: input.publish === true,
      });
    },
  },
  {
    name: "publish_payslip",
    description:
      "Publish one salary slip to the employee. Requires confirm: true after the human says “confirm” (or dryRun: true to preview).",
    scopes: ["payroll:write"],
    inputSchema: z.object({
      slipId: z.string().min(1),
      dryRun: mcpBool.optional(),
      confirm: mcpBool.optional(),
    }),
    jsonSchema: {
      type: "object",
      properties: {
        slipId: { type: "string" },
        ...confirmJsonProps,
      },
      required: ["slipId"],
      additionalProperties: false,
    },
    async handler(actor, args) {
      requireScopes(actor, ["payroll:write"]);
      const input = args as {
        slipId: string;
        dryRun?: boolean;
        confirm?: boolean;
      };
      const gate = gateWrite(input, "publish payslip");
      if (gate === "dryRun") {
        return dryRunResult("publish_payslip", { slipId: input.slipId });
      }
      const { slipId } = input;
      await publishSalarySlip(actorCtx(actor), slipId);
      return { success: true };
    },
  },
  {
    name: "get_report",
    description:
      "JSON report: attendance | leave | employees | late (headcount by dept via employees).",
    scopes: ["reports:read"],
    inputSchema: z.object({
      kind: REPORT_KIND,
    }),
    jsonSchema: {
      type: "object",
      properties: {
        kind: {
          type: "string",
          enum: ["attendance", "leave", "employees", "late"],
        },
      },
      required: ["kind"],
      additionalProperties: false,
    },
    async handler(actor, args) {
      requireScopes(actor, ["reports:read"]);
      const { kind } = args as {
        kind: "attendance" | "leave" | "employees" | "late";
      };
      const report = await buildReportRows(actor.companyId, actor.role, kind);
      const mapped = report.rows.slice(0, 500).map((row) => {
        const obj: Record<string, string | number | boolean> = {};
        report.headers.forEach((h, i) => {
          obj[h] = row[i] as string | number | boolean;
        });
        return obj;
      });

      let headcountByDept: { department: string; count: number }[] | undefined;
      if (kind === "employees") {
        const counts = new Map<string, number>();
        for (const row of mapped) {
          const dept = String(row.Department || "Unassigned");
          counts.set(dept, (counts.get(dept) ?? 0) + 1);
        }
        headcountByDept = [...counts.entries()].map(([department, count]) => ({
          department,
          count,
        }));
      }

      return {
        kind,
        filename: report.filename,
        totalRows: report.rows.length,
        rows: mapped,
        ...(headcountByDept ? { headcountByDept } : {}),
      };
    },
  },
  {
    name: "list_offer_letters",
    description: "List offer / appointment letters.",
    scopes: ["letters:read"],
    inputSchema: emptyInput,
    jsonSchema: emptyObject,
    async handler(actor) {
      requireScopes(actor, ["letters:read"]);
      const rows = await listOfferLetters(actor.companyId, actor.role);
      return rows.map((r) => ({
        id: r.id,
        letterType: r.letterType,
        candidateName: r.candidateName,
        designation: r.designation,
        department: r.department,
        joiningDate: isoOrNull(r.joiningDate),
        createdAt: isoOrNull(r.createdAt),
      }));
    },
  },
  {
    name: "create_offer_letter",
    description: "Create an offer or appointment letter draft.",
    scopes: ["letters:write"],
    inputSchema: z.object({
      letterType: LETTER_TYPE,
      candidateName: z.string().min(1),
      designation: z.string().min(1),
      employeeId: z.string().optional(),
      department: z.string().optional(),
      joiningDate: z.string().optional(),
      salaryAmount: mcpNum.optional(),
      salaryCurrency: z.string().optional(),
      employmentType: z.string().optional(),
      reportingTo: z.string().optional(),
      location: z.string().optional(),
      bodyExtras: z.string().optional(),
    }),
    jsonSchema: {
      type: "object",
      properties: {
        letterType: { type: "string", enum: ["OFFER", "APPOINTMENT"] },
        candidateName: { type: "string" },
        designation: { type: "string" },
        employeeId: { type: "string" },
        department: { type: "string" },
        joiningDate: { type: "string" },
        salaryAmount: { type: "number" },
        salaryCurrency: { type: "string" },
        employmentType: { type: "string" },
        reportingTo: { type: "string" },
        location: { type: "string" },
        bodyExtras: { type: "string" },
      },
      required: ["letterType", "candidateName", "designation"],
      additionalProperties: false,
    },
    async handler(actor, args) {
      requireScopes(actor, ["letters:write"]);
      const letter = await createOfferLetter(actorCtx(actor), args as never);
      return {
        id: letter.id,
        letterType: letter.letterType,
        candidateName: letter.candidateName,
      };
    },
  },
  ...MCP_TOOLS_EXTENDED,
];

export function listToolsForScopes(scopes: string[]) {
  return MCP_TOOLS.filter((t) => hasScope(scopes, t.scopes)).map((t) => ({
    name: t.name,
    description: t.description,
    scopes: t.scopes,
    inputSchema: t.jsonSchema,
  }));
}

export async function callMcpTool(
  actor: McpActor,
  name: string,
  args: unknown
) {
  const tool = MCP_TOOLS.find((t) => t.name === name);
  if (!tool) throw new ValidationError(`Unknown tool: ${name}`);
  requireScopes(actor, tool.scopes);
  const parsed = tool.inputSchema.safeParse(asToolArgs(args));
  if (!parsed.success) {
    recordMcpUsage({
      companyId: actor.companyId,
      tokenId: actor.tokenId,
      kind: "tool",
      name,
      ok: false,
    });
    throw new ValidationError(
      parsed.error.issues.map((i) => i.message).join("; ") || "Invalid arguments"
    );
  }
  try {
    const result = await tool.handler(actor, parsed.data);
    recordMcpUsage({
      companyId: actor.companyId,
      tokenId: actor.tokenId,
      kind: "tool",
      name,
      ok: true,
    });
    return result;
  } catch (error) {
    recordMcpUsage({
      companyId: actor.companyId,
      tokenId: actor.tokenId,
      kind: "tool",
      name,
      ok: false,
    });
    throw error;
  }
}
