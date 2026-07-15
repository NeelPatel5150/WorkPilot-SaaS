"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { toActionError } from "@/lib/errors";
import {
  setTenantActive,
  updateTenantBilling,
} from "@/services/platform.service";

export async function setTenantActiveAction(companyId: string, isActive: boolean) {
  try {
    const session = await requireSession();
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    await setTenantActive(user!.email, companyId, isActive);
    revalidatePath("/platform");
    return { success: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateTenantBillingAction(formData: FormData) {
  try {
    const session = await requireSession();
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    const companyId = String(formData.get("companyId") || "");
    const trialRaw = String(formData.get("trialEndsAt") || "").trim();
    await updateTenantBilling(user!.email, companyId, {
      plan: String(formData.get("plan") || "") || undefined,
      seatLimit: Number(formData.get("seatLimit")),
      billingStatus: String(formData.get("billingStatus") || "") || undefined,
      trialEndsAt: trialRaw ? new Date(`${trialRaw}T23:59:59.000Z`) : undefined,
    });
    revalidatePath("/platform");
    return { success: true };
  } catch (error) {
    return toActionError(error);
  }
}
