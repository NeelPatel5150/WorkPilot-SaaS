/** Admin MCP scopes — WorkPilot APIs only (no OpenAI / proposals). */

export const MCP_SCOPE_GROUPS = [
  { id: "ops", label: "Daily ops" },
  { id: "people", label: "People & compliance" },
  { id: "payroll", label: "Payroll & reports" },
  { id: "workspace", label: "Workspace" },
  { id: "company", label: "Company" },
] as const;

export const MCP_SCOPES = [
  // —— Daily ops ——
  {
    id: "ops:digest",
    label: "Ops digest / dashboard",
    description: "Today late/absent, pending approvals, open tasks snapshot.",
    sensitive: false,
    group: "ops",
  },
  {
    id: "departments:read",
    label: "Departments",
    description: "List org departments.",
    sensitive: false,
    group: "ops",
  },
  {
    id: "employees:read",
    label: "Employees list",
    description: "Roster: names, codes, departments (no passwords).",
    sensitive: false,
    group: "ops",
  },
  {
    id: "employees:write",
    label: "Employees (create / update / lifecycle)",
    description: "Add employees, update profiles, onboarding, offboard, reactivate.",
    sensitive: true,
    group: "ops",
  },
  {
    id: "departments:write",
    label: "Departments (write)",
    description: "Create or rename departments.",
    sensitive: false,
    group: "ops",
  },
  {
    id: "leave_types:write",
    label: "Leave types (write)",
    description: "Create or disable leave types.",
    sensitive: false,
    group: "ops",
  },
  {
    id: "employees:detail",
    label: "Employee detail + leave balances",
    description: "One employee profile, manager, leave balances (no salary).",
    sensitive: false,
    group: "ops",
  },
  {
    id: "attendance:read",
    label: "Attendance (read)",
    description: "Today / recent punches and month timesheet.",
    sensitive: false,
    group: "ops",
  },
  {
    id: "attendance:write",
    label: "Attendance adjust",
    description: "Admin fix check-in/out punches for a day.",
    sensitive: true,
    group: "ops",
  },
  {
    id: "leaves:read",
    label: "Leaves (read)",
    description: "Leave types and requests.",
    sensitive: false,
    group: "ops",
  },
  {
    id: "approvals:read",
    label: "Approvals (read)",
    description: "Pending leave + attendance exceptions.",
    sensitive: false,
    group: "ops",
  },
  {
    id: "approvals:write",
    label: "Approvals (decide)",
    description: "Approve or reject leave and exceptions.",
    sensitive: false,
    group: "ops",
  },
  {
    id: "announcements:write",
    label: "Post announcement",
    description: "Create and publish company announcements.",
    sensitive: false,
    group: "ops",
  },
  {
    id: "holidays:read",
    label: "Holidays & announcements (read)",
    description: "Read holiday calendar and announcements.",
    sensitive: false,
    group: "ops",
  },
  {
    id: "holidays:write",
    label: "Holidays (write)",
    description: "Add or bulk-import company holidays.",
    sensitive: false,
    group: "ops",
  },

  // —— People & compliance ——
  {
    id: "documents:read",
    label: "Documents + expiry",
    description: "List documents and upcoming expiry alerts.",
    sensitive: false,
    group: "people",
  },
  {
    id: "employees:lifecycle",
    label: "Onboarding / offboarding status",
    description: "Who hasn’t finished onboarding or is on notice / exited.",
    sensitive: false,
    group: "people",
  },
  {
    id: "letters:read",
    label: "Offer letters (read)",
    description: "List created offer / appointment letters.",
    sensitive: false,
    group: "people",
  },
  {
    id: "letters:write",
    label: "Offer letters (create)",
    description: "Create offer/appointment drafts (print stays in-app).",
    sensitive: true,
    group: "people",
  },

  // —— Payroll & reports ——
  {
    id: "payroll:read",
    label: "Payroll (read)",
    description: "List salary slip summaries (amounts + status).",
    sensitive: true,
    group: "payroll",
  },
  {
    id: "payroll:write",
    label: "Payroll (generate / publish)",
    description: "Generate month payroll and publish slips.",
    sensitive: true,
    group: "payroll",
  },
  {
    id: "reports:read",
    label: "Reports",
    description: "Attendance, leave, headcount, late-arrival JSON reports.",
    sensitive: false,
    group: "payroll",
  },

  // —— Workspace ——
  {
    id: "tasks:read",
    label: "Tasks (read)",
    description: "List board tasks and assignees.",
    sensitive: false,
    group: "workspace",
  },
  {
    id: "tasks:write",
    label: "Tasks (create / move / edit / assign)",
    description: "Create, move, edit, reassign, or delete tasks.",
    sensitive: false,
    group: "workspace",
  },
  {
    id: "projects:read",
    label: "Projects (metadata)",
    description: "List projects — not vault secrets.",
    sensitive: false,
    group: "workspace",
  },
  {
    id: "projects:write",
    label: "Projects (create / update / share)",
    description: "Create or update projects and share with employees.",
    sensitive: false,
    group: "workspace",
  },
  {
    id: "projects:secrets",
    label: "Project credentials (read)",
    description: "Read vault key/value credentials. Use only when needed.",
    sensitive: true,
    group: "workspace",
  },
  {
    id: "projects:credentials_write",
    label: "Project credentials (write)",
    description: "Add or replace project vault credentials.",
    sensitive: true,
    group: "workspace",
  },

  // —— Company ——
  {
    id: "company:read",
    label: "Company & branding",
    description: "Company name, timezone, work policy, branding.",
    sensitive: false,
    group: "company",
  },
  {
    id: "company:write",
    label: "Work policy (write)",
    description: "Update work hours, grace period, weekly offs.",
    sensitive: false,
    group: "company",
  },
  {
    id: "audit:read",
    label: "Audit log",
    description: "Recent admin actions in the company workspace.",
    sensitive: false,
    group: "company",
  },
  {
    id: "notifications:read",
    label: "Notifications (read)",
    description: "List recent company notifications.",
    sensitive: false,
    group: "company",
  },
  {
    id: "notifications:write",
    label: "Notifications (send)",
    description: "Broadcast in-app/email/push notifications to company users.",
    sensitive: true,
    group: "company",
  },
] as const;

