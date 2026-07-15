/**
 * MCP HR sample data — attaches to an existing company admin (~30 days of ops data).
 * Seeded employees use employee codes MCP-002 … MCP-008 for easy cleanup.
 *
 * Live default admin: jame@nunato.com
 * Clear old demo tenant: npm run db:seed:mcp:clear
 * Re-seed (replace MCP sample data): SEED_FORCE=1 npm run db:seed:mcp
 */
import { hashPassword } from "better-auth/crypto";
import type {
  AttendanceExceptionType,
  AttendanceStatus,
  EmploymentStatus,
  LeaveStatus,
  PrismaClient,
  TaskAssigneeStatus,
  TaskPriority,
  UserRole,
} from "../src/generated/prisma";

export const DEFAULT_MCP_ADMIN_EMAIL = "jame@nunato.com";
export const MCP_SEED_CODE_PREFIX = "MCP-";
export const DEMO_CORP_SLUG = "demo";
const SEED_EMPLOYEE_PASSWORD = process.env.SEED_EMPLOYEE_PASSWORD ?? "password123";

const SEED_TASK_TITLES = [
  "Prepare ops digest for leadership",
  "Clear pending leave queue",
  "Resolve attendance exceptions",
  "Onboard Amit (Sales)",
  "Update holiday calendar",
] as const;

const SEED_ANNOUNCEMENT_TITLES = ["Friday WFH", "Q2 all-hands"] as const;
const SEED_HOLIDAY_NAMES = ["Republic Day", "Holi", "Company Foundation Day"] as const;

type SeedEmployee = {
  emailKey: string;
  firstName: string;
  lastName: string;
  code: string;
  role: UserRole;
  department: string;
  designation: string;
  status?: EmploymentStatus;
  onboardingDone?: boolean;
  basicSalary?: number;
};

/** Sample employees added beside the existing admin (not the admin account). */
const EXTRA_ROSTER: SeedEmployee[] = [
  {
    emailKey: "priya",
    firstName: "Priya",
    lastName: "Sharma",
    code: "MCP-002",
    role: "HR",
    department: "HR",
    designation: "HR Manager",
    onboardingDone: true,
    basicSalary: 72000,
  },
  {
    emailKey: "rahul",
    firstName: "Rahul",
    lastName: "Mehta",
    code: "MCP-003",
    role: "MANAGER",
    department: "Engineering",
    designation: "Engineering Lead",
    onboardingDone: true,
    basicSalary: 95000,
  },
  {
    emailKey: "ananya",
    firstName: "Ananya",
    lastName: "Iyer",
    code: "MCP-004",
    role: "EMPLOYEE",
    department: "Engineering",
    designation: "Software Engineer",
    onboardingDone: true,
    basicSalary: 65000,
  },
  {
    emailKey: "vikram",
    firstName: "Vikram",
    lastName: "Singh",
    code: "MCP-005",
    role: "EMPLOYEE",
    department: "Engineering",
    designation: "QA Engineer",
    onboardingDone: true,
    basicSalary: 58000,
  },
  {
    emailKey: "sara",
    firstName: "Sara",
    lastName: "Khan",
    code: "MCP-006",
    role: "EMPLOYEE",
    department: "Sales",
    designation: "Account Executive",
    onboardingDone: true,
    basicSalary: 55000,
  },
  {
    emailKey: "amit",
    firstName: "Amit",
    lastName: "Patel",
    code: "MCP-007",
    role: "EMPLOYEE",
    department: "Sales",
    designation: "Sales Associate",
    onboardingDone: false,
    basicSalary: 42000,
  },
  {
    emailKey: "neha",
    firstName: "Neha",
    lastName: "Gupta",
    code: "MCP-008",
    role: "EMPLOYEE",
    department: "Engineering",
    designation: "Frontend Developer",
    status: "ON_NOTICE",
    onboardingDone: true,
    basicSalary: 68000,
  },
];

const LEAVE_TYPES = [
  { name: "Casual", code: "CL", defaultDays: 12 },
  { name: "Sick", code: "SL", defaultDays: 10 },
  { name: "WFH", code: "WFH", defaultDays: 24 },
  { name: "Comp Off", code: "CO", defaultDays: 0 },
] as const;

