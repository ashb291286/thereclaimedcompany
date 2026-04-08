/**
 * One-time production fix for P3005 ("database schema is not empty"):
 * records migrations in `_prisma_migrations` without re-running SQL.
 *
 * Typical production DB was maintained with `db push` or manual SQL, so it has
 * tables but no migration history — `prisma migrate deploy` then aborts with P3005.
 *
 * Usage (production DATABASE_URL):
 *   npm run db:baseline                      # mark every migration as applied (DB must match ALL)
 *   npm run db:baseline:prop-pending         # mark all EXCEPT Prop Yard; next deploy runs those two
 *
 * Optional env:
 *   PRISMA_BASELINE_SKIP=comma-separated migration folder basenames to leave for `migrate deploy`
 *
 * After baselining, redeploy (Vercel runs `migrate deploy`) or run `npm run db:migrate:deploy` locally.
 */
import { execSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const PROP_PENDING_SKIP = [
  "20260407160000_prop_yard_layer",
  "20260407173000_prop_yard_basket_minhire",
];

const migrationsDir = join(process.cwd(), "prisma", "migrations");
const names = readdirSync(migrationsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const argvPreset = process.argv.find((a) => a.startsWith("--preset="))?.slice("--preset=".length);
const positional = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const preset = argvPreset ?? positional[0] ?? null;

/** @type {Set<string>} */
let skip;
if (process.env.PRISMA_BASELINE_SKIP?.trim()) {
  skip = new Set(
    process.env.PRISMA_BASELINE_SKIP.split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
} else if (preset === "prop-pending") {
  skip = new Set(PROP_PENDING_SKIP);
} else {
  skip = new Set();
}

if (skip.size > 0) {
  console.log(`Skipping (left for migrate deploy): ${[...skip].join(", ")}\n`);
}

for (const name of names) {
  if (skip.has(name)) {
    console.log(`[skip] ${name}`);
    continue;
  }
  console.log(`prisma migrate resolve --applied "${name}"`);
  execSync(`npx prisma migrate resolve --applied "${name}"`, {
    stdio: "inherit",
    env: process.env,
    shell: true,
  });
}

if (skip.size > 0) {
  console.log(
    "\nNext: run `npm run db:migrate:deploy` (or redeploy) so Prisma applies the skipped migrations.",
  );
} else {
  console.log("\nBaseline complete. `prisma migrate deploy` will only run newer migrations.");
}
