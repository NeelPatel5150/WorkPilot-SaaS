import { documentRepo } from "@/repositories/document.repository";
import { activityRepo } from "@/repositories/activity.repository";
import { assertPermission } from "@/lib/session";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { deleteUpload } from "@/lib/storage";
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

  const buffer = Buffer.from(await file.arrayBuffer());
  const mime = file.type || "application/octet-stream";

  const doc = await documentRepo.create({
    companyId: actor.companyId,
    employeeId: employeeId || null,
    name: file.name,
    fileUrl: "pending",
    fileData: buffer,
    fileMime: mime,
    expiresAt: expiresAt ?? null,
  });

  const fileUrl = `/api/documents/${doc.id}`;
  await prisma.document.update({
    where: { id: doc.id },
    data: { fileUrl },
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
        message: `"${file.name}" was uploaded. Open Documents to view it.`,
        channels: ["in_app", "email", "push"],
      });
    }
  } else {
    await notifyCompanyUsers(
      actor.companyId,
      "New company document",
      `"${file.name}" was added. Open Documents to view it.`,
      { channels: ["in_app", "email", "push"], employeesOnly: true }
    );
  }

  await activityRepo.log(actor.companyId, "document.uploaded", actor.id, {
    documentId: doc.id,
  });
  return { ...doc, fileUrl };
}

export async function getDocumentFile(
  actor: { companyId: string; role: UserRole; employeeId?: string | null },
  id: string
) {
  const doc = await documentRepo.findFileById(actor.companyId, id);
  if (!doc) throw new NotFoundError("Document not found");

  // Employees may only open company-wide docs or their own
  if (actor.role === "EMPLOYEE") {
    const allowed =
      doc.employeeId == null ||
      (actor.employeeId != null && doc.employeeId === actor.employeeId);
    if (!allowed) throw new NotFoundError("Document not found");
  }

  if (doc.fileData && doc.fileMime) {
    return {
      name: doc.name,
      mime: doc.fileMime,
      data: Buffer.from(doc.fileData),
    };
  }

  return null;
}

export async function removeDocument(
  actor: { id: string; companyId: string; role: UserRole },
  id: string
) {
  assertPermission(actor.role, "employees:manage");
  const doc = await documentRepo.findById(actor.companyId, id);
  if (!doc) throw new NotFoundError("Document not found");
  if (doc.fileUrl?.startsWith("/api/files/")) {
    await deleteUpload(doc.fileUrl);
  }
  await documentRepo.delete(actor.companyId, id);
  await activityRepo.log(actor.companyId, "document.deleted", actor.id, {
    documentId: id,
  });
}