export type McpScopeId = (typeof MCP_SCOPES)[number]["id"];

export const MCP_SCOPE_IDS = MCP_SCOPES.map((s) => s.id) as McpScopeId[];

/** Recommended first token for Claude chat ops (+ most prompts). */
export const MCP_DEFAULT_SCOPE_IDS: McpScopeId[] = [
  "ops:digest",
  "company:read",
  "departments:read",
  "employees:read",
  "employees:detail",
  "employees:lifecycle",
  "attendance:read",
  "leaves:read",
  "approvals:read",
  "tasks:read",
  "projects:read",
  "holidays:read",
  "documents:read",
  "reports:read",
  "payroll:read",
];

/** Role presets for Admin → MCP token scopes (UI). */
export const MCP_SCOPE_PACKS = [
  {
    id: "manager",
    label: "Manager",
    description: "Team approvals only — no payroll amounts or vault secrets.",
    scopes: [
      "ops:digest",
      "company:read",
      "departments:read",
      "employees:read",
      "employees:detail",
      "attendance:read",
      "leaves:read",
      "approvals:read",
      "approvals:write",
      "tasks:read",
      "tasks:write",
      "holidays:read",
      "notifications:read",
    ] as McpScopeId[],
  },
  {
    id: "hr",
    label: "HR",
    description: "People ops, leave types, documents, letters — no payroll write.",
    scopes: [
      "ops:digest",
      "company:read",
      "departments:read",
      "departments:write",
      "employees:read",
      "employees:detail",
      "employees:write",
      "employees:lifecycle",
      "attendance:read",
      "attendance:write",
      "leaves:read",
      "leave_types:write",
      "approvals:read",
      "approvals:write",
      "announcements:write",
      "holidays:read",
      "holidays:write",
      "documents:read",
      "letters:read",
      "letters:write",
      "tasks:read",
      "reports:read",
      "notifications:read",
      "notifications:write",
    ] as McpScopeId[],
  },
  {
    id: "finance",
    label: "Finance",
    description: "Payroll close, bank CSV, slips — no employee create or vault secrets.",
    scopes: [
      "ops:digest",
      "company:read",
      "departments:read",
      "employees:read",
      "employees:detail",
      "attendance:read",
      "leaves:read",
      "approvals:read",
      "payroll:read",
      "payroll:write",
      "reports:read",
      "holidays:read",
      "audit:read",
    ] as McpScopeId[],
  },
] as const;

export type McpScopePackId = (typeof MCP_SCOPE_PACKS)[number]["id"];

export function isMcpScopeId(value: string): value is McpScopeId {
  return (MCP_SCOPE_IDS as string[]).includes(value);
}

export function normalizeScopes(input: unknown): McpScopeId[] {
  if (!Array.isArray(input)) return [];
  const set = new Set<McpScopeId>();
  for (const item of input) {
    if (typeof item === "string" && isMcpScopeId(item)) set.add(item);
  }
  return [...set];
}

export function hasScope(scopes: string[], required: McpScopeId | McpScopeId[]) {
  const need = Array.isArray(required) ? required : [required];
  return need.every((s) => scopes.includes(s));
}

export function hasAnyScope(scopes: string[], required: McpScopeId[]) {
  return required.some((s) => scopes.includes(s));
}
