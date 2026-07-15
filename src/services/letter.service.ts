import { prisma } from "@/lib/prisma";
import { isAdminRole } from "@/lib/session";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { startOfDayUTC } from "@/lib/utils";
import type { UserRole } from "@/generated/prisma";

function assertAdmin(role: UserRole) {
  if (!isAdminRole(role)) {
    throw new ForbiddenError("Only admins can manage letters");
  }
}

export type LetterInput = {
  letterType: "OFFER" | "APPOINTMENT";
  employeeId?: string | null;
  candidateName: string;
  designation: string;
  department?: string | null;
  joiningDate?: string | null;
  salaryAmount?: number | null;
  salaryCurrency?: string;
  employmentType?: string | null;
  reportingTo?: string | null;
  location?: string | null;
  bodyExtras?: string | null;
};

export async function listOfferLetters(companyId: string, role: UserRole) {
  assertAdmin(role);
  return prisma.offerLetter.findMany({
    where: { companyId },
    include: {
      employee: {
        select: { id: true, firstName: true, lastName: true, employeeCode: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function createOfferLetter(
  actor: { id: string; companyId: string; role: UserRole },
  input: LetterInput
) {
  assertAdmin(actor.role);
  const candidateName = input.candidateName.trim();
  const designation = input.designation.trim();
  if (!candidateName) throw new ValidationError("Candidate name is required");
  if (!designation) throw new ValidationError("Designation is required");

  let joiningDate: Date | null = null;
  if (input.joiningDate) {
    joiningDate = startOfDayUTC(new Date(input.joiningDate));
    if (Number.isNaN(joiningDate.getTime())) {
      throw new ValidationError("Invalid joining date");
    }
  }

  if (input.employeeId) {
    const emp = await prisma.employee.findFirst({
      where: { id: input.employeeId, companyId: actor.companyId },
    });
    if (!emp) throw new NotFoundError("Employee not found");
  }

  return prisma.offerLetter.create({
    data: {
      companyId: actor.companyId,
      createdById: actor.id,
      letterType: input.letterType === "APPOINTMENT" ? "APPOINTMENT" : "OFFER",
      employeeId: input.employeeId || null,
      candidateName,
      designation,
      department: input.department?.trim() || null,
      joiningDate,
      salaryAmount:
        input.salaryAmount === undefined || input.salaryAmount === null
          ? null
          : Number(input.salaryAmount),
      salaryCurrency: input.salaryCurrency?.trim() || "INR",
      employmentType: input.employmentType?.trim() || null,
      reportingTo: input.reportingTo?.trim() || null,
      location: input.location?.trim() || null,
      bodyExtras: input.bodyExtras?.trim() || null,
    },
  });
}

export async function getOfferLetter(
  companyId: string,
  role: UserRole,
  id: string
) {
  assertAdmin(role);
  const letter = await prisma.offerLetter.findFirst({
    where: { id, companyId },
    include: {
      company: true,
      employee: true,
    },
  });
  if (!letter) throw new NotFoundError("Letter not found");
  return letter;
}

export async function deleteOfferLetter(
  companyId: string,
  role: UserRole,
  id: string
) {
  assertAdmin(role);
  await prisma.offerLetter.deleteMany({ where: { id, companyId } });
}
