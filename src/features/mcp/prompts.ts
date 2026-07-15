import { MCP_SCOPE_IDS, type McpScopeId } from "@/features/mcp/scopes";

export type McpPromptDef = {
  name: string;
  description: string;
  scopes: McpScopeId[];
  arguments: Array<{ name: string; description: string; required?: boolean }>;
  template: string;
};

/**
 * Safety rules for all prompts:
 * - Prefer read scopes; never instruct irreversible writes unless user confirms.
 * - Never ask the model to invent salaries / bank numbers.
 * - Always start with get_token_context when company context matters.
 */
export const MCP_PROMPTS: McpPromptDef[] = [
  {
    name: "full_company_command_center",
    description:
      "Authorized full-scope leadership briefing (ops → people → payroll → docs → workspace). Needs a token with every MCP scope (Select all).",
    // Requires EVERY scope so it only appears for full-power tokens.
    scopes: [...MCP_SCOPE_IDS],
    arguments: [
      {
        name: "year",
        description: "Payroll / report year (optional)",
        required: false,
      },
      {
        name: "month",
        description: "Payroll month 1–12 (optional)",
        required: false,
      },
    ],
    template: `Please run a read-only leadership briefing for my WorkPilot company. I am an admin and I authorize this pull.

Optional period{{#year}}: {{year}}/{{month}}{{/year}}.

Use WorkPilot tools (start with get_token_context), then cover:
1) Company / policy (get_company_info)
2) Today ops (get_ops_digest, list_today_attendance, list_pending_approvals)
3) People (list_departments, list_employees or search_employees, list_lifecycle_status)
4) Leave (list_leave_types, list_leave_requests)
5) Holidays & announcements
6) Documents + expiring docs
7) Payroll slips for the period (list_payslips; mention Admin → Payroll bank CSV if published — do not invent accounts)
8) Reports (attendance / leave as useful)
9) Workspace (list_tasks, list_projects — metadata only, no credentials)
10) Offer letters, recent audit log, recent notifications

Write one short briefing:
A. Context
B. Today’s risks
C. People
D. Payroll readiness
E. Docs / compliance
F. Workspace
G. Suggested next human actions

Stay read-only. Do not approve, generate payroll, publish, notify, or edit data unless I separately ask for a specific action after this briefing.`,
  },
  {
    name: "daily_ops_brief",
    description:
      "Morning ops brief: digest, today's attendance, pending approvals, and open tasks.",
    scopes: ["ops:digest", "attendance:read", "approvals:read", "tasks:read"],
    arguments: [],
    template: `You are connected to WorkPilot via MCP for this company.

Run these tools in order and produce a concise ops brief for leadership:
1. get_token_context — confirm company
2. get_ops_digest
3. list_today_attendance
4. list_pending_approvals
5. list_tasks (focus TODO / IN_PROGRESS)

Format: 4–6 bullets max. Flag anything needing admin action today.
Do NOT approve leave or change attendance unless the user explicitly asks.`,
  },
  {
    name: "pending_approvals_review",
    description: "Review all pending leave and attendance exceptions with recommended actions.",
    scopes: ["approvals:read", "employees:read"],
    arguments: [],
    template: `Using WorkPilot MCP tools:
1. get_token_context
2. list_pending_approvals
3. For each pending item, use get_employee_detail or search_employees if names are unclear.

Summarize each pending item with: employee, type, dates, reason, and a recommended approve/reject note.
Do NOT approve or reject unless the user explicitly asks.`,
  },
  {
    name: "payroll_month_check",
    description: "Payroll readiness check for a month: slips, drafts, and publish status.",
    scopes: ["payroll:read", "reports:read"],
    arguments: [
      {
        name: "year",
        description: "Payroll year (defaults to current year)",
        required: false,
      },
      {
        name: "month",
        description: "Payroll month 1–12 (defaults to current month)",
        required: false,
      },
    ],
    template: `Using WorkPilot MCP for payroll review{{#year}} ({{year}}/{{month}}){{/year}}:
1. get_token_context
2. list_payslips — use year/month from args or current month
3. get_report kind=attendance for the same period if helpful

Report: total slips, DRAFT vs PUBLISHED counts, employees missing slips, and anything blocking publish.
Never publish payslips or generate payroll unless the user explicitly confirms.`,
  },
  {
    name: "exception_blockers",
    description:
      "List pending attendance exceptions that should be cleared before generating payroll.",
    scopes: ["approvals:read", "attendance:read"],
    arguments: [],
    template: `WorkPilot pre-payroll exception check:
1. get_token_context
2. list_pending_approvals — focus on attendance exceptions
3. list_today_attendance or list_recent_attendance if needed for context

Output:
- Count of pending exceptions
- Table-style bullets: employee, date, type, reason
- Which ones are likely to change LOP if approved

Do NOT approve exceptions unless the user explicitly asks.`,
  },
  {
    name: "attendance_snapshot",
    description: "Today + recent attendance snapshot: present, late, missing punches.",
    scopes: ["attendance:read", "ops:digest"],
    arguments: [],
    template: `WorkPilot attendance snapshot:
1. get_token_context
2. get_ops_digest
3. list_today_attendance
4. list_recent_attendance (short window)

Summarize who's in, who's late, and anybody with odd punch patterns.
Do not adjust punches unless the user asks.`,
  },
  {
    name: "leave_queue_and_types",
    description: "Pending leave queue plus company leave types for HR triage.",
    scopes: ["leaves:read", "approvals:read"],
    arguments: [],
    template: `WorkPilot leave triage:
1. get_token_context
2. list_leave_types
3. list_pending_approvals (leave items)
4. list_leave_requests if available / useful for context

Summarize pending leave by type and urgency (start date soon). Recommend review order only — no decisions without user confirmation.`,
  },
  {
    name: "expiring_documents_alert",
    description: "Documents nearing expiry so HR can chase renewals.",
    scopes: ["documents:read"],
    arguments: [
      {
        name: "withinDays",
        description: "Look-ahead window in days (default 30)",
        required: false,
      },
    ],
    template: `WorkPilot document expiry watch{{#withinDays}} (within {{withinDays}} days){{/withinDays}}:
1. get_token_context
2. list_expiring_documents (use withinDays if provided)
3. list_documents if needed for context

List each at-risk document with employee (if any), name, and expiry date.
Suggest outreach wording; do not send notifications unless the user asks.`,
  },
  {
    name: "lifecycle_snapshot",
    description: "Onboarding incomplete + on-notice / exited employees at a glance.",
    scopes: ["employees:lifecycle", "employees:read"],
    arguments: [],
    template: `WorkPilot people lifecycle snapshot:
1. get_token_context
2. list_lifecycle_status
3. search_employees or list_employees only if you need names clarified

Report: incomplete onboarding, on-notice, recently exited. Keep sensitive — no speculation.`,
  },
  {
    name: "open_work_board",
    description: "Open tasks and project list for workspace stand-up.",
    scopes: ["tasks:read", "projects:read"],
    arguments: [],
    template: `WorkPilot workspace stand-up:
1. get_token_context
2. list_tasks (highlight TODO / IN_PROGRESS / blocked)
3. list_projects (metadata only — no credentials)

Summarize owners and bottlenecks. Never read project secrets unless the user explicitly asks and the token has that scope.`,
  },
  {
    name: "holiday_calendar_brief",
    description: "Upcoming holidays so planners can set expectations.",
    scopes: ["holidays:read"],
    arguments: [],
    template: `WorkPilot holiday brief:
1. get_token_context
2. list_holidays
3. list_announcements if useful for holiday notices

List upcoming holidays chronologically with dates. Note any gaps if the calendar looks empty.`,
  },
  {
    name: "payroll_bank_file_prep",
    description:
      "Check published payslips readiness before downloading the bank salary CSV (no write).",
    scopes: ["payroll:read", "employees:read"],
    arguments: [
      {
        name: "year",
        description: "Payroll year",
        required: false,
      },
      {
        name: "month",
        description: "Payroll month 1–12",
        required: false,
      },
    ],
    template: `WorkPilot bank-file prep (read-only){{#year}} for {{year}}/{{month}}{{/year}}:
1. get_token_context
2. list_payslips for the month — count PUBLISHED vs DRAFT
3. list_employees / search_employees — flag anyone missing from slips if obvious

Tell the admin:
- Are enough slips published to credit salaries?
- Reminder: download bank CSV from Admin → Payroll in the web app (NEFT file).
- Reminder: employees need bank IFSC/account filled for a clean CSV.

Do NOT generate, publish, or invent bank numbers.`,
  },
  {
    name: "company_policy_overview",
    description: "Company branding identity + work timing policy overview.",
    scopes: ["company:read"],
    arguments: [],
    template: `WorkPilot company overview:
1. get_token_context
2. get_company_info

Summarize company name, timezone, work start, grace, standard hours, weekly offs.
No policy changes unless the user asks.`,
  },
];

export function renderPromptTemplate(
  template: string,
  args: Record<string, string | undefined>
) {
  let out = template;
  for (const [key, value] of Object.entries(args)) {
    if (value != null && value !== "") {
      out = out.replaceAll(`{{${key}}}`, value);
    }
  }
  out = out.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, key, body) => {
    const val = args[key];
    return val != null && val !== "" ? body.replaceAll(`{{${key}}}`, val) : "";
  });
  return out.trim();
}

export function listPromptsForScopes(scopes: string[]) {
  return MCP_PROMPTS.filter((p) =>
    p.scopes.every((s) => scopes.includes(s))
  ).map((p) => ({
    name: p.name,
    description: p.description,
    arguments: p.arguments.map((a) => ({
      name: a.name,
      description: a.description,
      required: a.required ?? false,
    })),
  }));
}

export function getPromptForScopes(
  scopes: string[],
  name: string,
  args: Record<string, string | undefined>
) {
  const prompt = MCP_PROMPTS.find((p) => p.name === name);
  if (!prompt) return null;
  if (!prompt.scopes.every((s) => scopes.includes(s))) return null;
  return {
    description: prompt.description,
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: renderPromptTemplate(prompt.template, args),
        },
      },
    ],
  };
}
