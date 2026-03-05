<!-- Workspace Agent Instructions for Copilot Chat -->
# Copilot / Agent Instructions

Purpose: Help AI agents work productively in this Next.js + Prisma repository.

Quick start
- Dev server: `npm run dev`
- Build: `npm run build`
- Prisma (sqlite dev): `npm run prisma:generate:dev` / `npm run prisma:migrate:dev`

Key project areas
- App frontend: `app/` (Next.js app router)
- Pages: `app/motors`, `app/sub-components` contain feature UIs
- Components: `components/` UI building blocks
- DB schema + client: `prisma/` and generated client in `app/generated/prisma/`
- Server API routes: `app/api/`

Agent behavior rules
- Use the planning-with-files pattern for multi-step tasks: create `task_plan.md` first.
- Persist discoveries into `findings.md` and session logs into `progress.md` in the repo root.
- Before making changes that affect DB or migrations, run schema generation commands locally and add migration notes to `task_plan.md`.
- Prefer modifying files under the project root; avoid editing `.github/skills` files unless explicitly asked.

Anti-patterns
- Don't assume environment (ask if secrets or a specific DB are required).
- Don’t write large ephemeral data into agent-only skill directories — keep project files in repo root.
- Avoid making multi-file changes without a short plan and tests (where applicable).

Conventions & tips
- This is a Next.js 16 app-router project; prefer server components in `app/` when possible.
- Use existing `package.json` scripts for common tasks.
- Prisma is present; check `prisma/schema.prisma` and `prisma/schema.sqlite.prisma` before DB work.

Example prompts
- "Create a small UI in `app/motors/[id]/assemble/page.tsx` to add an assembly record, and add backend action in `actions/assembly.actions.ts`."
- "Run lint and fix issues; show modified files and updated `task_plan.md`."
- "Generate a Prisma migration for a new `PumpingLog` model and update CRUD actions." 

Suggested follow-ups (agent customizations)
- `create-agent` that runs `npm run dev`, watches `prisma:migrate:dev`, and reports migration status.
- `create-hook` to auto-generate `task_plan.md` templates when a new multi-file task is started.

If unclear, ask: 1) should I run migrations locally? 2) which environment variables are available? 3) prefer commits or patches?
