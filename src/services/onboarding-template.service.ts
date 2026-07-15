import { assertPermission } from "@/lib/session";
import { ValidationError } from "@/lib/errors";
import { updateWorkPolicy } from "@/services/policy.service";
import { addCatalogLeaveType } from "@/services/leave.service";
import { importHolidays } from "@/services/holiday.service";
import { activityRepo } from "@/repositories/activity.repository";
import {
  getIndustryTemplate,
  type IndustryTemplateId,
} from "@/lib/industry-templates";
import { getIndiaHolidayPack } from "@/lib/india-holiday-packs";
import type { UserRole } from "@/generated/prisma";

export async function applyIndustryTemplate(
  actor: { id: string; companyId: string; role: UserRole },
  templateId: IndustryTemplateId
) {
  assertPermission(actor.role, "settings:manage");
  const template = getIndustryTemplate(templateId);
  if (!template) throw new ValidationError("Unknown industry template");

  await updateWorkPolicy(actor, {
    workStartHour: template.workStartHour,
    workStartMinute: template.workStartMinute,
    graceMinutes: template.graceMinutes,
    standardHours: template.standardHours,
    weeklyOffs: template.weeklyOffs,
  });

  for (const code of template.leaveCodes) {
    try {
      await addCatalogLeaveType(actor, code);
    } catch {
      // already enabled / name conflict — ignore
    }
  }

  const pack = getIndiaHolidayPack(template.holidayPackId);
  let holidaysImported = 0;
  if (pack) {
    try {
      const result = await importHolidays(actor, pack.holidays);
      holidaysImported = result.imported;
    } catch {
      // all may already exist
    }
  }

  await activityRepo.log(actor.companyId, "onboarding.industry_template", actor.id, {
    templateId,
  });

  return {
    templateId,
    leaveCodes: template.leaveCodes,
    holidaysImported,
  };
}

export async function importIndiaHolidayPack(
  actor: { id: string; companyId: string; role: UserRole },
  packId: string,
  year?: number
) {
  assertPermission(actor.role, "settings:manage");
  const pack = getIndiaHolidayPack(packId, year);
  if (!pack) throw new ValidationError("Unknown holiday pack");
  return importHolidays(actor, pack.holidays);
}
