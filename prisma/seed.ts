import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = "admin@demo.local";
  const password = "password123";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Seed skipped — demo admin already exists:", email);
    return;
  }

  const company = await prisma.company.create({
    data: {
      name: "Demo Corp",
      slug: "demo",
      primaryColor: "#2563EB",
      secondaryColor: "#EFF6FF",
      setupComplete: true,
    },
  });

  const hashed = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      name: "Demo Admin",
      email,
      emailVerified: true,
      companyId: company.id,
      role: "COMPANY_ADMIN",
      accounts: {
        create: {
          accountId: email,
          providerId: "credential",
          password: hashed,
        },
      },
    },
  });

  const dept = await prisma.department.create({
    data: { companyId: company.id, name: "General" },
  });

  const employee = await prisma.employee.create({
    data: {
      companyId: company.id,
      userId: user.id,
      employeeCode: "EMP001",
      firstName: "Demo",
      lastName: "Admin",
      designation: "Administrator",
      departmentId: dept.id,
      joiningDate: new Date(),
    },
  });

  const leaveTypes = [
    { name: "Casual", defaultDays: 12 },
    { name: "Sick", defaultDays: 10 },
    { name: "WFH", defaultDays: 24 },
    { name: "Comp Off", defaultDays: 0 },
  ];

  for (const lt of leaveTypes) {
    const type = await prisma.leaveType.create({
      data: { companyId: company.id, ...lt },
    });
    await prisma.leaveBalance.create({
      data: {
        companyId: company.id,
        employeeId: employee.id,
        leaveTypeId: type.id,
        year: new Date().getFullYear(),
        allocated: lt.defaultDays,
        used: 0,
      },
    });
  }

  console.log("Seeded demo tenant:");
  console.log("  URL:      http://localhost:3000/login");
  console.log("  Email:   ", email);
  console.log("  Password:", password);
  console.log("  Company: ", company.slug);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
