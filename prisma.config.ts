import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * CLI (db push / migrate) prefers DIRECT_URL (Session/direct).
 * Falls back so `prisma generate` works on Vercel even if only DATABASE_URL is set.
 */
const datasourceUrl =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@127.0.0.1:5432/postgres";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: datasourceUrl,
  },
});
