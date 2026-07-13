"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { registerCompany } from "@/services/company.service";
import { createEmployee, listEmployees } from "@/services/employee.service";
import { createDepartment, deleteDepartment } from "@/services/department.service";
import { checkIn, checkOut } from "@/services/attendance.service";
import { applyLeave, decideLeave } from "@/services/leave.service";
import { requireUser, portalHomeForRole } from "@/lib/session";
import { toActionError } from "@/lib/errors";
import { auth } from "@/lib/auth";
import { companyRepo } from "@/repositories/company.repository";
import type { UserRole } from "@/generated/prisma";

const registerSchema = z.object({
  companyName: z.string().min(2),
  slug: z.string().optional(),
  adminName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  primaryColor: z.string().optional(),
});

export async function registerCompanyAction(formData: FormData) {
  try {
    const parsed = registerSchema.parse({
      companyName: formData.get("companyName"),
      slug: formData.get("slug") || undefined,
      adminName: formData.get("adminName"),
      email: formData.get("email"),
      password: formData.get("password"),
      primaryColor: formData.get("primaryColor") || undefined,
    });

    await registerCompany(parsed);

    await auth.api.signInEmail({
      body: { email: parsed.email, password: parsed.password },
      headers: await headers(),
    });

    redirect("/onboarding");
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) throw error;
    return toActionError(error);
  }
}

