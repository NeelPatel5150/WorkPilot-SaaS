import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { companyRepo } from "@/repositories/company.repository";
import { leaveRepo } from "@/repositories/leave.repository";
import { activityRepo } from "@/repositories/activity.repository";
import { ValidationError } from "@/lib/errors";
import { slugify } from "@/lib/utils";

export async function registerCompany(input: {
  companyName: string;
  slug?: string;
  adminName: string;
  email: string;
  password: string;
  primaryColor?: string;
}) {
  const slug = slugify(input.slug || input.companyName);
  if (!slug) throw new ValidationError("Invalid company slug");
  if (input.password.length < 8) {
    throw new ValidationError("Password must be at least 8 characters");
  }

  const existing = await companyRepo.findBySlug(slug);
  if (existing) throw new ValidationError("Company slug already taken");

  const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
  if (existingUser) throw new ValidationError("Email already registered");

  const company = await companyRepo.create({
    name: input.companyName,
    slug,
    primaryColor: input.primaryColor,
  });

  const result = await auth.api.signUpEmail({
    body: {
      name: input.adminName,
      email: input.email,
      password: input.password,
    },
  });

  if (!result?.user) {
    await prisma.company.delete({ where: { id: company.id } });
    throw new ValidationError("Could not create admin account");
  }

  const [firstName, ...rest] = input.adminName.trim().split(/\s+/);
  const lastName = rest.join(" ") || "Admin";

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: result.user.id },
      data: {
        companyId: company.id,
        role: "COMPANY_ADMIN",
      },
    });

    await tx.employee.create({
      data: {
        companyId: company.id,
        userId: result.user.id,
        employeeCode: "EMP001",
        firstName,
        lastName,
        designation: "Administrator",
        joiningDate: new Date(),
      },
    });

    await tx.department.create({
      data: { companyId: company.id, name: "General" },
    });
  });

  await leaveRepo.seedDefaultTypes(company.id);

  const employee = await prisma.employee.findFirst({
    where: { userId: result.user.id, companyId: company.id },
  });
  if (employee) {
    const year = new Date().getFullYear();
    const types = await leaveRepo.listTypes(company.id, { applicableOnly: true });
    const { isEmployeeScopedLeave } = await import("@/lib/leave-catalog");
    for (const type of types) {
      await leaveRepo.upsertBalance({
        companyId: company.id,
        employeeId: employee.id,
        leaveTypeId: type.id,
        year,
        allocated: isEmployeeScopedLeave(type.code) ? 0 : type.defaultDays,
        used: 0,
      });
    }
  }

  await activityRepo.log(company.id, "company.created", result.user.id, {
    slug: company.slug,
  });

  return { company, userId: result.user.id };
}