function utcDate(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m - 1, d));
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function dateOnly(date: Date) {
  return utcDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

function isSunday(date: Date) {
  return date.getUTCDay() === 0;
}

function pick(day: number, emp: number, n: number) {
  return (day * 7 + emp * 13) % n;
}

function seedEmail(emailKey: string, adminEmail: string) {
  const domain = adminEmail.includes("@") ? adminEmail.split("@")[1]! : "local";
  return `mcp-seed-${emailKey}@${domain}`;
}

async function ensureDepartments(prisma: PrismaClient, companyId: string) {
  const deptNames = ["General", "HR", "Engineering", "Sales"];
  const deptMap = new Map<string, string>();
  for (const name of deptNames) {
    const existing = await prisma.department.findFirst({
      where: { companyId, name },
    });
    if (existing) {
      deptMap.set(name, existing.id);
    } else {
      const d = await prisma.department.create({
        data: { companyId, name },
      });
      deptMap.set(name, d.id);
    }
  }
  return deptMap;
}

async function ensureLeaveTypes(prisma: PrismaClient, companyId: string) {
  const leaveTypeMap = new Map<string, string>();
  for (const lt of LEAVE_TYPES) {
    const existing = await prisma.leaveType.findFirst({
      where: { companyId, name: lt.name },
    });
    if (existing) {
      leaveTypeMap.set(lt.name, existing.id);
    } else {
      const row = await prisma.leaveType.create({
        data: { companyId, ...lt },
      });
      leaveTypeMap.set(lt.name, row.id);
    }
  }
  return leaveTypeMap;
}

async function clearMcpSeedForCompany(prisma: PrismaClient, companyId: string) {
  const seeded = await prisma.employee.findMany({
    where: { companyId, employeeCode: { startsWith: MCP_SEED_CODE_PREFIX } },
    select: { id: true, userId: true, employeeCode: true },
  });

  for (const emp of seeded) {
    await prisma.user.delete({ where: { id: emp.userId } });
    console.log(`  Removed seeded employee ${emp.employeeCode}`);
  }

  await prisma.announcement.deleteMany({
    where: { companyId, title: { in: [...SEED_ANNOUNCEMENT_TITLES] } },
  });
  await prisma.holiday.deleteMany({
    where: { companyId, name: { in: [...SEED_HOLIDAY_NAMES] } },
  });
  await prisma.task.deleteMany({
    where: { companyId, title: { in: [...SEED_TASK_TITLES] } },
  });
  await prisma.project.deleteMany({
    where: { companyId, name: "WorkPilot Internal" },
  });
  await prisma.offerLetter.deleteMany({
    where: { companyId, candidateName: "Jordan Lee" },
  });
  await prisma.document.deleteMany({
    where: {
      companyId,
      OR: [
        { name: "Ananya — Government ID" },
        { name: "Sara — Offer Letter Scan" },
        { name: "Employee Handbook 2026" },
      ],
    },
  });
}

export async function clearMcpSeedData(
  prisma: PrismaClient,
  options: { adminEmail?: string; includeDemoCorp?: boolean } = {},
) {
  const { adminEmail, includeDemoCorp = true } = options;

  if (includeDemoCorp) {
    const demo = await prisma.company.findUnique({ where: { slug: DEMO_CORP_SLUG } });
    if (demo) {
      await prisma.company.delete({ where: { id: demo.id } });
      console.log(`Removed legacy Demo Corp (slug: ${DEMO_CORP_SLUG}).`);
    }
  }

  const companyIds = new Set<string>();

  if (adminEmail) {
    const user = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (user?.companyId) companyIds.add(user.companyId);
  }

  const seededCompanies = await prisma.employee.findMany({
    where: { employeeCode: { startsWith: MCP_SEED_CODE_PREFIX } },
    select: { companyId: true },
    distinct: ["companyId"],
  });
  for (const row of seededCompanies) companyIds.add(row.companyId);

  if (companyIds.size === 0) {
    console.log("No MCP seed data found to remove.");
    return;
  }

  for (const companyId of companyIds) {
    console.log(`Clearing MCP seed data for company ${companyId}…`);
    await clearMcpSeedForCompany(prisma, companyId);
  }

  console.log("MCP seed clear complete.");
}

type AttendanceRosterEntry = SeedEmployee & { id: string };

async function seedCompanyHrBundle(
  prisma: PrismaClient,
  companyId: string,
  adminUserId: string,
  adminEmployee: AttendanceRosterEntry,
  employeeByCode: Map<string, string>,
  salaryByCode: Map<string, number>,
) {
  const today = new Date();
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth() + 1;

  const attendanceRoster: AttendanceRosterEntry[] = [
    adminEmployee,
    ...EXTRA_ROSTER.map((person) => ({
      ...person,
      id: employeeByCode.get(person.code)!,
    })),
  ];

  const rahulId = employeeByCode.get("MCP-003");
  if (rahulId) {
    await prisma.employee.updateMany({
      where: {
        employeeCode: { in: ["MCP-004", "MCP-005", "MCP-008"] },
        companyId,
      },
      data: { managerId: rahulId },
    });
  }

  const rangeStart = addDays(today, -29);
  let attendanceCount = 0;

  for (let i = 0; i < 30; i++) {
    const day = addDays(rangeStart, i);
    if (isSunday(day)) continue;

    const dayOnly = dateOnly(day);

    for (let e = 0; e < attendanceRoster.length; e++) {
      const entry = attendanceRoster[e]!;
      const employeeId = entry.id;
      if (entry.status === "ON_NOTICE" && pick(i, e, 5) === 0) continue;

      const existing = await prisma.attendance.findUnique({
        where: { employeeId_date: { employeeId, date: dayOnly } },
      });
      if (existing) continue;

      const variant = pick(i, e, 10);
      let status: AttendanceStatus = "PRESENT";
      let isLate = false;
      let checkIn: Date | null = null;
      let checkOut: Date | null = null;
      let workingHours: number | null = null;

      if (variant === 0) {
        status = "ABSENT";
      } else if (variant === 1) {
        status = "LATE";
        isLate = true;
        checkIn = new Date(dayOnly);
        checkIn.setUTCHours(10, 45, 0, 0);
        checkOut = new Date(dayOnly);
        checkOut.setUTCHours(19, 0, 0, 0);
        workingHours = 8;
      } else {
        checkIn = new Date(dayOnly);
        checkIn.setUTCHours(9, 55 + (variant % 3), 0, 0);
        checkOut = new Date(dayOnly);
        checkOut.setUTCHours(18, 30, 0, 0);
        workingHours = 8;
        if (variant === 2) isLate = true;
      }

      if (status === "ABSENT") {
        await prisma.attendance.create({
          data: { companyId, employeeId, date: dayOnly, status: "ABSENT" },
        });
      } else {
        await prisma.attendance.create({
          data: {
            companyId,
            employeeId,
            date: dayOnly,
            checkIn,
            checkOut,
            status,
            workingHours,
            isLate,
            isEarlyExit: variant === 3,
          },
        });
      }
      attendanceCount++;
    }
  }

  const leaveTypeMap = await ensureLeaveTypes(prisma, companyId);
  const casualId = leaveTypeMap.get("Casual")!;
  const sickId = leaveTypeMap.get("Sick")!;

  const leaveSpecs: Array<{
    code: string;
    typeId: string;
    startOffset: number;
    days: number;
    status: LeaveStatus;
    reason: string;
  }> = [
    {
      code: "MCP-004",
      typeId: casualId,
      startOffset: 5,
      days: 2,
      status: "PENDING",
      reason: "Family function",
    },
    {
      code: "MCP-006",
      typeId: sickId,
      startOffset: 2,
      days: 1,
      status: "PENDING",
      reason: "Fever",
    },
    {
      code: "MCP-005",
      typeId: casualId,
      startOffset: 12,
      days: 1,
      status: "APPROVED",
      reason: "Personal errand",
    },
    {
      code: "MCP-007",
      typeId: casualId,
      startOffset: 8,
      days: 1,
      status: "REJECTED",
      reason: "Trip during launch week",
    },
  ];

  for (const spec of leaveSpecs) {
    const start = dateOnly(addDays(today, -spec.startOffset));
    const end = dateOnly(addDays(start, spec.days - 1));
    await prisma.leaveRequest.create({
      data: {
        companyId,
        employeeId: employeeByCode.get(spec.code)!,
        leaveTypeId: spec.typeId,
        startDate: start,
        endDate: end,
        reason: spec.reason,
        status: spec.status,
        approverComment:
          spec.status === "REJECTED" ? "Critical sprint — please reschedule" : undefined,
      },
    });
  }

  const exceptionSpecs: Array<{
    code: string;
    offset: number;
    type: AttendanceExceptionType;
    reason: string;
  }> = [
    {
      code: "MCP-004",
      offset: 3,
      type: "FORGOT_PUNCH",
      reason: "Forgot checkout after client call",
    },
    {
      code: "MCP-006",
      offset: 1,
      type: "WFH",
      reason: "Client visit — worked from home",
    },
  ];

  for (const spec of exceptionSpecs) {
    const d = dateOnly(addDays(today, -spec.offset));
    await prisma.attendanceException.create({
      data: {
        companyId,
        employeeId: employeeByCode.get(spec.code)!,
        date: d,
        type: spec.type,
        status: "PENDING",
        reason: spec.reason,
        proposedCheckIn: new Date(d.getTime() + 10 * 60 * 60 * 1000),
        proposedCheckOut: new Date(d.getTime() + 19 * 60 * 60 * 1000),
      },
    });
  }

  for (const h of [
    { name: "Republic Day", offset: -20 },
    { name: "Holi", offset: -10 },
    { name: "Company Foundation Day", offset: 7 },
  ]) {
    const date = dateOnly(addDays(today, h.offset));
    const exists = await prisma.holiday.findFirst({
      where: { companyId, name: h.name, date },
    });
    if (!exists) {
      await prisma.holiday.create({ data: { companyId, name: h.name, date } });
    }
  }

  for (const title of SEED_ANNOUNCEMENT_TITLES) {
    const exists = await prisma.announcement.findFirst({
      where: { companyId, title },
    });
    if (!exists) {
      await prisma.announcement.create({
        data: {
          companyId,
          title,
          body:
            title === "Friday WFH"
              ? "All teams may work from home this Friday. Mark attendance via the portal."
              : "Join the company all-hands next Wednesday at 4 PM IST.",
        },
      });
    }
  }

  type TaskSpec = {
    title: string;
    description: string;
    boardStatus: TaskAssigneeStatus;
    priority: TaskPriority;
    dueOffset: number;
    assignees: string[];
  };

  const taskSpecs: TaskSpec[] = [
    {
      title: "Prepare ops digest for leadership",
      description: "Summarize late arrivals and pending approvals.",
      boardStatus: "TODO",
      priority: "HIGH",
      dueOffset: 2,
      assignees: ["MCP-002"],
    },
    {
      title: "Clear pending leave queue",
      description: "Review PENDING leave requests older than 48h.",
      boardStatus: "IN_PROGRESS",
      priority: "MEDIUM",
      dueOffset: 1,
      assignees: ["MCP-002", "MCP-003"],
    },
    {
      title: "Resolve attendance exceptions",
      description: "Approve or reject open punch exceptions.",
      boardStatus: "IN_REVIEW",
      priority: "MEDIUM",
      dueOffset: 3,
      assignees: ["MCP-003"],
    },
    {
      title: "Onboard Amit (Sales)",
      description: "Complete onboarding checklist for MCP-007.",
      boardStatus: "DONE",
      priority: "LOW",
      dueOffset: -2,
      assignees: ["MCP-002", "MCP-006"],
    },
    {
      title: "Update holiday calendar",
      description: "Import remaining public holidays for the year.",
      boardStatus: "TODO",
      priority: "LOW",
      dueOffset: 14,
      assignees: [],
    },
  ];

  for (const spec of taskSpecs) {
    const task = await prisma.task.create({
      data: {
        companyId,
        title: spec.title,
        description: spec.description,
        boardStatus: spec.boardStatus,
        priority: spec.priority,
        dueDate: dateOnly(addDays(today, spec.dueOffset)),
        createdById: adminUserId,
      },
    });
    for (const code of spec.assignees) {
      await prisma.taskAssignee.create({
        data: {
          taskId: task.id,
          employeeId: employeeByCode.get(code)!,
          status: spec.boardStatus,
        },
      });
    }
  }

  const project = await prisma.project.create({
    data: {
      companyId,
      name: "WorkPilot Internal",
      description: "Internal tooling and integrations",
      credentials: {
        create: [
          { key: "STAGING_API", value: "wp_staging_demo_key_123", sortOrder: 0 },
          { key: "WEBHOOK_SECRET", value: "whsec_demo_only", sortOrder: 1 },
        ],
      },
    },
  });

  const engLeadId = employeeByCode.get("MCP-003");
  if (engLeadId) {
    await prisma.projectShare.create({
      data: { projectId: project.id, employeeId: engLeadId },
    });
  }

  const docExpiry = addDays(today, 18);
  await prisma.document.createMany({
    data: [
      {
        companyId,
        employeeId: employeeByCode.get("MCP-004"),
        name: "Ananya — Government ID",
        fileUrl: "/demo/documents/ananya-id.pdf",
        expiresAt: docExpiry,
      },
      {
        companyId,
        employeeId: employeeByCode.get("MCP-006"),
        name: "Sara — Offer Letter Scan",
        fileUrl: "/demo/documents/sara-offer.pdf",
        expiresAt: addDays(today, 8),
      },
      {
        companyId,
        name: "Employee Handbook 2026",
        fileUrl: "/demo/documents/handbook.pdf",
      },
    ],
  });

  for (const code of ["MCP-002", "MCP-003", "MCP-004", "MCP-005"]) {
    const empId = employeeByCode.get(code)!;
    const basic = salaryByCode.get(code) ?? 50000;
    await prisma.salarySlip.create({
      data: {
        companyId,
        employeeId: empId,
        year,
        month,
        basic,
        allowances: basic * 0.1,
        deductions: 1200,
        netPay: basic * 1.1 - 1200,
        presentDays: 20,
        workingDays: 22,
        status: code === "MCP-004" ? "PUBLISHED" : "DRAFT",
      },
    });
  }

  await prisma.offerLetter.create({
    data: {
      companyId,
      letterType: "OFFER",
      candidateName: "Jordan Lee",
      designation: "Backend Engineer",
      department: "Engineering",
      joiningDate: dateOnly(addDays(today, 21)),
      salaryAmount: 72000,
      salaryCurrency: "INR",
      employmentType: "Full-time",
      createdById: adminUserId,
    },
  });

  return {
    attendanceCount,
    leaveCount: leaveSpecs.length,
    exceptionCount: exceptionSpecs.length,
    taskCount: taskSpecs.length,
    projectName: project.name,
    extraEmployees: EXTRA_ROSTER.length,
  };
}

export async function seedMcpHrData(
  prisma: PrismaClient,
  options: { adminEmail?: string; force?: boolean } = {},
) {
  const adminEmail = options.adminEmail ?? DEFAULT_MCP_ADMIN_EMAIL;
  const force = options.force ?? process.env.SEED_FORCE === "1";

  const admin = await prisma.user.findUnique({
    where: { email: adminEmail },
    include: { company: true },
  });

  if (!admin) {
    throw new Error(
      `Admin user not found: ${adminEmail}. Create the account in WorkPilot first, then re-run.`,
    );
  }
  if (!admin.companyId || !admin.company) {
    throw new Error(`${adminEmail} has no company — complete company setup first.`);
  }

  const companyId = admin.companyId;
  const company = admin.company;

  const existingSeed = await prisma.employee.findFirst({
    where: { companyId, employeeCode: "MCP-002" },
  });

  if (existingSeed && !force) {
    console.log(`MCP seed skipped — sample data already exists for ${adminEmail}.`);
    console.log("  Run: npm run db:seed:mcp:clear  then  npm run db:seed:mcp");
    console.log("  Or:  SEED_FORCE=1 npm run db:seed:mcp");
    return;
  }

  if (force) {
    console.log("SEED_FORCE=1 — clearing previous MCP sample data…");
    await clearMcpSeedForCompany(prisma, companyId);
  }

  const today = new Date();
  const year = today.getUTCFullYear();
  const deptMap = await ensureDepartments(prisma, companyId);
  const leaveTypeMap = await ensureLeaveTypes(prisma, companyId);
  const hashed = await hashPassword(SEED_EMPLOYEE_PASSWORD);

  let adminEmployee = await prisma.employee.findUnique({
    where: { userId: admin.id },
  });

  if (!adminEmployee) {
    adminEmployee = await prisma.employee.create({
      data: {
        companyId,
        userId: admin.id,
        employeeCode: "ADMIN",
        firstName: admin.name?.split(" ")[0] ?? "Admin",
        lastName: admin.name?.split(" ").slice(1).join(" ") || "User",
        designation: "Administrator",
        departmentId: deptMap.get("General") ?? undefined,
        joiningDate: addDays(today, -365),
        employmentStatus: "ACTIVE",
        onboardingDone: true,
      },
    });
    console.log(`Created employee record for ${adminEmail}.`);
  } else {
    console.log(`Using existing employee record for ${adminEmail} (${adminEmployee.employeeCode}).`);
  }

  const employeeByCode = new Map<string, string>();
  const salaryByCode = new Map<string, number>();
  employeeByCode.set(adminEmployee.employeeCode, adminEmployee.id);

  for (const lt of LEAVE_TYPES) {
    const typeId = leaveTypeMap.get(lt.name)!;
    const exists = await prisma.leaveBalance.findFirst({
      where: {
        companyId,
        employeeId: adminEmployee.id,
        leaveTypeId: typeId,
        year,
      },
    });
    if (!exists) {
      await prisma.leaveBalance.create({
        data: {
          companyId,
          employeeId: adminEmployee.id,
          leaveTypeId: typeId,
          year,
          allocated: lt.defaultDays,
          used: 0,
        },
      });
    }
  }

  for (const person of EXTRA_ROSTER) {
    const email = seedEmail(person.emailKey, adminEmail);

    const user = await prisma.user.create({
      data: {
        name: `${person.firstName} ${person.lastName}`,
        email,
        emailVerified: true,
        companyId,
        role: person.role,
        accounts: {
          create: {
            accountId: email,
            providerId: "credential",
            password: hashed,
          },
        },
      },
    });

    const employee = await prisma.employee.create({
      data: {
        companyId,
        userId: user.id,
        employeeCode: person.code,
        firstName: person.firstName,
        lastName: person.lastName,
        designation: person.designation,
        departmentId: deptMap.get(person.department),
        joiningDate: addDays(today, -120),
        employmentStatus: person.status ?? "ACTIVE",
        onboardingDone: person.onboardingDone ?? true,
        basicSalary: person.basicSalary,
        phone: "+91-98765-43210",
      },
    });

    employeeByCode.set(person.code, employee.id);
    salaryByCode.set(person.code, person.basicSalary ?? 50000);

    for (const lt of LEAVE_TYPES) {
      await prisma.leaveBalance.create({
        data: {
          companyId,
          employeeId: employee.id,
          leaveTypeId: leaveTypeMap.get(lt.name)!,
          year,
          allocated: lt.defaultDays,
          used: lt.name === "Casual" && person.code === "MCP-004" ? 2 : 0,
        },
      });
    }
  }

  const adminRosterEntry: AttendanceRosterEntry = {
    emailKey: "admin",
    firstName: adminEmployee.firstName,
    lastName: adminEmployee.lastName,
    code: adminEmployee.employeeCode,
    role: admin.role,
    department: "General",
    designation: adminEmployee.designation ?? "Administrator",
    id: adminEmployee.id,
  };

  const stats = await seedCompanyHrBundle(
    prisma,
    companyId,
    admin.id,
    adminRosterEntry,
    employeeByCode,
    salaryByCode,
  );

  console.log("");
  console.log("MCP HR seed complete (~30 days of sample data):");
  console.log("  Company:    ", company.name, `(slug: ${company.slug})`);
  console.log("  Admin:      ", adminEmail, "(existing account — unchanged password)");
  console.log("  Added:      ", stats.extraEmployees, "sample employees (MCP-002 … MCP-008)");
  console.log("  Attendance: ", stats.attendanceCount, "records (skips existing dates)");
  console.log("  Leave reqs: ", stats.leaveCount, "(incl. PENDING for MCP approvals)");
  console.log("  Exceptions: ", stats.exceptionCount, "PENDING");
  console.log("  Tasks:      ", stats.taskCount);
  console.log("  Project:    ", stats.projectName);
  console.log("");
  console.log("  Sample logins (seed-only accounts): password", SEED_EMPLOYEE_PASSWORD);
  console.log("  MCP: Admin → MCP → create token → reconnect Claude if you changed token/URL");
  console.log("");
}

/** @deprecated Use seedMcpHrData — kept for imports that still reference the old name. */
export async function seedMcpDemo(prisma: PrismaClient) {
  return seedMcpHrData(prisma);
}
