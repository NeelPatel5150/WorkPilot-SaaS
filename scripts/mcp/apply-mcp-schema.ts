import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

async function main() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DIRECT_URL or DATABASE_URL is required");
  }

  const sqlPath = path.join(process.cwd(), "prisma", "sql", "mcp_tokens.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");

  const client = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  await client.query(sql);
  console.log("mcp_tokens ready");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