export async function completeOnboardingAction() {
  try {
    const user = await requireUser();
    if (user.role !== "COMPANY_ADMIN" && user.role !== "SUPER_ADMIN" && user.role !== "HR") {
      return { error: "Only company admins can finish setup" };
    }
    await companyRepo.markSetupComplete(user.companyId!);
    revalidatePath("/admin/dashboard");
    revalidatePath("/onboarding");
    return { success: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createEmployeeAction(formData: FormData) {
  try {
    const user = await requireUser();
    const schema = z.object({
      email: z.string().email(),
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      designation: z.string().optional(),
      departmentId: z.string().optional(),
      role: z.enum(["COMPANY_ADMIN", "HR", "MANAGER", "EMPLOYEE"]).optional(),
      phone: z.string().optional(),
    });

    const parsed = schema.parse({
      email: formData.get("email"),
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      designation: formData.get("designation") || undefined,
      departmentId: formData.get("departmentId") || undefined,
      role: (formData.get("role") as UserRole) || "EMPLOYEE",
      phone: formData.get("phone") || undefined,
    });

    const created = await createEmployee(
      { id: user.id, companyId: user.companyId!, role: user.role },
      parsed
    );
    revalidatePath("/admin/employees");
    return {
      success: true as const,
      employeeCode: created.employeeCode,
      tempPassword: created.tempPassword,
      email: created.email,
      inviteSent: created.inviteSent,
      acceptUrl: created.acceptUrl,
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createDepartmentAction(formData: FormData) {
  try {
    const user = await requireUser();
    const name = String(formData.get("name") || "");
    await createDepartment(
      { id: user.id, companyId: user.companyId!, role: user.role },
      name
    );
    revalidatePath("/admin/departments");
    return { success: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteDepartmentAction(id: string) {
  try {
    const user = await requireUser();
    await deleteDepartment(
      { id: user.id, companyId: user.companyId!, role: user.role },
      id
    );
    revalidatePath("/admin/departments");
    return { success: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function checkInAction(formData?: FormData) {
  try {
    const user = await requireUser();
    const h = await headers();
    const latRaw = formData?.get("lat");
    const lngRaw = formData?.get("lng");
    await checkIn(
      { id: user.id, companyId: user.companyId!, role: user.role },
      {
        ip: h.get("x-forwarded-for") ?? undefined,
        lat: latRaw ? Number(latRaw) : undefined,
        lng: lngRaw ? Number(lngRaw) : undefined,
      }
    );
    revalidatePath("/employee/attendance");
    revalidatePath("/employee/dashboard");
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/attendance");
    return { success: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function checkOutAction() {
  try {
    const user = await requireUser();
    await checkOut({ id: user.id, companyId: user.companyId!, role: user.role });
    revalidatePath("/employee/attendance");
    revalidatePath("/employee/dashboard");
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/attendance");
    return { success: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function applyLeaveAction(formData: FormData) {
  try {
    const user = await requireUser();
    const schema = z.object({
      leaveTypeId: z.string().min(1),
      startDate: z.string().min(1),
      endDate: z.string().min(1),
      isHalfDay: z.boolean().optional(),
      reason: z.string().optional(),
      coverEmployeeId: z.string().optional(),
    });

    const coverRaw = String(formData.get("coverEmployeeId") || "");
    const parsed = schema.parse({
      leaveTypeId: formData.get("leaveTypeId"),
      startDate: formData.get("startDate"),
      endDate: formData.get("endDate"),
      isHalfDay: formData.get("isHalfDay") === "on",
      reason: formData.get("reason") || undefined,
      coverEmployeeId: coverRaw || undefined,
    });

    await applyLeave(
      { id: user.id, companyId: user.companyId!, role: user.role },
      parsed
    );
    revalidatePath("/employee/leaves");
    revalidatePath("/employee/dashboard");
    revalidatePath("/admin/leaves");
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/notifications");
    return { success: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function decideLeaveAction(
  requestId: string,
  decision: "APPROVED" | "REJECTED",
  comment?: string
) {
  try {
    const user = await requireUser();
    await decideLeave(
      { id: user.id, companyId: user.companyId!, role: user.role },
      requestId,
      decision,
      comment
    );
    revalidatePath("/admin/leaves");
    revalidatePath("/admin/dashboard");
    revalidatePath("/employee/leaves");
    revalidatePath("/employee/dashboard");
    revalidatePath("/admin/notifications");
    revalidatePath("/employee/notifications");
    return { success: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateBrandingAction(formData: FormData) {
  try {
    const user = await requireUser();
    if (user.role !== "COMPANY_ADMIN" && user.role !== "SUPER_ADMIN") {
      return { error: "Only company admins can update branding" };
    }
    const companyId = user.companyId!;
    const patch: {
      name?: string;
      primaryColor?: string;
      secondaryColor?: string;
      logoUrl?: string | null;
      faviconUrl?: string | null;
      logoData?: Buffer | null;
      logoMime?: string | null;
      faviconData?: Buffer | null;
      faviconMime?: string | null;
    } = {
      name: String(formData.get("name") || user.company!.name),
      primaryColor: String(formData.get("primaryColor") || user.company!.primaryColor),
      secondaryColor: String(
        formData.get("secondaryColor") || user.company!.secondaryColor
      ),
    };

    const logo = formData.get("logo");
    if (logo instanceof File && logo.size > 0) {
      if (logo.size > 2 * 1024 * 1024) return { error: "Logo must be under 2MB" };
      const buf = Buffer.from(await logo.arrayBuffer());
      patch.logoData = buf;
      patch.logoMime = logo.type || "image/png";
      patch.logoUrl = `/api/brand/icon?kind=logo&companyId=${companyId}&v=${Date.now()}`;
    }
    const favicon = formData.get("favicon");
    if (favicon instanceof File && favicon.size > 0) {
      if (favicon.size > 512 * 1024) return { error: "Favicon must be under 512KB" };
      const buf = Buffer.from(await favicon.arrayBuffer());
      patch.faviconData = buf;
      patch.faviconMime = favicon.type || "image/png";
      patch.faviconUrl = `/api/brand/icon?kind=favicon&companyId=${companyId}&v=${Date.now()}`;
    }

    await companyRepo.updateBranding(companyId, patch);
    revalidatePath("/admin/settings");
    revalidatePath("/admin/dashboard");
    revalidatePath("/employee/dashboard");
    return { success: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getEmployeesForAdmin() {
  const user = await requireUser();
  return listEmployees(user.companyId!, user.role);
}

export async function redirectAfterLogin() {
  const user = await requireUser();
  redirect(portalHomeForRole(user.role));
}

export async function uploadDocumentAction(formData: FormData) {
  try {
    const user = await requireUser();
    const file = formData.get("file");
    if (!(file instanceof File)) return { error: "File is required" };
    const employeeId = String(formData.get("employeeId") || "") || null;
    const expiresRaw = String(formData.get("expiresAt") || "");
    const expiresAt = expiresRaw ? new Date(expiresRaw) : null;
    const { uploadDocument } = await import("@/services/document.service");
    await uploadDocument(
      { id: user.id, companyId: user.companyId!, role: user.role },
      file,
      employeeId,
      expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : null
    );
    revalidatePath("/admin/documents");
    revalidatePath("/employee/documents");
    revalidatePath("/admin/notifications");
    revalidatePath("/employee/notifications");
    return { success: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteDocumentAction(id: string) {
  try {
    const user = await requireUser();
    const { removeDocument } = await import("@/services/document.service");
    await removeDocument(
      { id: user.id, companyId: user.companyId!, role: user.role },
      id
    );
    revalidatePath("/admin/documents");
    revalidatePath("/employee/documents");
    return { success: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createHolidayAction(formData: FormData) {
  try {
    const user = await requireUser();
    const { createHoliday } = await import("@/services/holiday.service");
    await createHoliday(
      { id: user.id, companyId: user.companyId!, role: user.role },
      String(formData.get("name") || ""),
      String(formData.get("date") || "")
    );
    revalidatePath("/admin/holidays");
    revalidatePath("/employee/leaves");
    revalidatePath("/admin/notifications");
    revalidatePath("/employee/notifications");
    return { success: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function importHolidaysAction(formData: FormData) {
  try {
    const user = await requireUser();
    const { importHolidays } = await import("@/services/holiday.service");
    const {
      parseHolidayImportText,
      fetchGoogleSheetCsv,
    } = await import("@/lib/holiday-import");

    let text = String(formData.get("csvText") || "").trim();
    const sheetUrl = String(formData.get("sheetUrl") || "").trim();
    const file = formData.get("csvFile");

    if (!text && file instanceof File && file.size > 0) {
      text = await file.text();
    }
    if (!text && sheetUrl) {
      text = await fetchGoogleSheetCsv(sheetUrl);
    }
    if (!text) {
      return { error: "Paste CSV, upload a file, or add a Google Sheet link" };
    }

    const parsed = parseHolidayImportText(text);
    if (parsed.rows.length === 0) {
      return {
        error:
          parsed.errors[0] ||
          "No valid rows. Use columns: name, date (YYYY-MM-DD or DD/MM/YYYY)",
      };
    }

    const result = await importHolidays(
      { id: user.id, companyId: user.companyId!, role: user.role },
      parsed.rows
    );
    revalidatePath("/admin/holidays");
    revalidatePath("/employee/leaves");
    revalidatePath("/onboarding");
    return {
      success: true as const,
      imported: result.imported,
      skipped: result.skipped,
      parseErrors: parsed.errors.slice(0, 5),
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteHolidayAction(id: string) {
  try {
    const user = await requireUser();
    const { deleteHoliday } = await import("@/services/holiday.service");
    await deleteHoliday(
      { id: user.id, companyId: user.companyId!, role: user.role },
      id
    );
    revalidatePath("/admin/holidays");
    return { success: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createAnnouncementAction(formData: FormData) {
  try {
    const user = await requireUser();
    const { createAnnouncement } = await import("@/services/holiday.service");
    await createAnnouncement(
      { id: user.id, companyId: user.companyId!, role: user.role },
      String(formData.get("title") || ""),
      String(formData.get("body") || "")
    );
    revalidatePath("/admin/announcements");
    revalidatePath("/employee/dashboard");
    revalidatePath("/admin/notifications");
    revalidatePath("/employee/notifications");
    return { success: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteAnnouncementAction(id: string) {
  try {
    const user = await requireUser();
    const { deleteAnnouncement } = await import("@/services/holiday.service");
    await deleteAnnouncement(
      { id: user.id, companyId: user.companyId!, role: user.role },
      id
    );
    revalidatePath("/admin/announcements");
    return { success: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function markNotificationReadAction(id: string) {
  try {
    const user = await requireUser();
    const { markNotificationRead } = await import("@/services/notification.service");
    await markNotificationRead(user.companyId!, user.id, id);
    revalidatePath("/admin/notifications");
    revalidatePath("/employee/notifications");
    return { success: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function markAllNotificationsReadAction() {
  try {
    const user = await requireUser();
    const { markAllNotificationsRead } = await import(
      "@/services/notification.service"
    );
    await markAllNotificationsRead(user.companyId!, user.id);
    revalidatePath("/admin/notifications");
    revalidatePath("/employee/notifications");
    return { success: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function uploadAvatarAction(formData: FormData) {
  try {
    const user = await requireUser();
    const file = formData.get("avatar");
    if (!(file instanceof File)) return { error: "Image is required" };
    const { updateUserAvatar } = await import("@/services/profile.service");
    const image = await updateUserAvatar(user.id, user.companyId!, file);
    revalidatePath("/admin/dashboard");
    revalidatePath("/employee/dashboard");
    revalidatePath("/employee/profile");
    revalidatePath("/admin/settings");
    revalidatePath("/admin/employees");
    return { success: true, image };
  } catch (error) {
    return toActionError(error);
  }
}

export async function acceptInviteAction(formData: FormData) {
  try {
    const { acceptEmployeeInvite } = await import("@/services/employee.service");
    const result = await acceptEmployeeInvite({
      email: String(formData.get("email") || ""),
      tempPassword: String(formData.get("tempPassword") || "") || undefined,
      inviteToken: String(formData.get("inviteToken") || "") || undefined,
      newPassword: String(formData.get("newPassword") || ""),
    });
    return { success: true as const, email: result.email };
  } catch (error) {
    return toActionError(error);
  }
}

export async function generatePayrollAction(formData: FormData) {
  try {
    const user = await requireUser();
    const monthRaw = String(formData.get("month") || "");
    if (!/^\d{4}-\d{2}$/.test(monthRaw)) return { error: "Invalid month" };
    const [year, month] = monthRaw.split("-").map(Number);
    const employeeId = String(formData.get("employeeId") || "") || null;
    const { generateMonthPayroll } = await import("@/services/payroll.service");
    const result = await generateMonthPayroll(
      { id: user.id, companyId: user.companyId!, role: user.role },
      {
        year,
        month,
        employeeId,
        defaultBasic: Number(formData.get("defaultBasic") || 0),
        allowances: Number(formData.get("allowances") || 0),
        deductions: Number(formData.get("deductions") || 0),
        pfPercent: Number(formData.get("pfPercent") || 12),
        esiPercent: Number(formData.get("esiPercent") || 0.75),
        tds: Number(formData.get("tds") || 0),
        publish: formData.get("publish") === "1",
      }
    );
    revalidatePath("/admin/payroll");
    revalidatePath("/employee/payslips");
    revalidatePath("/employee/notifications");
    return { success: true as const, ...result };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getPayrollPreviewAction(employeeId: string, monthRaw: string) {
  try {
    const user = await requireUser();
    if (!employeeId) return { error: "Employee required" };
    if (!/^\d{4}-\d{2}$/.test(monthRaw)) return { error: "Invalid month" };
    const [year, month] = monthRaw.split("-").map(Number);
    const { getEmployeePayrollPreview } = await import("@/services/payroll.service");
    const preview = await getEmployeePayrollPreview(
      user.companyId!,
      user.role,
      employeeId,
      year,
      month
    );
    return { success: true as const, preview };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateTenantSettingsAction(formData: FormData) {
  try {
    const user = await requireUser();
    if (user.role !== "COMPANY_ADMIN" && user.role !== "SUPER_ADMIN") {
      return { error: "Only company admins can update tenant settings" };
    }
    const customDomain = String(formData.get("customDomain") || "").trim() || null;
    const whatsappNumber = String(formData.get("whatsappNumber") || "").trim() || null;
    const fromName = String(formData.get("fromName") || "").trim() || null;
    const fromEmail = String(formData.get("fromEmail") || "").trim() || null;

    await companyRepo.updateBranding(user.companyId!, {
      customDomain,
      whatsappNumber,
      smtpConfig: {
        ...(fromName ? { fromName } : {}),
        ...(fromEmail ? { fromEmail } : {}),
      },
    });
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateWorkPolicyAction(formData: FormData) {
  try {
    const user = await requireUser();
    const { updateWorkPolicy } = await import("@/services/policy.service");
    const latRaw = String(formData.get("officeLat") || "").trim();
    const lngRaw = String(formData.get("officeLng") || "").trim();
    const ipRaw = String(formData.get("officeIpAllowlist") || "").trim();
    const weeklyOffs = formData
      .getAll("weeklyOff")
      .map((v) => Number(v))
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);

    await updateWorkPolicy(
      { companyId: user.companyId!, role: user.role },
      {
        workStartHour: Number(formData.get("workStartHour")),
        workStartMinute: Number(formData.get("workStartMinute")),
        graceMinutes: Number(formData.get("graceMinutes")),
        standardHours: Number(formData.get("standardHours")),
        weeklyOffs,
        officeLat: latRaw === "" ? null : Number(latRaw),
        officeLng: lngRaw === "" ? null : Number(lngRaw),
        geofenceRadiusM: Number(formData.get("geofenceRadiusM") || 0),
        officeIpAllowlist: ipRaw || null,
      }
    );
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateLeaveTypeAction(formData: FormData) {
  try {
    const user = await requireUser();
    const { updateLeaveType } = await import("@/services/leave.service");
    await updateLeaveType(
      { id: user.id, companyId: user.companyId!, role: user.role },
      String(formData.get("id") || ""),
      {
        name: String(formData.get("name") || ""),
        code: String(formData.get("code") || "") || null,
        defaultDays: Number(formData.get("defaultDays")),
        maxCarryDays: Number(formData.get("maxCarryDays") || 0),
        requiresProof: formData.get("requiresProof") === "on",
        carryForward: formData.get("carryForward") === "on",
        sandwichRule: formData.get("sandwichRule") === "on",
        isApplicable: formData.get("isApplicable") === "on",
      }
    );
    revalidatePath("/admin/settings");
    revalidatePath("/employee/leaves");
    revalidatePath("/employee/dashboard");
    return { success: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createLeaveTypeAction(formData: FormData) {
  try {
    const user = await requireUser();
    const { createLeaveType } = await import("@/services/leave.service");
    await createLeaveType(
      { id: user.id, companyId: user.companyId!, role: user.role },
      {
        name: String(formData.get("name") || ""),
        code: String(formData.get("code") || "") || null,
        defaultDays: Number(formData.get("defaultDays") || 0),
        isApplicable: formData.get("isApplicable") === "on",
      }
    );
    revalidatePath("/admin/settings");
    revalidatePath("/employee/leaves");
    revalidatePath("/employee/dashboard");
    return { success: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function requestExceptionAction(formData: FormData) {
  try {
    const user = await requireUser();
    const { requestAttendanceException } = await import("@/services/exception.service");
    const schema = z.object({
      type: z.enum(["MISSING_CHECKOUT", "FORGOT_PUNCH", "WFH", "ADJUSTMENT"]),
      date: z.string().min(1),
      reason: z.string().optional(),
      proposedCheckIn: z.string().optional(),
      proposedCheckOut: z.string().optional(),
    });
    const parsed = schema.parse({
      type: formData.get("type"),
      date: formData.get("date"),
      reason: formData.get("reason") || undefined,
      proposedCheckIn: formData.get("proposedCheckIn") || undefined,
      proposedCheckOut: formData.get("proposedCheckOut") || undefined,
    });
    await requestAttendanceException(
      { id: user.id, companyId: user.companyId!, role: user.role },
      parsed
    );
    revalidatePath("/employee/attendance");
    revalidatePath("/admin/exceptions");
    revalidatePath("/admin/notifications");
    return { success: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function decideExceptionAction(
  id: string,
  decision: "APPROVED" | "REJECTED",
  comment?: string
) {
  try {
    const user = await requireUser();
    const { decideException } = await import("@/services/exception.service");
    await decideException(
      { id: user.id, companyId: user.companyId!, role: user.role },
      id,
      decision,
      comment
    );
    revalidatePath("/admin/exceptions");
    revalidatePath("/admin/attendance");
    revalidatePath("/employee/attendance");
    revalidatePath("/admin/notifications");
    revalidatePath("/employee/notifications");
    return { success: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function offboardEmployeeAction(formData: FormData) {
  try {
    const user = await requireUser();
    const { offboardEmployee } = await import("@/services/employee-lifecycle.service");
    const employeeId = String(formData.get("employeeId") || "");
    const statusRaw = String(formData.get("status") || "RESIGNED");
    const status =
      statusRaw === "ON_NOTICE" || statusRaw === "RESIGNED" || statusRaw === "TERMINATED"
        ? statusRaw
        : "RESIGNED";
    await offboardEmployee(
      { id: user.id, companyId: user.companyId!, role: user.role },
      employeeId,
      {
        exitReason: String(formData.get("exitReason") || "") || undefined,
        status,
      }
    );
    revalidatePath("/admin/employees");
    return { success: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function reactivateEmployeeAction(formData: FormData) {
  try {
    const user = await requireUser();
    const { reactivateEmployee } = await import(
      "@/services/employee-lifecycle.service"
    );
    const employeeId = String(formData.get("employeeId") || "");
    await reactivateEmployee(
      { id: user.id, companyId: user.companyId!, role: user.role },
      employeeId
    );
    revalidatePath("/admin/employees");
    return { success: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function checkLoginAccessAction(email: string) {
  try {
    const { checkLoginAccess } = await import("@/services/login-access.service");
    return await checkLoginAccess(email);
  } catch {
    return { allowed: true as const };
  }
}

export async function publishSlipAction(id: string) {
  try {
    const user = await requireUser();
    const { publishSalarySlip } = await import("@/services/payroll.service");
    await publishSalarySlip(
      { id: user.id, companyId: user.companyId!, role: user.role },
      id
    );
    revalidatePath("/admin/payroll");
    revalidatePath("/employee/payslips");
    revalidatePath("/employee/notifications");
    return { success: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function lockPayrollMonthAction(formData: FormData) {
  try {
    const user = await requireUser();
    const monthRaw = String(formData.get("month") || "");
    let year: number;
    let month: number;
    if (/^\d{4}-\d{2}$/.test(monthRaw)) {
      [year, month] = monthRaw.split("-").map(Number);
    } else {
      year = Number(formData.get("year"));
      month = Number(formData.get("month"));
    }
    const { lockPayrollMonth } = await import("@/services/payroll.service");
    await lockPayrollMonth(
      { id: user.id, companyId: user.companyId!, role: user.role },
      year,
      month
    );
    revalidatePath("/admin/payroll");
    return { success: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateSalarySlipAction(formData: FormData) {
  try {
    const user = await requireUser();
    const id = String(formData.get("id") || formData.get("slipId") || "");
    const num = (key: string) => {
      const v = formData.get(key);
      if (v === null || v === "") return undefined;
      return Number(v);
    };
    const notesRaw = formData.get("notes");
    const { updateSalarySlip } = await import("@/services/payroll.service");
    await updateSalarySlip(
      { id: user.id, companyId: user.companyId!, role: user.role },
      id,
      {
        basic: num("basic"),
        allowances: num("allowances"),
        deductions: num("deductions"),
        pf: num("pf"),
        esi: num("esi"),
        tds: num("tds"),
        lopDays: num("lopDays"),
        notes: notesRaw != null && String(notesRaw) !== "" ? String(notesRaw) : undefined,
      }
    );
    revalidatePath("/admin/payroll");
    revalidatePath("/employee/payslips");
    return { success: true };
  } catch (error) {
    return toActionError(error);
  }
}
