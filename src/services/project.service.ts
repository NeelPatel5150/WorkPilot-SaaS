import { isAdminRole } from "@/lib/session";
import { NotFoundError, ValidationError, ForbiddenError } from "@/lib/errors";
import { projectRepo } from "@/repositories/project.repository";
import type { UserRole } from "@/generated/prisma";

function assertAdmin(role: UserRole) {
  if (!isAdminRole(role)) {
    throw new ForbiddenError("Only admins can manage projects");
  }
}

export async function listProjects(companyId: string, role: UserRole) {
  assertAdmin(role);
  return projectRepo.listByCompany(companyId);
}

export async function createProject(
  companyId: string,
  role: UserRole,
  input: { name: string; description?: string; notes?: string }
) {
  assertAdmin(role);
  const name = input.name.trim();
  if (!name) throw new ValidationError("Project name is required");
  return projectRepo.create(companyId, {
    name,
    description: input.description?.trim() || null,
    notes: input.notes?.trim() || null,
  });
}

export async function updateProject(
  companyId: string,
  role: UserRole,
  id: string,
  input: { name?: string; description?: string | null; notes?: string | null }
) {
  assertAdmin(role);
  const existing = await projectRepo.findById(companyId, id);
  if (!existing) throw new NotFoundError("Project not found");
  if (input.name !== undefined && !input.name.trim()) {
    throw new ValidationError("Project name is required");
  }
  await projectRepo.update(companyId, id, {
    name: input.name?.trim(),
    description:
      input.description === undefined
        ? undefined
        : input.description?.trim() || null,
    notes: input.notes === undefined ? undefined : input.notes?.trim() || null,
  });
  return projectRepo.findById(companyId, id);
}

export async function deleteProject(
  companyId: string,
  role: UserRole,
  id: string
) {
  assertAdmin(role);
  const existing = await projectRepo.findById(companyId, id);
  if (!existing) throw new NotFoundError("Project not found");
  await projectRepo.delete(companyId, id);
}

export async function saveProjectCredentials(
  companyId: string,
  role: UserRole,
  projectId: string,
  rows: { key: string; value: string }[]
) {
  assertAdmin(role);
  const existing = await projectRepo.findById(companyId, projectId);
  if (!existing) throw new NotFoundError("Project not found");

  const cleaned = rows
    .map((r) => ({ key: r.key.trim(), value: r.value.trim() }))
    .filter((r) => r.key.length > 0);

  for (const row of cleaned) {
    if (!row.value) {
      throw new ValidationError(`Value required for “${row.key}”`);
    }
  }

  await projectRepo.replaceCredentials(projectId, cleaned);
  return projectRepo.findById(companyId, projectId);
}

export async function addProjectCredential(
  companyId: string,
  role: UserRole,
  projectId: string,
  input: { key: string; value: string }
) {
  assertAdmin(role);
  const existing = await projectRepo.findById(companyId, projectId);
  if (!existing) throw new NotFoundError("Project not found");
  const key = input.key.trim();
  const value = input.value.trim();
  if (!key || !value) throw new ValidationError("Key and value are required");
  const sortOrder = existing.credentials.length;
  await projectRepo.addCredential(projectId, { key, value, sortOrder });
  return projectRepo.findById(companyId, projectId);
}

export async function deleteProjectCredential(
  companyId: string,
  role: UserRole,
  projectId: string,
  credentialId: string
) {
  assertAdmin(role);
  const existing = await projectRepo.findById(companyId, projectId);
  if (!existing) throw new NotFoundError("Project not found");
  await projectRepo.deleteCredential(credentialId, projectId);
  return projectRepo.findById(companyId, projectId);
}

export async function setProjectShares(
  companyId: string,
  role: UserRole,
  projectId: string,
  employeeIds: string[]
) {
  assertAdmin(role);
  const existing = await projectRepo.findById(companyId, projectId);
  if (!existing) throw new NotFoundError("Project not found");
  return projectRepo.setShares(projectId, companyId, employeeIds);
}

/** Read-only shared projects for an employee user. */
export async function listMySharedProjects(
  companyId: string,
  userId: string,
  _role: UserRole
) {
  const { prisma } = await import("@/lib/prisma");
  const employee = await prisma.employee.findFirst({
    where: { companyId, userId },
    select: { id: true },
  });
  if (!employee) return [];
  return projectRepo.listSharedWithEmployee(companyId, employee.id);
}
