import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  // Use the sqlite schema for local development (matches .env DATABASE_URL)
  schema: "prisma/schema.sqlite.prisma",
  migrations: {
    path: "prisma/migrations",
    // Seed command for `prisma db seed` (ts-node CommonJS)
    seed: 'ts-node --compiler-options {"module":"CommonJS"} prisma/seed.ts',
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
