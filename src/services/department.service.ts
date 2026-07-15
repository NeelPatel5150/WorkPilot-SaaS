import { departmentRepo } from "@/repositories/department.repository";
import { activityRepo } from "@/repositories/activity.repository";
import { assertPermission } from "@/lib/session";
import { ValidationError } from "@/lib/errors";
import type { UserRole } from "@/generated/prisma";

export async function listDepartments(companyId: string, _role: UserRole) {
  return departmentRepo.list(companyId);
}

export async function createDepartment(
  actor: { id: string; companyId: string; role: UserRole },
  name: string
) {
  assertPermission(actor.role, "departments:manage");
  const trimmed = name.trim();
  if (!trimmed) throw new ValidationError("Department name is required");

  const dept = await departmentRepo.create(actor.companyId, trimmed);
  await activityRepo.log(actor.companyId, "department.created", actor.id, {
    departmentId: dept.id,
  });
  return dept;
}

export async function deleteDepartment(
  actor: { id: string; companyId: string; role: UserRole },
  id: string
) {
  assertPermission(actor.role, "departments:manage");
  await departmentRepo.delete(actor.companyId, id);
  await activityRepo.log(actor.companyId, "department.deleted", actor.id, {
    departmentId: id,
  });
}

export async function renameDepartment(
  actor: { id: string; companyId: string; role: UserRole },
  id: string,
  name: string
) {
  assertPermission(actor.role, "departments:manage");
  const trimmed = name.trim();
  if (!trimmed) throw new ValidationError("Department name is required");
  const existing = await departmentRepo.findById(actor.companyId, id);
  if (!existing) throw new ValidationError("Department not found");
  await departmentRepo.rename(actor.companyId, id, trimmed);
  await activityRepo.log(actor.companyId, "department.renamed", actor.id, {
    departmentId: id,
    name: trimmed,
  });
  return { id, name: trimmed };
}
