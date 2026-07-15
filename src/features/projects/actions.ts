"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { toActionError } from "@/lib/errors";

export async function createProjectAction(formData: FormData) {
  try {
    const user = await requireUser();
    const { createProject } = await import("@/services/project.service");
    const project = await createProject(user.companyId!, user.role, {
      name: String(formData.get("name") || ""),
      description: String(formData.get("description") || ""),
      notes: String(formData.get("notes") || ""),
    });
    revalidatePath("/admin/workspace");
    return { success: true as const, id: project.id };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateProjectAction(formData: FormData) {
  try {
    const user = await requireUser();
    const { updateProject } = await import("@/services/project.service");
    await updateProject(
      user.companyId!,
      user.role,
      String(formData.get("id") || ""),
      {
        name: String(formData.get("name") || ""),
        description: String(formData.get("description") || ""),
        notes: String(formData.get("notes") || ""),
      }
    );
    revalidatePath("/admin/workspace");
    return { success: true as const };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteProjectAction(projectId: string) {
  try {
    const user = await requireUser();
    const { deleteProject } = await import("@/services/project.service");
    await deleteProject(user.companyId!, user.role, projectId);
    revalidatePath("/admin/workspace");
    return { success: true as const };
  } catch (error) {
    return toActionError(error);
  }
}

export async function saveProjectCredentialsAction(
  projectId: string,
  rows: { key: string; value: string }[]
) {
  try {
    const user = await requireUser();
    const { saveProjectCredentials } = await import("@/services/project.service");
    await saveProjectCredentials(user.companyId!, user.role, projectId, rows);
    revalidatePath("/admin/workspace");
    revalidatePath("/employee/projects");
    return { success: true as const };
  } catch (error) {
    return toActionError(error);
  }
}

export async function setProjectSharesAction(
  projectId: string,
  employeeIds: string[]
) {
  try {
    const user = await requireUser();
    const { setProjectShares } = await import("@/services/project.service");
    await setProjectShares(user.companyId!, user.role, projectId, employeeIds);
    revalidatePath("/admin/workspace");
    revalidatePath("/employee/projects");
    return { success: true as const };
  } catch (error) {
    return toActionError(error);
  }
}
