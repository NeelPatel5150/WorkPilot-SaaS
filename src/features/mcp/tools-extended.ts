import { z } from "zod";
import {
  actorCtx,
  confirmJsonProps,
  confirmShape,
  dryRunResult,
  emptyInput,
  emptyObject,
  gateWrite,
  isoOrNull,
  lowerEnum,
  mcpBool,
  mcpInt,
  mcpNum,
  requireScopes,
  upperEnum,
  type McpToolDef,
} from "@/features/mcp/helpers";
import type { McpActor } from "@/features/mcp/tokens";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { activityRepo } from "@/repositories/activity.repository";
import { employeeRepo } from "@/repositories/employee.repository";
import {
  adjustEmployeeSalary,
  createEmployee,
  getEmployeeOrThrow,
  listEmployeesFiltered,
  updateEmployeeProfile,
} from "@/services/employee.service";
import {
  markOnboardingDone,
  offboardEmployee,
  reactivateEmployee,
} from "@/services/employee-lifecycle.service";
import {
  createDepartment,
  renameDepartment,
} from "@/services/department.service";
import {
  createLeaveType,
  disableLeaveType,
} from "@/services/leave.service";
import {
  getAdminSalarySlip,
  getPayrollCloseSummary,
  updateSalarySlip,
} from "@/services/payroll.service";
import {
  buildBankSalaryCsv,
} from "@/services/report.service";
import {
  createProject,
  saveProjectCredentials,
  setProjectShares,
  updateProject,
} from "@/services/project.service";
import { updateWorkPolicy } from "@/services/policy.service";
import { notifyCompanyUsers } from "@/services/notification.service";
import { listHolidays } from "@/services/holiday.service";
import type { EmploymentStatus, UserRole } from "@/generated/prisma";

const USER_ROLE = upperEnum(["COMPANY_ADMIN", "HR", "MANAGER", "EMPLOYEE"]);
const EMP_STATUS = upperEnum([
  "ACTIVE",
  "ON_NOTICE",
  "RESIGNED",
  "TERMINATED",
]);
const SALARY_MODE = lowerEnum(["set", "increment", "decrement"]);
const NOTIFY_AUDIENCE = lowerEnum(["all", "employees"]);

function employeeSummary(e: {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  designation: string | null;
  employmentStatus: EmploymentStatus;
  department?: { name: string } | null;
  user?: { email: string; role: UserRole };
}) {
  return {
    id: e.id,
    code: e.employeeCode,
    name: `${e.firstName} ${e.lastName}`,
    email: e.user?.email ?? null,
    role: e.user?.role ?? null,
    designation: e.designation,
    department: e.department?.name ?? null,
    status: e.employmentStatus,
  };
}

function parseCsvRows(csv: string) {
  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    throw new ValidationError("CSV must include a header row and at least one data row.");
  }
  const header = lines[0]!.split(",").map((h) => h.trim().toLowerCase());
  const required = ["email", "firstname", "lastname"];
  for (const col of required) {
    if (!header.includes(col)) {
      throw new ValidationError(`CSV header missing required column: ${col}`);
    }
  }
  const rows = lines.slice(1).map((line, index) => {
    const cells = line.split(",").map((c) => c.trim());
    const row: Record<string, string> = {};
    header.forEach((key, i) => {
      row[key] = cells[i] ?? "";
    });
    return { line: index + 2, row };
  });
  if (rows.length > 25) {
    throw new ValidationError("CSV import limited to 25 rows per call.");
  }
  return rows;
}

