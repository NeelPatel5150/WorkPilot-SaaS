import { LEAVE_CATALOG } from "@/lib/leave-catalog";

export type IndustryTemplateId = "it" | "factory" | "clinic";

export type IndustryTemplate = {
  id: IndustryTemplateId;
  label: string;
  description: string;
  weeklyOffs: number[];
  workStartHour: number;
  workStartMinute: number;
  graceMinutes: number;
  standardHours: number;
  /** Leave catalog codes to enable beyond CL */
  leaveCodes: string[];
  holidayPackId: string;
};

export const INDUSTRY_TEMPLATES: IndustryTemplate[] = [
  {
    id: "it",
    label: "IT / Agency",
    description: "Sat–Sun off, WFH + EL + SL, national holidays",
    weeklyOffs: [0, 6],
    workStartHour: 10,
    workStartMinute: 0,
    graceMinutes: 15,
    standardHours: 8,
    leaveCodes: ["SL", "EL", "WFH"],
    holidayPackId: "india-national",
  },
  {
    id: "factory",
    label: "Factory / Shop floor",
    description: "Sunday off, SL + EL, early start",
    weeklyOffs: [0],
    workStartHour: 8,
    workStartMinute: 0,
    graceMinutes: 10,
    standardHours: 8,
    leaveCodes: ["SL", "EL", "CO"],
    holidayPackId: "india-national",
  },
  {
    id: "clinic",
    label: "Clinic / Healthcare",
    description: "Sunday off, SL emphasis, national holidays",
    weeklyOffs: [0],
    workStartHour: 9,
    workStartMinute: 0,
    graceMinutes: 10,
    standardHours: 8,
    leaveCodes: ["SL", "EL"],
    holidayPackId: "india-national",
  },
];

export function getIndustryTemplate(id: string): IndustryTemplate | null {
  return INDUSTRY_TEMPLATES.find((t) => t.id === id) ?? null;
}

export function leavePresetsForCodes(codes: string[]) {
  return LEAVE_CATALOG.filter((p) => codes.includes(p.code));
}
