import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const cols = await prisma.$queryRawUnsafe<{ column_name: string }[]>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'companies' AND column_name = 'setupComplete'`
  );
  console.log("DB column:", cols);
  // smoke create validation (rollback via unused slug check)
  const sample = await prisma.company.findFirst({
    select: { id: true, setupComplete: true, name: true },
  });
  console.log("Sample company:", sample);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
