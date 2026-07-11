import { documentRepo } from "@/repositories/document.repository";
import { activityRepo } from "@/repositories/activity.repository";
import { assertPermission } from "@/lib/session";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { saveUpload, deleteUpload } from "@/lib/storage";
import { notifyCompanyUsers, notifyUser } from "@/services/notification.service";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/generated/prisma";

export async function listDocuments(
  actor: { companyId: string; role: UserRole; employeeId?: string | null },
  scope: "company" | "mine" = "company"
) {
  if (scope === "mine") {
    return documentRepo.list(actor.companyId, actor.employeeId ?? null);
  }
  assertPermission(actor.role, "employees:view");
  return documentRepo.list(actor.companyId);
}

export async function uploadDocument(
  actor: { id: string; companyId: string; role: UserRole },
  file: File,
  employeeId?: string | null,
  expiresAt?: Date | null
) {
  assertPermission(actor.role, "employees:manage");
  if (!file || file.size === 0) throw new ValidationError("File is required");
  if (file.size > 10 * 1024 * 1024) throw new ValidationError("Max file size is 10MB");

  const saved = await saveUpload(file, actor.companyId);
  const doc = await documentRepo.create({
    companyId: actor.companyId,
    employeeId: employeeId || null,
    name: saved.originalName,
    fileUrl: saved.fileUrl,
    expiresAt: expiresAt ?? null,
  });

  if (employeeId) {
    const emp = await prisma.employee.findFirst({
      where: { id: employeeId, companyId: actor.companyId },
      select: { userId: true },
    });
    if (emp?.userId) {
      await notifyUser({
        companyId: actor.companyId,
        userId: emp.userId,
        title: "New document for you",
        message: `"${saved.originalName}" was uploaded. Open Documents to view it.`,
        channels: ["in_app", "email", "push"],
      });
    }
  } else {
    await notifyCompanyUsers(
      actor.companyId,
      "New company document",
      `"${saved.originalName}" was added. Open Documents to view it.`,
      { channels: ["in_app", "email", "push"], employeesOnly: true }
    );
  }

  await activityRepo.log(actor.companyId, "document.uploaded", actor.id, {
    documentId: doc.id,
  });
  return doc;
}

export async function removeDocument(
  actor: { id: string; companyId: string; role: UserRole },
  id: string
) {
  assertPermission(actor.role, "employees:manage");
  const doc = await documentRepo.findById(actor.companyId, id);
  if (!doc) throw new NotFoundError("Document not found");
  await deleteUpload(doc.fileUrl);
  await documentRepo.delete(actor.companyId, id);
  await activityRepo.log(actor.companyId, "document.deleted", actor.id, {
    documentId: id,
  });
}
