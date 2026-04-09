/**
 * Vercel build: generate client, migrate deploy, next build.
 * If the DB was created with `db push` (non-empty schema, no `_prisma_migrations`),
 * `migrate deploy` exits with P3005 once — we baseline with the prop-pending preset
 * and retry so the remaining migrations apply on the build machine.
 *
 * P3009 (failed migration in DB): set env `PRISMA_RESOLVE_ROLLED_BACK` to the migration
 * folder name for one build, or run `npm run db:migrate:resolve:listing-visible-rolled-back`
 * locally. For known idempotent migrations, we auto `migrate resolve --rolled-back` when P3009
 * mentions one of them, then retry `migrate deploy`.
 *
 * P3018 (apply failed, e.g. duplicate column when the DB was synced with db push): for the same
 * idempotent migrations, if Postgres reports duplicate object (42701 / already exists),
 * we `migrate resolve --applied` and retry `migrate deploy`.
 */
import { execSync, spawnSync } from "node:child_process";

const env = process.env;

const IDEMPOTENT_MIGRATION_NAMES = [
  "20260408120000_listing_visible_on_marketplace",
  "20260408140000_prop_rental_set_builder",
  "20260408150000_offer_from_seller_counter",
  "20260408183000_prop_rental_set_default_hire_dates",
  "20260408200000_prop_booking_set_batch_payment",
  "20260409140000_offer_status_superseded",
];

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
      "  npx prisma migrate resolve --rolled-back \"<migration_folder_name>\"\n" +
      "  npx prisma migrate deploy\n" +
      "  (npm scripts: db:migrate:resolve:listing-visible-rolled-back, db:migrate:resolve:offer-superseded-rolled-back)\n\n" +
      "Option B — one Vercel build: set PRISMA_RESOLVE_ROLLED_BACK to that folder name,\n" +
      "redeploy, confirm migrate succeeds, then remove the env var.\n\n",
  );
}

execSync("npx prisma generate", { stdio: "inherit", shell: true, env });

let deploy = runCaptured("npx prisma migrate deploy");

if (deploy.code !== 0) {
  if (deploy.out.includes("P1002") || deploy.out.includes("advisory lock") || deploy.out.includes("pg_advisory_lock")) {
    printAdvisoryLockHint();
  }

  // P3018 + duplicate object: schema already matches; mark migration applied and retry.
  if (
    deploy.out.includes("P3018") &&
    process.env.VERCEL_SKIP_AUTO_MIGRATE_RESOLVE !== "1" &&
    (deploy.out.includes("already exists") || deploy.out.includes("42701"))
  ) {
    const stuck = IDEMPOTENT_MIGRATION_NAMES.find((n) => deploy.out.includes(n));
    if (stuck) {
      console.error(
        `\n[vercel-build] P3018: ${stuck} — duplicate object; marking applied and retrying migrate deploy…\n`,
      );
      const resolved = runCaptured(`npx prisma migrate resolve --applied "${stuck}"`);
      if (resolved.code === 0) {
        deploy = runCaptured("npx prisma migrate deploy");
      } else {
        console.error(resolved.out);
      }
    }
  }

  const p3009 = deploy.out.includes("P3009");
  const resolveName = (process.env.PRISMA_RESOLVE_ROLLED_BACK ?? "").trim();
  if (deploy.code !== 0 && p3009 && resolveName && deploy.out.includes(resolveName)) {
    console.error(
      `\n[vercel-build] P3009: PRISMA_RESOLVE_ROLLED_BACK=${resolveName} — marking rolled back and retrying migrate deploy…\n`,
    );
    execSync(`npx prisma migrate resolve --rolled-back "${resolveName}"`, {
      stdio: "inherit",
      shell: true,
      env,
    });
    deploy = runCaptured("npx prisma migrate deploy");
  } else if (deploy.code !== 0 && p3009 && process.env.VERCEL_SKIP_AUTO_MIGRATE_RESOLVE !== "1") {
    const stuck = IDEMPOTENT_MIGRATION_NAMES.find((n) => deploy.out.includes(n));
    if (stuck) {
      console.error(
        `\n[vercel-build] P3009: auto-resolve rolled-back for ${stuck} (known stuck / idempotent migration), then retry migrate deploy…\n`,
      );
      execSync(`npx prisma migrate resolve --rolled-back "${stuck}"`, {
        stdio: "inherit",
        shell: true,
        env,
      });
      deploy = runCaptured("npx prisma migrate deploy");
    }
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
