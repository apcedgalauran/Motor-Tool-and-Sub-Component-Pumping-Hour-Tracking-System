This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

### Production Database Notes

- Vercel build command should run migrations before build: `npm run prisma:migrate:prod && npm run build`.
- Required Vercel environment variables:
	- `DATABASE_URL`: pooled Neon/Postgres runtime connection string.
	- `DIRECT_URL`: non-pooled Postgres connection string used for migrations.
- Prisma migration connection URL is configured in `prisma.config.ts` (Prisma v7+).
- `prisma:migrate:prod` uses `scripts/prisma-migrate-prod.cjs`.
	- It runs `prisma migrate deploy` first.
	- If Prisma returns `P3005` (existing non-empty schema), it baselines the initial Postgres migration with `prisma migrate resolve --applied <migration>` and retries deploy.
	- Baseline migration id defaults to `20260402130000_init` and can be overridden with `PRISMA_BASELINE_MIGRATION`.
- This repo intentionally keeps two migration histories:
	- `prisma/migrations` for local SQLite development.
	- `prisma/migrations-postgres` for Neon/PostgreSQL production deploys.
- `prisma.config.ts` automatically switches schema and migration path by environment.
- Do not use `prisma db push` in production; use migration files and `prisma migrate deploy`.
