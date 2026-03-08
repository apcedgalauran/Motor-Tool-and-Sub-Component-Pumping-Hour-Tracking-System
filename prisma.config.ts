import "dotenv/config";
import { defineConfig } from "prisma/config";

const isProd = process.env.NODE_ENV === "production" || !!process.env.DIRECT_URL;

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
    // Prisma v7+ reads connection URLs from prisma.config.ts for migrate/deploy.
    // Use DIRECT_URL in production (matches schema's previous env var),
    // fallback to DATABASE_URL for local setups or other providers.
    url: isProd ? process.env["DIRECT_URL"] || process.env["DATABASE_URL"] : process.env["DATABASE_URL"],
  },
});
