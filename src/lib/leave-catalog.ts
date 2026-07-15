/**
 * Industry leave catalog — presets admins can opt into for their company.
 * Only CL is auto-seeded on company create. Everything else is chosen in Settings.
 */
export type LeaveCatalogScope = "company" | "employee";

export type LeaveCatalogPreset = {
  key: string;
  name: string;
  code: string;
  defaultDays: number;
  requiresProof: boolean;
  carryForward: boolean;
  maxCarryDays: number;
  sandwichRule: boolean;
  /** company = yearly allotment for all; employee = enable type, allocate per person */
  scope: LeaveCatalogScope;
  description: string;
};

export const LEAVE_CATALOG: LeaveCatalogPreset[] = [
  {
    key: "CL",
    name: "Casual Leave",
    code: "CL",
    defaultDays: 12,
    requiresProof: false,
    carryForward: false,
    maxCarryDays: 0,
    sandwichRule: true,
    scope: "company",
    description: "Short personal leave. Seeded by default for every company.",
  },
  {
    key: "SL",
    name: "Sick Leave",
    code: "SL",
    defaultDays: 10,
    requiresProof: true,
    carryForward: false,
    maxCarryDays: 0,
    sandwichRule: false,
    scope: "company",
    description: "Medical leave. Optional - add only if your company offers it.",
  },
  {
    key: "EL",
    name: "Earned Leave",
    code: "EL",
    defaultDays: 15,
    requiresProof: false,
    carryForward: true,
    maxCarryDays: 30,
    sandwichRule: true,
    scope: "company",
    description: "Planned annual leave with carry-forward.",
  },
  {
    key: "WFH",
    name: "WFH",
    code: "WFH",
    defaultDays: 24,
    requiresProof: false,
    carryForward: false,
    maxCarryDays: 0,
    sandwichRule: false,
    scope: "company",
    description: "Work-from-home allowance (if your policy uses leave days for WFH).",
  },
  {
    key: "CO",
    name: "Comp Off",
    code: "CO",
    defaultDays: 0,
    requiresProof: false,
    carryForward: false,
    maxCarryDays: 0,
    sandwichRule: false,
    scope: "employee",
    description:
      "Company enables Comp Off here. Days are granted per employee under Manage employee - not a fixed company pack.",
  },
];

export function getLeaveCatalogPreset(keyOrCode: string) {
  const k = keyOrCode.trim().toUpperCase();
  return LEAVE_CATALOG.find((p) => p.key === k || p.code === k) ?? null;
}

export function isEmployeeScopedLeave(code: string | null | undefined) {
  if (!code) return false;
  const preset = getLeaveCatalogPreset(code);
  return preset?.scope === "employee";
}
