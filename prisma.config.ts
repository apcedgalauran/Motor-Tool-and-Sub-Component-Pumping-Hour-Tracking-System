import "dotenv/config";
import { defineConfig } from "prisma/config";

const dbUrl = process.env.DATABASE_URL ?? "";
const directUrl = process.env.DIRECT_URL ?? "";
const isSqlite = dbUrl.startsWith("file:") || dbUrl.includes("sqlite");
const isPostgres = dbUrl.startsWith("postgres") || directUrl.startsWith("postgres");
const isProd = process.env.NODE_ENV === "production" || !!process.env.VERCEL || (isPostgres && !isSqlite);

export default defineConfig({
  // Use the sqlite schema for local development (matches .env DATABASE_URL)
  // In production (or when DIRECT_URL is present), use the primary Postgres schema.
  schema: isProd ? "prisma/schema.prisma" : "prisma/schema.sqlite.prisma",
  migrations: {
    path: "prisma/migrations",
    // Seed command for `prisma db seed` (ts-node CommonJS)
    seed: 'ts-node --compiler-options {"module":"CommonJS"} prisma/seed.ts',
  },
  datasource: {
    // Use DIRECT_URL for production migrations and DATABASE_URL for local runtime.
    url: isProd ? process.env["DIRECT_URL"] || process.env["DATABASE_URL"] : process.env["DATABASE_URL"],
  },
});
