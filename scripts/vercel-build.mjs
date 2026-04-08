/**
 * Vercel build: generate client, migrate deploy, next build.
 * If the DB was created with `db push` (non-empty schema, no `_prisma_migrations`),
 * `migrate deploy` exits with P3005 once — we baseline with the prop-pending preset
 * and retry so the remaining migrations apply on the build machine.
 *
 * P3009 (failed migration in DB): set env `PRISMA_RESOLVE_ROLLED_BACK` to the migration
 * folder name for one build, or run `npm run db:migrate:resolve:listing-visible-rolled-back`
 * locally. For the historical duplicate-column failure on
 * `20260408120000_listing_visible_on_marketplace`, we auto-resolve once and retry deploy
 * (migration SQL is `IF NOT EXISTS`).
 */
import { execSync, spawnSync } from "node:child_process";

const env = process.env;

/** Stuck on production after duplicate column error; current SQL is idempotent. */
const AUTO_RESOLVE_ROLLED_BACK_IF_P3009 = "20260408120000_listing_visible_on_marketplace";

function runCaptured(cmd) {
  const r = spawnSync(cmd, { shell: true, encoding: "utf8", env });
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  return { code: r.status, out };
}

function printAdvisoryLockHint() {
  console.error(
    "\n[vercel-build] Migrate failed waiting for Postgres advisory lock (often Neon pooler + 10s timeout).\n" +
      "Add DIRECT_URL (or DATABASE_URL_UNPOOLED / PRISMA_MIGRATE_DATABASE_URL) in Vercel with your non-pooler\n" +
      "Neon connection string. prisma.config.ts uses that for migrate; DATABASE_URL can stay pooled for the app.\n\n",
  );
}

function printP3009Hint() {
  console.error(
    "\n[vercel-build] P3009: A migration is marked as failed in `_prisma_migrations`. New migrations will not apply until it is resolved.\n\n" +
      "Option A — locally (recommended), using the same DB URL as migrate (DIRECT_URL / non-pooler):\n" +
      "  npm run db:migrate:resolve:listing-visible-rolled-back\n" +
      "  npx prisma migrate deploy\n\n" +
      "Option B — one Vercel build: add env var PRISMA_RESOLVE_ROLLED_BACK=20260408120000_listing_visible_on_marketplace,\n" +
      "redeploy, confirm migrate succeeds, then delete that env var.\n\n",
  );
}

execSync("npx prisma generate", { stdio: "inherit", shell: true, env });

let deploy = runCaptured("npx prisma migrate deploy");

if (deploy.code !== 0) {
  if (deploy.out.includes("P1002") || deploy.out.includes("advisory lock") || deploy.out.includes("pg_advisory_lock")) {
    printAdvisoryLockHint();
  }

  const p3009 = deploy.out.includes("P3009");
  const resolveName = (process.env.PRISMA_RESOLVE_ROLLED_BACK ?? "").trim();
  if (p3009 && resolveName && deploy.out.includes(resolveName)) {
    console.error(
      `\n[vercel-build] P3009: PRISMA_RESOLVE_ROLLED_BACK=${resolveName} — marking rolled back and retrying migrate deploy…\n`,
    );
    execSync(`npx prisma migrate resolve --rolled-back "${resolveName}"`, {
      stdio: "inherit",
      shell: true,
      env,
    });
    deploy = runCaptured("npx prisma migrate deploy");
  } else if (
    p3009 &&
    deploy.out.includes(AUTO_RESOLVE_ROLLED_BACK_IF_P3009) &&
    process.env.VERCEL_SKIP_AUTO_MIGRATE_RESOLVE !== "1"
  ) {
    console.error(
      `\n[vercel-build] P3009: auto-resolve rolled-back for ${AUTO_RESOLVE_ROLLED_BACK_IF_P3009} (known stuck migration), then retry migrate deploy…\n`,
    );
    execSync(`npx prisma migrate resolve --rolled-back "${AUTO_RESOLVE_ROLLED_BACK_IF_P3009}"`, {
      stdio: "inherit",
      shell: true,
      env,
    });
    deploy = runCaptured("npx prisma migrate deploy");
  }

  if (deploy.code === 0) {
    // recovered (e.g. after automatic P3009 resolve)
  } else if (!deploy.out.includes("P3005")) {
    if (deploy.out.includes("P3009")) {
      printP3009Hint();
    }
    console.error(deploy.out);
    process.exit(deploy.code ?? 1);
  } else {
    console.error("\n[vercel-build] P3005 (existing schema without migration history). Baseline + retry migrate deploy…\n");
    execSync("node scripts/prisma-baseline.mjs prop-pending", {
      stdio: "inherit",
      shell: true,
      env,
    });
    execSync("npx prisma migrate deploy", { stdio: "inherit", shell: true, env });
  }
}

execSync("npx next build", { stdio: "inherit", shell: true, env });
