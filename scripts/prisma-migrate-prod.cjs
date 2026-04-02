const { spawnSync } = require("node:child_process");

const baselineMigration = process.env.PRISMA_BASELINE_MIGRATION || "20260402130000_init";

function runPrisma(args) {
  const result = spawnSync("npx", ["prisma", ...args], {
    encoding: "utf8",
    stdio: "pipe",
    shell: process.platform === "win32",
  });

  if (result.error) {
    process.stderr.write(`${result.error.message}\n`);
  }

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  return {
    status: result.status ?? 1,
    output: `${result.stdout || ""}\n${result.stderr || ""}`,
  };
}

function isP3005(output) {
  return /\bP3005\b/.test(output) || /database schema is not empty/i.test(output);
}

function isAlreadyApplied(output) {
  return /already recorded as applied/i.test(output) || /already applied/i.test(output);
}

const firstDeploy = runPrisma(["migrate", "deploy"]);
if (firstDeploy.status === 0) {
  process.exit(0);
}

if (!isP3005(firstDeploy.output)) {
  process.exit(firstDeploy.status);
}

console.warn(
  `[prisma:migrate:prod] Detected P3005. Attempting one-time baseline with migration "${baselineMigration}".`
);

const resolve = runPrisma(["migrate", "resolve", "--applied", baselineMigration]);
if (resolve.status !== 0 && !isAlreadyApplied(resolve.output)) {
  console.error(
    `[prisma:migrate:prod] Baseline failed for migration "${baselineMigration}". Set PRISMA_BASELINE_MIGRATION if your baseline folder name differs.`
  );
  process.exit(resolve.status);
}

console.log("[prisma:migrate:prod] Baseline step complete. Retrying migrate deploy...");
const secondDeploy = runPrisma(["migrate", "deploy"]);
process.exit(secondDeploy.status);
