"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { toActionError } from "@/lib/errors";

export async function createOfferLetterAction(formData: FormData) {
  try {
    const user = await requireUser();
    const { createOfferLetter } = await import("@/services/letter.service");
    const salaryRaw = String(formData.get("salaryAmount") || "").trim();
    const letter = await createOfferLetter(
      { id: user.id, companyId: user.companyId!, role: user.role },
      {
        letterType:
          String(formData.get("letterType") || "OFFER") === "APPOINTMENT"
            ? "APPOINTMENT"
            : "OFFER",
        employeeId: String(formData.get("employeeId") || "") || null,
        candidateName: String(formData.get("candidateName") || ""),
        designation: String(formData.get("designation") || ""),
        department: String(formData.get("department") || "") || null,
        joiningDate: String(formData.get("joiningDate") || "") || null,
        salaryAmount: salaryRaw ? Number(salaryRaw) : null,
        salaryCurrency: String(formData.get("salaryCurrency") || "INR"),
        employmentType: String(formData.get("employmentType") || "") || null,
        reportingTo: String(formData.get("reportingTo") || "") || null,
        location: String(formData.get("location") || "") || null,
        bodyExtras: String(formData.get("bodyExtras") || "") || null,
      }
    );
    revalidatePath("/admin/letters");
    return { success: true as const, id: letter.id };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteOfferLetterAction(id: string) {
  try {
    const user = await requireUser();
    const { deleteOfferLetter } = await import("@/services/letter.service");
    await deleteOfferLetter(user.companyId!, user.role, id);
    revalidatePath("/admin/letters");
    return { success: true as const };
  } catch (error) {
    return toActionError(error);
  }
}