export const MCP_TOOLS_EXTENDED: McpToolDef[] = [
  {
    name: "get_token_context",
    description:
      "Who am I? Returns MCP token context: company, admin user, scopes. Use to verify the connected tenant.",
    scopes: ["company:read"],
    inputSchema: emptyInput,
    jsonSchema: emptyObject,
    async handler(actor) {
      requireScopes(actor, ["company:read"]);
      const [company, user] = await Promise.all([
        prisma.company.findUnique({
          where: { id: actor.companyId },
          select: {
            id: true,
            name: true,
            slug: true,
            timezone: true,
            setupComplete: true,
          },
        }),
        prisma.user.findUnique({
          where: { id: actor.userId },
          select: { name: true, email: true, role: true },
        }),
      ]);
      if (!company) throw new NotFoundError("Company not found");
      return {
        tokenName: actor.name,
        tokenId: actor.tokenId,
        scopes: actor.scopes,
        company: {
          id: company.id,
          name: company.name,
          slug: company.slug,
          timezone: company.timezone,
          setupComplete: company.setupComplete,
        },
        admin: user
          ? { name: user.name, email: user.email, role: user.role }
          : null,
      };
    },
  },
  {
    name: "search_employees",
    description:
      "Find employees by name, email, or employee code. Prefer this over listing the full roster.",
    scopes: ["employees:read"],
    inputSchema: z.object({
      query: z.string().min(1),
      status: upperEnum([
        "ACTIVE",
        "ON_NOTICE",
        "RESIGNED",
        "TERMINATED",
        "ALL",
      ]).optional(),
      limit: mcpInt.min(1).max(50).optional(),
    }),
    jsonSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        status: {
          type: "string",
          enum: ["ACTIVE", "ON_NOTICE", "RESIGNED", "TERMINATED", "ALL"],
        },
        limit: { type: "number" },
      },
      required: ["query"],
      additionalProperties: false,
    },
    async handler(actor, args) {
      requireScopes(actor, ["employees:read"]);
      const input = args as {
        query: string;
        status?: EmploymentStatus | "ALL";
        limit?: number;
      };
      const rows = await listEmployeesFiltered(actor.companyId, actor.role, {
        q: input.query.trim(),
        status: input.status ?? "ALL",
      });
      const limit = input.limit ?? 20;
      return rows.slice(0, limit).map((e) => employeeSummary(e));
    },
  },
  {
    name: "create_employee",
    description:
      "Create a new employee with portal login. Returns temp password once. Use dryRun to validate first.",
    scopes: ["employees:write"],
    inputSchema: z.object({
      email: z.string().email(),
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      designation: z.string().optional(),
      departmentId: z.string().optional(),
      phone: z.string().optional(),
      role: USER_ROLE.optional(),
      ...confirmShape,
    }),
    jsonSchema: {
      type: "object",
      properties: {
        email: { type: "string" },
        firstName: { type: "string" },
        lastName: { type: "string" },
        designation: { type: "string" },
        departmentId: { type: "string" },
        phone: { type: "string" },
        role: { type: "string", enum: ["COMPANY_ADMIN", "HR", "MANAGER", "EMPLOYEE"] },
        ...confirmJsonProps,
      },
      required: ["email", "firstName", "lastName"],
      additionalProperties: false,
    },
    async handler(actor, args) {
      requireScopes(actor, ["employees:write"]);
      const input = args as {
        email: string;
        firstName: string;
        lastName: string;
        designation?: string;
        departmentId?: string;
        phone?: string;
        role?: UserRole;
        dryRun?: boolean;
        confirm?: boolean;
      };
      const preview = {
        email: input.email.toLowerCase().trim(),
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        designation: input.designation?.trim() || null,
        departmentId: input.departmentId || null,
        role: input.role ?? "EMPLOYEE",
      };
      const gate = gateWrite(input, "create employee");
      if (gate === "dryRun") return dryRunResult("create_employee", preview);

      const result = await createEmployee(actorCtx(actor), {
        email: preview.email,
        firstName: preview.firstName,
        lastName: preview.lastName,
        designation: preview.designation ?? undefined,
        departmentId: preview.departmentId ?? undefined,
        phone: input.phone,
        role: preview.role as UserRole,
      });
      await activityRepo.log(actor.companyId, "mcp.create_employee", actor.userId, {
        tokenId: actor.tokenId,
        employeeId: result.employee.id,
      });
      return {
        id: result.employee.id,
        employeeCode: result.employeeCode,
        email: result.email,
        tempPassword: result.tempPassword,
        inviteSent: result.inviteSent,
      };
    },
  },
  {
    name: "update_employee",
    description:
      "Update employee profile fields. Only send fields you want to change (plus employeeId).",
    scopes: ["employees:write"],
    inputSchema: z.object({
      employeeId: z.string().min(1),
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      designation: z.string().optional(),
      departmentId: z.string().nullable().optional(),
      role: USER_ROLE.optional(),
      joiningDate: z.string().optional(),
      employmentStatus: EMP_STATUS.optional(),
      ...confirmShape,
    }),
    jsonSchema: {
      type: "object",
      properties: {
        employeeId: { type: "string" },
        firstName: { type: "string" },
        lastName: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        designation: { type: "string" },
        departmentId: { type: "string" },
        role: { type: "string" },
        joiningDate: { type: "string" },
        employmentStatus: {
          type: "string",
          enum: ["ACTIVE", "ON_NOTICE", "RESIGNED", "TERMINATED"],
        },
        ...confirmJsonProps,
      },
      required: ["employeeId"],
      additionalProperties: false,
    },
    async handler(actor, args) {
      requireScopes(actor, ["employees:write"]);
      const input = args as {
        employeeId: string;
        firstName?: string;
        lastName?: string;
        email?: string;
        phone?: string;
        designation?: string;
        departmentId?: string | null;
        role?: UserRole;
        joiningDate?: string;
        employmentStatus?: EmploymentStatus;
        dryRun?: boolean;
        confirm?: boolean;
      };
      const current = await getEmployeeOrThrow(actor.companyId, input.employeeId);
      const preview = {
        employeeId: input.employeeId,
        firstName: input.firstName ?? current.firstName,
        lastName: input.lastName ?? current.lastName,
        email: input.email ?? current.user.email,
        phone: input.phone ?? current.phone,
        designation: input.designation ?? current.designation,
        departmentId:
          input.departmentId !== undefined ? input.departmentId : current.departmentId,
        role: input.role ?? current.user.role,
        joiningDate: input.joiningDate ?? isoOrNull(current.joiningDate)?.slice(0, 10),
        employmentStatus: input.employmentStatus ?? current.employmentStatus,
      };
      const gate = gateWrite(input, "update employee");
      if (gate === "dryRun") return dryRunResult("update_employee", preview);

      await updateEmployeeProfile(actorCtx(actor), input.employeeId, {
        firstName: preview.firstName,
        lastName: preview.lastName,
        email: preview.email,
        phone: preview.phone ?? undefined,
        designation: preview.designation ?? undefined,
        departmentId: preview.departmentId,
        role: preview.role as UserRole,
        joiningDate: preview.joiningDate ?? undefined,
      });
      if (
        input.employmentStatus &&
        input.employmentStatus !== current.employmentStatus
      ) {
        await prisma.employee.updateMany({
          where: { id: input.employeeId, companyId: actor.companyId },
          data: { employmentStatus: input.employmentStatus },
        });
      }
      const updated = await getEmployeeOrThrow(actor.companyId, input.employeeId);
      return employeeSummary(updated);
    },
  },
  {
    name: "offboard_employee",
    description:
      "Offboard an employee (revokes portal access). Requires confirm: true unless dryRun.",
    scopes: ["employees:write"],
    inputSchema: z.object({
      employeeId: z.string().min(1),
      status: EMP_STATUS.optional(),
      exitReason: z.string().optional(),
      ...confirmShape,
    }),
    jsonSchema: {
      type: "object",
      properties: {
        employeeId: { type: "string" },
        status: {
          type: "string",
          enum: ["ON_NOTICE", "RESIGNED", "TERMINATED"],
        },
        exitReason: { type: "string" },
        ...confirmJsonProps,
      },
      required: ["employeeId"],
      additionalProperties: false,
    },
    async handler(actor, args) {
      requireScopes(actor, ["employees:write"]);
      const input = args as {
        employeeId: string;
        status?: EmploymentStatus;
        exitReason?: string;
        dryRun?: boolean;
        confirm?: boolean;
      };
      const employee = await getEmployeeOrThrow(actor.companyId, input.employeeId);
      const preview = {
        employeeId: input.employeeId,
        name: `${employee.firstName} ${employee.lastName}`,
        status: input.status ?? "RESIGNED",
        exitReason: input.exitReason ?? null,
        accessRevoked: true,
      };
      const gate = gateWrite(input, "offboard employee");
      if (gate === "dryRun") return dryRunResult("offboard_employee", preview);

      await offboardEmployee(actorCtx(actor), input.employeeId, {
        status: preview.status as EmploymentStatus,
        exitReason: input.exitReason,
      });
      await activityRepo.log(actor.companyId, "mcp.offboard_employee", actor.userId, {
        tokenId: actor.tokenId,
        employeeId: input.employeeId,
      });
      return { success: true, ...preview };
    },
  },
  {
    name: "reactivate_employee",
    description: "Restore a former employee's ACTIVE status and portal access.",
    scopes: ["employees:write"],
    inputSchema: z.object({
      employeeId: z.string().min(1),
      ...confirmShape,
    }),
    jsonSchema: {
      type: "object",
      properties: {
        employeeId: { type: "string" },
        ...confirmJsonProps,
      },
      required: ["employeeId"],
      additionalProperties: false,
    },
    async handler(actor, args) {
      requireScopes(actor, ["employees:write"]);
      const input = args as { employeeId: string; dryRun?: boolean; confirm?: boolean };
      const employee = await getEmployeeOrThrow(actor.companyId, input.employeeId);
      const preview = {
        employeeId: input.employeeId,
        name: `${employee.firstName} ${employee.lastName}`,
        currentStatus: employee.employmentStatus,
        nextStatus: "ACTIVE",
      };
      const gate = gateWrite(input, "reactivate employee");
      if (gate === "dryRun") return dryRunResult("reactivate_employee", preview);

      await reactivateEmployee(actorCtx(actor), input.employeeId);
      return { success: true, employeeId: input.employeeId };
    },
  },
  {
    name: "mark_onboarding_done",
    description: "Mark an employee's onboarding checklist complete.",
    scopes: ["employees:write"],
    inputSchema: z.object({
      employeeId: z.string().min(1),
      ...confirmShape,
    }),
    jsonSchema: {
      type: "object",
      properties: { employeeId: { type: "string" }, ...confirmJsonProps },
      required: ["employeeId"],
      additionalProperties: false,
    },
    async handler(actor, args) {
      requireScopes(actor, ["employees:write"]);
      const input = args as { employeeId: string; dryRun?: boolean; confirm?: boolean };
      const gate = gateWrite(input, "mark onboarding done");
      if (gate === "dryRun") {
        return dryRunResult("mark_onboarding_done", {
          employeeId: input.employeeId,
          onboardingDone: true,
        });
      }
      await markOnboardingDone(actorCtx(actor), input.employeeId);
      return { success: true, employeeId: input.employeeId, onboardingDone: true };
    },
  },
  {
    name: "import_employees_csv",
    description:
      "Bulk create employees from CSV (max 25 rows). Header: email,firstName,lastName,designation,departmentName,role. Always dryRun first.",
    scopes: ["employees:write"],
    inputSchema: z.object({
      csv: z.string().min(10).max(8000),
      ...confirmShape,
    }),
    jsonSchema: {
      type: "object",
      properties: {
        csv: { type: "string" },
        ...confirmJsonProps,
      },
      required: ["csv"],
      additionalProperties: false,
    },
    async handler(actor, args) {
      requireScopes(actor, ["employees:write"]);
      const input = args as { csv: string; dryRun?: boolean; confirm?: boolean };
      const parsed = parseCsvRows(input.csv);
      const departments = await prisma.department.findMany({
        where: { companyId: actor.companyId },
        select: { id: true, name: true },
      });
      const deptByName = new Map(
        departments.map((d) => [d.name.toLowerCase(), d.id])
      );
      const preview = parsed.map(({ line, row }) => ({
        line,
        email: row.email?.toLowerCase().trim(),
        firstName: row.firstname?.trim(),
        lastName: row.lastname?.trim(),
        designation: row.designation?.trim() || null,
        departmentName: row.departmentname?.trim() || null,
        departmentId: row.departmentname
          ? deptByName.get(row.departmentname.trim().toLowerCase()) ?? null
          : null,
        role: (row.role?.trim().toUpperCase() || "EMPLOYEE") as UserRole,
        valid:
          !!row.email?.includes("@") &&
          !!row.firstname?.trim() &&
          !!row.lastname?.trim(),
      }));
      const gate = gateWrite(input, "import employees CSV");
      if (gate === "dryRun") {
        return dryRunResult("import_employees_csv", {
          rowCount: preview.length,
          rows: preview,
          invalidRows: preview.filter((r) => !r.valid).length,
        });
      }
      const created: Array<{ line: number; id: string; email: string; code: string }> =
        [];
      for (const row of preview) {
        if (!row.valid) {
          throw new ValidationError(`Invalid row ${row.line}: check email and name fields.`);
        }
        if (row.departmentName && !row.departmentId) {
          throw new ValidationError(
            `Row ${row.line}: unknown department "${row.departmentName}".`
          );
        }
        const result = await createEmployee(actorCtx(actor), {
          email: row.email,
          firstName: row.firstName,
          lastName: row.lastName,
          designation: row.designation ?? undefined,
          departmentId: row.departmentId ?? undefined,
          role: row.role,
        });
        created.push({
          line: row.line,
          id: result.employee.id,
          email: result.email,
          code: result.employeeCode,
        });
      }
      return { imported: created.length, employees: created };
    },
  },
  {
    name: "create_department",
    description: "Create a department.",
    scopes: ["departments:write"],
    inputSchema: z.object({ name: z.string().min(1) }),
    jsonSchema: {
      type: "object",
      properties: { name: { type: "string" } },
      required: ["name"],
      additionalProperties: false,
    },
    async handler(actor, args) {
      requireScopes(actor, ["departments:write"]);
      const { name } = args as { name: string };
      const dept = await createDepartment(actorCtx(actor), name);
      return { id: dept.id, name: dept.name };
    },
  },
  {
    name: "rename_department",
    description: "Rename an existing department.",
    scopes: ["departments:write"],
    inputSchema: z.object({
      departmentId: z.string().min(1),
      name: z.string().min(1),
    }),
    jsonSchema: {
      type: "object",
      properties: {
        departmentId: { type: "string" },
        name: { type: "string" },
      },
      required: ["departmentId", "name"],
      additionalProperties: false,
    },
    async handler(actor, args) {
      requireScopes(actor, ["departments:write"]);
      const input = args as { departmentId: string; name: string };
      return renameDepartment(actorCtx(actor), input.departmentId, input.name);
    },
  },
  {
    name: "create_leave_type",
    description: "Create a leave type for the company.",
    scopes: ["leave_types:write"],
    inputSchema: z.object({
      name: z.string().min(1),
      code: z.string().optional(),
      defaultDays: mcpInt.min(0),
      requiresProof: mcpBool.optional(),
      carryForward: mcpBool.optional(),
      maxCarryDays: mcpInt.min(0).optional(),
      sandwichRule: mcpBool.optional(),
    }),
    jsonSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        code: { type: "string" },
        defaultDays: { type: "number" },
        requiresProof: { type: "boolean" },
        carryForward: { type: "boolean" },
        maxCarryDays: { type: "number" },
        sandwichRule: { type: "boolean" },
      },
      required: ["name", "defaultDays"],
      additionalProperties: false,
    },
    async handler(actor, args) {
      requireScopes(actor, ["leave_types:write"]);
      const input = args as {
        name: string;
        code?: string;
        defaultDays: number;
        requiresProof?: boolean;
        carryForward?: boolean;
        maxCarryDays?: number;
        sandwichRule?: boolean;
      };
      const created = await createLeaveType(actorCtx(actor), input);
      return {
        id: created.id,
        name: created.name,
        code: created.code,
        defaultDays: created.defaultDays,
      };
    },
  },
  {
    name: "disable_leave_type",
    description: "Soft-disable a leave type (keeps history). Casual Leave cannot be disabled.",
    scopes: ["leave_types:write"],
    inputSchema: z.object({
      leaveTypeId: z.string().min(1),
      ...confirmShape,
    }),
    jsonSchema: {
      type: "object",
      properties: { leaveTypeId: { type: "string" }, ...confirmJsonProps },
      required: ["leaveTypeId"],
      additionalProperties: false,
    },
    async handler(actor, args) {
      requireScopes(actor, ["leave_types:write"]);
      const input = args as { leaveTypeId: string; dryRun?: boolean; confirm?: boolean };
      const gate = gateWrite(input, "disable leave type");
      if (gate === "dryRun") {
        return dryRunResult("disable_leave_type", { leaveTypeId: input.leaveTypeId });
      }
      await disableLeaveType(actorCtx(actor), input.leaveTypeId);
      return { success: true, leaveTypeId: input.leaveTypeId };
    },
  },
  {
    name: "get_payslip_detail",
    description: "Full salary slip breakdown for one employee/month.",
    scopes: ["payroll:read"],
    inputSchema: z.object({ slipId: z.string().min(1) }),
    jsonSchema: {
      type: "object",
      properties: { slipId: { type: "string" } },
      required: ["slipId"],
      additionalProperties: false,
    },
    async handler(actor, args) {
      requireScopes(actor, ["payroll:read"]);
      const { slipId } = args as { slipId: string };
      const slip = await getAdminSalarySlip(actor.companyId, actor.role, slipId);
      return {
        id: slip.id,
        employeeId: slip.employeeId,
        employee: `${slip.employee.firstName} ${slip.employee.lastName}`,
        employeeCode: slip.employee.employeeCode,
        year: slip.year,
        month: slip.month,
        basic: slip.basic,
        allowances: slip.allowances,
        deductions: slip.deductions,
        pf: slip.pf,
        esi: slip.esi,
        tds: slip.tds,
        lopDays: slip.lopDays,
        netPay: slip.netPay,
        presentDays: slip.presentDays,
        workingDays: slip.workingDays,
        overtimeHours: slip.overtimeHours,
        status: slip.status,
        notes: slip.notes,
      };
    },
  },
  {
    name: "update_payslip",
    description:
      "Edit a DRAFT payslip before publish. Resets status to DRAFT. Use dryRun to preview.",
    scopes: ["payroll:write"],
    inputSchema: z.object({
      slipId: z.string().min(1),
      basic: mcpNum.optional(),
      allowances: mcpNum.optional(),
      deductions: mcpNum.optional(),
      pf: mcpNum.optional(),
      esi: mcpNum.optional(),
      tds: mcpNum.optional(),
      lopDays: mcpNum.optional(),
      notes: z.string().optional(),
      ...confirmShape,
    }),
    jsonSchema: {
      type: "object",
      properties: {
        slipId: { type: "string" },
        basic: { type: "number" },
        allowances: { type: "number" },
        deductions: { type: "number" },
        pf: { type: "number" },
        esi: { type: "number" },
        tds: { type: "number" },
        lopDays: { type: "number" },
        notes: { type: "string" },
        ...confirmJsonProps,
      },
      required: ["slipId"],
      additionalProperties: false,
    },
    async handler(actor, args) {
      requireScopes(actor, ["payroll:write"]);
      const input = args as {
        slipId: string;
        basic?: number;
        allowances?: number;
        deductions?: number;
        pf?: number;
        esi?: number;
        tds?: number;
        lopDays?: number;
        notes?: string;
        dryRun?: boolean;
        confirm?: boolean;
      };
      const gate = gateWrite(input, "update payslip");
      if (gate === "dryRun") {
        return dryRunResult("update_payslip", {
          slipId: input.slipId,
          patch: {
            basic: input.basic,
            allowances: input.allowances,
            deductions: input.deductions,
            pf: input.pf,
            esi: input.esi,
            tds: input.tds,
            lopDays: input.lopDays,
            notes: input.notes,
          },
        });
      }
      const slip = await updateSalarySlip(actorCtx(actor), input.slipId, input);
      return {
        id: slip.id,
        netPay: slip.netPay,
        status: slip.status,
      };
    },
  },
  {
    name: "adjust_employee_salary",
    description: "Set, increment, or decrement an employee's basic salary.",
    scopes: ["payroll:write"],
    inputSchema: z.object({
      employeeId: z.string().min(1),
      mode: SALARY_MODE,
      amount: mcpNum.min(0),
      ...confirmShape,
    }),
    jsonSchema: {
      type: "object",
      properties: {
        employeeId: { type: "string" },
        mode: { type: "string", enum: ["set", "increment", "decrement"] },
        amount: { type: "number" },
        ...confirmJsonProps,
      },
      required: ["employeeId", "mode", "amount"],
      additionalProperties: false,
    },
    async handler(actor, args) {
      requireScopes(actor, ["payroll:write"]);
      const input = args as {
        employeeId: string;
        mode: "set" | "increment" | "decrement";
        amount: number;
        dryRun?: boolean;
        confirm?: boolean;
      };
      const employee = await getEmployeeOrThrow(actor.companyId, input.employeeId);
      const current = employee.basicSalary ?? 0;
      let next = current;
      if (input.mode === "set") next = input.amount;
      else if (input.mode === "increment") next = current + input.amount;
      else next = Math.max(0, current - input.amount);
      const preview = { employeeId: input.employeeId, mode: input.mode, current, next };
      const gate = gateWrite(input, "adjust employee salary");
      if (gate === "dryRun") return dryRunResult("adjust_employee_salary", preview);
      const result = await adjustEmployeeSalary(actorCtx(actor), input.employeeId, {
        mode: input.mode,
        amount: input.amount,
      });
      return result;
    },
  },
  {
    name: "create_project",
    description: "Create a project (metadata only — no credentials).",
    scopes: ["projects:write"],
    inputSchema: z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      notes: z.string().optional(),
    }),
    jsonSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        notes: { type: "string" },
      },
      required: ["name"],
      additionalProperties: false,
    },
    async handler(actor, args) {
      requireScopes(actor, ["projects:write"]);
      const input = args as { name: string; description?: string; notes?: string };
      const project = await createProject(actor.companyId, actor.role, input);
      return { id: project.id, name: project.name };
    },
  },
  {
    name: "update_project",
    description: "Update project name, description, or notes.",
    scopes: ["projects:write"],
    inputSchema: z.object({
      projectId: z.string().min(1),
      name: z.string().optional(),
      description: z.string().nullable().optional(),
      notes: z.string().nullable().optional(),
    }),
    jsonSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        name: { type: "string" },
        description: { type: "string" },
        notes: { type: "string" },
      },
      required: ["projectId"],
      additionalProperties: false,
    },
    async handler(actor, args) {
      requireScopes(actor, ["projects:write"]);
      const input = args as {
        projectId: string;
        name?: string;
        description?: string | null;
        notes?: string | null;
      };
      const project = await updateProject(
        actor.companyId,
        actor.role,
        input.projectId,
        input
      );
      return { id: project?.id, name: project?.name };
    },
  },
  {
    name: "share_project",
    description: "Set which employees can access a shared project vault.",
    scopes: ["projects:write"],
    inputSchema: z.object({
      projectId: z.string().min(1),
      employeeIds: z.array(z.string()).max(50),
      ...confirmShape,
    }),
    jsonSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        employeeIds: { type: "array", items: { type: "string" } },
        ...confirmJsonProps,
      },
      required: ["projectId", "employeeIds"],
      additionalProperties: false,
    },
    async handler(actor, args) {
      requireScopes(actor, ["projects:write"]);
      const input = args as {
        projectId: string;
        employeeIds: string[];
        dryRun?: boolean;
        confirm?: boolean;
      };
      const gate = gateWrite(input, "share project");
      if (gate === "dryRun") {
        return dryRunResult("share_project", {
          projectId: input.projectId,
          employeeIds: input.employeeIds,
        });
      }
      await setProjectShares(
        actor.companyId,
        actor.role,
        input.projectId,
        input.employeeIds
      );
      return { success: true, projectId: input.projectId, count: input.employeeIds.length };
    },
  },
  {
    name: "set_project_credentials",
    description:
      "Replace all vault credentials on a project. Sensitive — requires confirm: true.",
    scopes: ["projects:credentials_write"],
    inputSchema: z.object({
      projectId: z.string().min(1),
      credentials: z
        .array(z.object({ key: z.string().min(1), value: z.string().min(1) }))
        .max(30),
      ...confirmShape,
    }),
    jsonSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        credentials: {
          type: "array",
          items: {
            type: "object",
            properties: { key: { type: "string" }, value: { type: "string" } },
            required: ["key", "value"],
          },
        },
        ...confirmJsonProps,
      },
      required: ["projectId", "credentials"],
      additionalProperties: false,
    },
    async handler(actor, args) {
      requireScopes(actor, ["projects:credentials_write"]);
      const input = args as {
        projectId: string;
        credentials: { key: string; value: string }[];
        dryRun?: boolean;
        confirm?: boolean;
      };
      const gate = gateWrite(input, "set project credentials");
      if (gate === "dryRun") {
        return dryRunResult("set_project_credentials", {
          projectId: input.projectId,
          keys: input.credentials.map((c) => c.key),
        });
      }
      const project = await saveProjectCredentials(
        actor.companyId,
        actor.role,
        input.projectId,
        input.credentials
      );
      await activityRepo.log(
        actor.companyId,
        "mcp.project_credentials_write",
        actor.userId,
        { tokenId: actor.tokenId, projectId: input.projectId }
      );
      return {
        id: project?.id,
        name: project?.name,
        credentialCount: project?.credentials?.length ?? 0,
      };
    },
  },
  {
    name: "update_work_policy",
    description:
      "Update work start time, grace minutes, standard hours, or weekly offs (0=Sun … 6=Sat).",
    scopes: ["company:write"],
    inputSchema: z.object({
      workStartHour: mcpInt.min(0).max(23).optional(),
      workStartMinute: mcpInt.min(0).max(59).optional(),
      graceMinutes: mcpInt.min(0).max(120).optional(),
      standardHours: mcpNum.min(1).max(24).optional(),
      weeklyOffs: z.array(mcpInt.min(0).max(6)).max(7).optional(),
      ...confirmShape,
    }),
    jsonSchema: {
      type: "object",
      properties: {
        workStartHour: { type: "number" },
        workStartMinute: { type: "number" },
        graceMinutes: { type: "number" },
        standardHours: { type: "number" },
        weeklyOffs: { type: "array", items: { type: "number" } },
        ...confirmJsonProps,
      },
      additionalProperties: false,
    },
    async handler(actor, args) {
      requireScopes(actor, ["company:write"]);
      const input = args as {
        workStartHour?: number;
        workStartMinute?: number;
        graceMinutes?: number;
        standardHours?: number;
        weeklyOffs?: number[];
        dryRun?: boolean;
        confirm?: boolean;
      };
      const gate = gateWrite(input, "update work policy");
      if (gate === "dryRun") return dryRunResult("update_work_policy", input);
      const company = await updateWorkPolicy(
        { companyId: actor.companyId, role: actor.role },
        input
      );
      return {
        workStartHour: company.workStartHour,
        workStartMinute: company.workStartMinute,
        graceMinutes: company.graceMinutes,
        standardHours: company.standardHours,
        weeklyOffs: company.weeklyOffs,
      };
    },
  },
  {
    name: "list_audit_log",
    description: "Recent admin actions (audit trail).",
    scopes: ["audit:read"],
    inputSchema: z.object({ limit: mcpInt.min(1).max(100).optional() }),
    jsonSchema: {
      type: "object",
      properties: { limit: { type: "number" } },
      additionalProperties: false,
    },
    async handler(actor, args) {
      requireScopes(actor, ["audit:read"]);
      const { limit } = args as { limit?: number };
      const rows = await activityRepo.list(actor.companyId, limit ?? 50);
      return rows.map((r) => ({
        id: r.id,
        action: r.action,
        user: r.user ? `${r.user.name} (${r.user.email})` : null,
        metadata: r.metadata,
        createdAt: isoOrNull(r.createdAt),
      }));
    },
  },
  {
    name: "list_notifications",
    description: "Recent notifications sent in the company.",
    scopes: ["notifications:read"],
    inputSchema: z.object({ limit: mcpInt.min(1).max(100).optional() }),
    jsonSchema: {
      type: "object",
      properties: { limit: { type: "number" } },
      additionalProperties: false,
    },
    async handler(actor, args) {
      requireScopes(actor, ["notifications:read"]);
      const { limit } = args as { limit?: number };
      const rows = await prisma.notification.findMany({
        where: { companyId: actor.companyId },
        orderBy: { createdAt: "desc" },
        take: limit ?? 30,
        include: { user: { select: { name: true, email: true } } },
      });
      return rows.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        channel: n.channel,
        user: n.user ? `${n.user.name} (${n.user.email})` : null,
        readAt: isoOrNull(n.readAt),
        createdAt: isoOrNull(n.createdAt),
      }));
    },
  },
  {
    name: "send_notification",
    description:
      "Broadcast a notification to company users. Requires confirm: true unless dryRun.",
    scopes: ["notifications:write"],
    inputSchema: z.object({
      title: z.string().min(1),
      message: z.string().min(1),
      audience: NOTIFY_AUDIENCE.optional(),
      ...confirmShape,
    }),
    jsonSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        message: { type: "string" },
        audience: { type: "string", enum: ["all", "employees"] },
        ...confirmJsonProps,
      },
      required: ["title", "message"],
      additionalProperties: false,
    },
    async handler(actor, args) {
      requireScopes(actor, ["notifications:write"]);
      const input = args as {
        title: string;
        message: string;
        audience?: "all" | "employees";
        dryRun?: boolean;
        confirm?: boolean;
      };
      const preview = {
        title: input.title.trim(),
        message: input.message.trim(),
        audience: input.audience ?? "all",
        channels: ["in_app", "email", "push"],
      };
      const gate = gateWrite(input, "send notification");
      if (gate === "dryRun") return dryRunResult("send_notification", preview);
      await notifyCompanyUsers(actor.companyId, preview.title, preview.message, {
        employeesOnly: preview.audience === "employees",
      });
      await activityRepo.log(actor.companyId, "mcp.send_notification", actor.userId, {
        tokenId: actor.tokenId,
        title: preview.title,
      });
      return { success: true, ...preview };
    },
  },
  {
    name: "list_missing_bank_details",
    description:
      "List active employees missing IFSC or bank account number — run before bank salary CSV export.",
    scopes: ["payroll:read"],
    inputSchema: emptyInput,
    jsonSchema: emptyObject,
    async handler(actor) {
      requireScopes(actor, ["payroll:read"]);
      const rows = await prisma.employee.findMany({
        where: {
          companyId: actor.companyId,
          employmentStatus: { in: ["ACTIVE", "ON_NOTICE"] },
          OR: [
            { bankAccountNumber: null },
            { bankAccountNumber: "" },
            { bankIfsc: null },
            { bankIfsc: "" },
          ],
        },
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          bankAccountNumber: true,
          bankIfsc: true,
          bankName: true,
          department: { select: { name: true } },
        },
        orderBy: { employeeCode: "asc" },
      });

      return {
        count: rows.length,
        employees: rows.map((e) => ({
          id: e.id,
          code: e.employeeCode,
          name: `${e.firstName} ${e.lastName}`,
          department: e.department?.name ?? null,
          missingAccount: !e.bankAccountNumber?.trim(),
          missingIfsc: !e.bankIfsc?.trim(),
          bankName: e.bankName ?? null,
        })),
        message:
          rows.length === 0
            ? "All active employees have account number and IFSC."
            : `${rows.length} employee(s) incomplete — fix before NEFT CSV.`,
      };
    },
  },
  {
    name: "payroll_close_status",
    description:
      "Zero-Excel payroll close checklist: pending exceptions + draft/published slip counts for a month.",
    scopes: ["payroll:read"],
    inputSchema: z.object({
      year: mcpInt.optional(),
      month: mcpInt.min(1).max(12).optional(),
    }),
    jsonSchema: {
      type: "object",
      properties: {
        year: { type: "number", description: "Defaults to current UTC year" },
        month: {
          type: "number",
          description: "1-12, defaults to current UTC month",
        },
      },
      additionalProperties: false,
    },
    async handler(actor, args) {
      requireScopes(actor, ["payroll:read"]);
      const input = args as { year?: number; month?: number };
      const now = new Date();
      const year = input.year ?? now.getUTCFullYear();
      const month = input.month ?? now.getUTCMonth() + 1;
      const summary = await getPayrollCloseSummary(
        actor.companyId,
        actor.role,
        year,
        month
      );
      const blocked =
        summary.pendingExceptions > 0 || summary.draftCount > 0;
      return {
        year,
        month,
        ...summary,
        readyToClose:
          summary.pendingExceptions === 0 &&
          summary.slipCount > 0 &&
          summary.draftCount === 0,
        blocked,
        guidance:
          summary.pendingExceptions > 0
            ? "Clear pending attendance exceptions before finalizing."
            : summary.draftCount > 0
              ? "Publish remaining draft slips before bank transfer."
              : summary.slipCount === 0
                ? "No slips yet — generate payroll for this month."
                : "Exceptions clear and slips published — safe to export bank CSV.",
      };
    },
  },
  {
    name: "export_bank_salary_csv",
    description:
      "Export NEFT-style bank salary CSV for published slips in a month. Prefer list_missing_bank_details first.",
    scopes: ["payroll:read"],
    inputSchema: z.object({
      year: mcpInt,
      month: mcpInt.min(1).max(12),
    }),
    jsonSchema: {
      type: "object",
      properties: {
        year: { type: "number" },
        month: { type: "number" },
      },
      required: ["year", "month"],
      additionalProperties: false,
    },
    async handler(actor, args) {
      requireScopes(actor, ["payroll:read"]);
      const input = args as { year: number; month: number };

      const missing = await prisma.employee.findMany({
        where: {
          companyId: actor.companyId,
          employmentStatus: { in: ["ACTIVE", "ON_NOTICE"] },
          OR: [
            { bankAccountNumber: null },
            { bankAccountNumber: "" },
            { bankIfsc: null },
            { bankIfsc: "" },
          ],
        },
        select: {
          employeeCode: true,
          firstName: true,
          lastName: true,
          bankAccountNumber: true,
          bankIfsc: true,
        },
        take: 50,
      });

      const { filename, csv, count } = await buildBankSalaryCsv(
        actor.companyId,
        actor.role,
        input.year,
        input.month
      );

      const rowsWithBlankBank = csv
        .split(/\r?\n/)
        .slice(1)
        .filter((line) => {
          if (!line.trim()) return false;
          const cols = line.split(",");
          return (
            !cols[3]?.replace(/"/g, "").trim() ||
            !cols[4]?.replace(/"/g, "").trim()
          );
        }).length;

      return {
        year: input.year,
        month: input.month,
        filename,
        rowCount: count,
        csv,
        warnings: {
          employeesMissingBankDetails: missing.length,
          csvRowsWithBlankAccountOrIfsc: rowsWithBlankBank,
          sampleMissing: missing.slice(0, 10).map((e) => ({
            code: e.employeeCode,
            name: `${e.firstName} ${e.lastName}`,
            missingAccount: !e.bankAccountNumber?.trim(),
            missingIfsc: !e.bankIfsc?.trim(),
          })),
        },
        message:
          count === 0
            ? "No published slips for this month — publish payroll first."
            : missing.length > 0 || rowsWithBlankBank > 0
              ? `CSV ready (${count} rows) but bank details incomplete — review warnings before NEFT upload.`
              : `CSV ready (${count} rows).`,
      };
    },
  },
];

/** Resource payloads for MCP resources/read. */
export async function readMcpResource(actor: McpActor, uri: string) {
  if (uri === "company://roster") {
    requireScopes(actor, ["employees:read"]);
    const rows = await employeeRepo.list(actor.companyId);
    return JSON.stringify(
      rows.map((e) => employeeSummary(e)),
      null,
      2
    );
  }
  if (uri === "company://holidays") {
    requireScopes(actor, ["holidays:read"]);
    const rows = await listHolidays(actor.companyId);
    return JSON.stringify(
      rows.map((h) => ({
        id: h.id,
        name: h.name,
        date: isoOrNull(h.date)?.slice(0, 10),
      })),
      null,
      2
    );
  }
  throw new NotFoundError(`Unknown resource: ${uri}`);
}

export const MCP_RESOURCE_CATALOG = [
  {
    uri: "company://roster",
    name: "Employee roster",
    description: "JSON roster for the connected company.",
    mimeType: "application/json",
    scopes: ["employees:read"] as const,
  },
  {
    uri: "company://holidays",
    name: "Holiday calendar",
    description: "JSON list of company holidays.",
    mimeType: "application/json",
    scopes: ["holidays:read"] as const,
  },
] as const;
