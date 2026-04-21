# Motor Tool and Sub-Component Pumping Hour Tracking System

Next.js 16 + Prisma application for tracking motors, sub-components, assemblies, and pumping hours.

This README is a complete local onboarding guide for macOS developers who just cloned this repository.

## 1) Prerequisites (macOS)

Install these first:

- Git
- Node.js (recommended: Node 22 LTS; minimum should be Node 20+ for modern Next.js)
- npm (comes with Node)
- Xcode Command Line Tools (required for native modules like `better-sqlite3`)

Install Xcode Command Line Tools:

```bash
xcode-select --install
```

Optional but recommended: install and manage Node via `nvm`.

Example using Homebrew + nvm:

```bash
brew install nvm
mkdir -p ~/.nvm
echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.zshrc
echo '[ -s "$(brew --prefix nvm)/nvm.sh" ] && . "$(brew --prefix nvm)/nvm.sh"' >> ~/.zshrc
source ~/.zshrc
nvm install 22
nvm use 22
```

Verify:

```bash
node -v
npm -v
```

## 2) Clone And Enter The Project

```bash
git clone <your-repo-url>
cd Motor-Tool-and-Sub-Component-Pumping-Hour-Tracking-System
```

## 3) Install Dependencies

Use `npm ci` (preferred for clean lockfile-based install):

```bash
npm ci
```

Notes:

- This project uses `package-lock.json`, so npm is the expected package manager.
- You may see audit warnings; these do not block local startup.

## 4) Create Local Environment Variables

Create a local `.env` file in the project root:

```bash
cat > .env <<'EOF'
DATABASE_URL="file:./dev.db"
AUTH_SECRET="local-dev-secret-change-me"
AUTH_URL="http://localhost:3000"
EOF
```

What these do:

- `DATABASE_URL`: local SQLite database used for development.
- `AUTH_SECRET`: required by Auth.js/NextAuth; use any long random string for local dev.
- `AUTH_URL`: base URL for local auth callbacks.

## 5) Prepare Database And Prisma Client

Generate Prisma client for local SQLite schema:

```bash
npm run prisma:generate:dev
```

Apply local migrations (safe, non-interactive):

```bash
npx prisma migrate deploy --schema=prisma/schema.sqlite.prisma
```

Seed default users for login:

```bash
npx prisma db seed
```

Seeded local login accounts:

- `rei@motortracker.app` / `password`
- `norman@motortracker.app` / `password`

## 6) Run The App

```bash
npm run dev
```

Open:

- http://localhost:3000

Auth behavior:

- `/login` is the sign-in page.
- All non-login routes are protected and require authentication.

## 7) Build Verification (Recommended)

Validate full build + TypeScript checks:

```bash
npm run build
```

If this succeeds, your local setup is healthy for both development and production-like builds.

## 8) Common Commands

```bash
# Start dev server (also regenerates Prisma client)
npm run dev

# Build app
npm run build

# Start production server after build
npm run start

# Lint
npm run lint

# Generate Prisma client for local SQLite
npm run prisma:generate:dev

# Create/apply SQLite migrations during feature work
npm run prisma:migrate:dev

# Seed database
npx prisma db seed

# Import backup JSON data (optional)
npm run import:data
```

## 9) Optional: Import Backup Data

Repository includes JSON backups in `backup_data/` and an import script.

Run:

```bash
npm run import:data
```

Important:

- Import expects valid schema and existing tables.
- If you already have conflicting rows, import can fail on unique constraints.
- If needed, reset local state by removing `dev.db`, then rerun migration + seed.

Example reset flow:

```bash
rm -f dev.db
npx prisma migrate deploy --schema=prisma/schema.sqlite.prisma
npx prisma db seed
```

## 10) macOS Troubleshooting

### Native module build errors (better-sqlite3 / node-gyp)

Symptoms:

- install fails during `npm ci`
- errors referencing `node-gyp`, C++ build, or missing CLT tools

Fix:

```bash
xcode-select --install
```

Then reinstall:

```bash
rm -rf node_modules
npm ci
```

### Prisma cannot connect

Check `.env` exists and `DATABASE_URL` is set to SQLite for local dev:

```bash
DATABASE_URL="file:./dev.db"
```

Then regenerate client + apply migrations:

```bash
npm run prisma:generate:dev
npx prisma migrate deploy --schema=prisma/schema.sqlite.prisma
```

### Cannot log in locally

Run seed:

```bash
npx prisma db seed
```

Then use one of the seeded credentials above.

### Port 3000 already in use

Run on another port:

```bash
PORT=3001 npm run dev
```

## 11) Verified Fresh-Clone Setup (macOS)

The following was executed and verified on a fresh-clone setup:

1. `npm ci` completed successfully (607 packages installed).
2. `npm run prisma:generate:dev` succeeded.
3. `npx prisma migrate deploy --schema=prisma/schema.sqlite.prisma` ran successfully (no pending migrations).
4. `npx prisma db seed` succeeded (seeded 2 users).
5. `npm run dev` started successfully at `http://localhost:3000`.
6. `npm run build` succeeded (compile + typecheck + route generation).

Observed non-blocking warnings during setup:

- npm audit reported vulnerabilities in dependency tree (not blocking local startup).
- Next.js warning: middleware file convention is deprecated in favor of proxy convention.

## 12) Production Database Notes

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
