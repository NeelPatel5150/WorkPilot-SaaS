import { PrismaClient } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
};

/** Models added after early MVP - Turbopack can keep an old client without these. */
const REQUIRED_DELEGATES = [
  "salarySlip",
  "payrollMonthLock",
  "attendanceException",
  "task",
  "project",
  "offerLetter",
  "mcpToken",
  "mcpUsageEvent",
  "salaryRevision",
] as const;

/** Fields added to existing models - stale clients still have the model but reject these args. */
const REQUIRED_MODEL_FIELDS = {
  Company: ["setupComplete", "logoData", "plan", "seatLimit", "billingStatus"],
  LeaveType: ["isApplicable"],
  User: ["avatarData"],
  Document: ["fileData"],
  Employee: ["bankAccountNumber", "bankIfsc", "panNumber", "pfEligible"],
} as const;

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  // Supabase (and many hosted Postgres) use a cert chain Node rejects by
  // default → P1011 "self-signed certificate in certificate chain" on Vercel.
  // sslmode=require encrypts traffic; rejectUnauthorized:false skips CA verify.
  const pool =
    globalForPrisma.pgPool ??
    new Pool({
      connectionString,
      max: 1,
      ssl: connectionString.includes("sslmode=disable")
        ? undefined
        : { rejectUnauthorized: false },
    });
  globalForPrisma.pgPool = pool;

  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function clientHasRequiredDelegates(client: PrismaClient) {
  const record = client as unknown as Record<
    string,
    { findMany?: unknown } | undefined
  >;
  return REQUIRED_DELEGATES.every(
    (key) => typeof record[key]?.findMany === "function"
  );
}

function clientHasRequiredModelFields(client: PrismaClient) {
  const runtime = client as unknown as {
    _runtimeDataModel?: {
      models?: Record<string, { fields?: { name: string }[] }>;
    };
  };
  const models = runtime._runtimeDataModel?.models;
  if (!models) return false;

  return (Object.keys(REQUIRED_MODEL_FIELDS) as (keyof typeof REQUIRED_MODEL_FIELDS)[]).every(
    (modelName) => {
      const fields = models[modelName]?.fields;
      if (!fields) return false;
      return REQUIRED_MODEL_FIELDS[modelName].every((name) =>
        fields.some((f) => f.name === name)
      );
    }
  );
}

function clientIsCurrent(client: PrismaClient) {
  return (
    clientHasRequiredDelegates(client) &&
    clientHasRequiredModelFields(client)
  );
}

function getClient(): PrismaClient {
  const existing = globalForPrisma.prisma;
  if (existing && clientIsCurrent(existing)) {
    return existing;
  }

  // Drop stale hot-reload client before creating a fresh one
  if (existing) {
    void existing.$disconnect().catch(() => undefined);
    globalForPrisma.prisma = undefined;
  }

  const client = createPrismaClient();
  if (!clientIsCurrent(client)) {
    throw new Error(
      "Prisma client is missing required models/fields. Run: npx prisma generate"
    );
  }

  globalForPrisma.prisma = client;
  return client;
}

/**
 * Proxy so every access re-resolves the client. Module-level snapshots break
 * after schema/generate when Turbopack keeps an old PrismaClient instance.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client, prop as PropertyKey, receiver);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
