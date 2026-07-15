import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  clearMcpSeedData,
  DEFAULT_MCP_ADMIN_EMAIL,
  seedMcpHrData,
} from "./seed-mcp-demo";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const action = process.argv[2] ?? "attach";
const adminEmail = process.env.SEED_ADMIN_EMAIL ?? DEFAULT_MCP_ADMIN_EMAIL;
const force = process.env.SEED_FORCE === "1";

async function main() {
  if (action === "clear") {
    await clearMcpSeedData(prisma, { adminEmail, includeDemoCorp: true });
    return;
  }

  if (process.env.SEED_CLEAR_FIRST === "1") {
    await clearMcpSeedData(prisma, { adminEmail, includeDemoCorp: true });
  }

  await seedMcpHrData(prisma, { adminEmail, force });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
