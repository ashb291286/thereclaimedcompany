/**
 * Vercel build: generate client, migrate deploy, next build.
 * If the DB was created with `db push` (non-empty schema, no `_prisma_migrations`),
 * `migrate deploy` exits with P3005 once — we baseline with the prop-pending preset
 * and retry so the remaining migrations apply on the build machine.
 */
import { execSync, spawnSync } from "node:child_process";

const env = process.env;

function runCaptured(cmd) {
  const r = spawnSync(cmd, { shell: true, encoding: "utf8", env });
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  return { code: r.status, out };
}

execSync("npx prisma generate", { stdio: "inherit", shell: true, env });

const first = runCaptured("npx prisma migrate deploy");
if (first.code !== 0) {
  if (!first.out.includes("P3005")) {
    console.error(first.out);
    process.exit(first.code ?? 1);
  }
  console.error(
    "\n[vercel-build] P3005 (existing schema without migration history). Baseline + retry migrate deploy…\n",
  );
  execSync("node scripts/prisma-baseline.mjs prop-pending", {
    stdio: "inherit",
    shell: true,
    env,
  });
  execSync("npx prisma migrate deploy", { stdio: "inherit", shell: true, env });
}

execSync("npx next build", { stdio: "inherit", shell: true, env });
