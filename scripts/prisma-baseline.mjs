/**
 * One-time production fix for P3005 ("database schema is not empty"):
 * marks every folder in prisma/migrations as already applied without running SQL.
 *
 * Use only when the live database already matches those migrations (e.g. it was
 * created with db push or manual SQL). Set DATABASE_URL to production, then:
 *   npm run db:baseline
 *
 * After that you can switch the build script back to `prisma migrate deploy` if you want
 * deploy-time migrations instead of db push.
 */
import { execSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const migrationsDir = join(process.cwd(), "prisma", "migrations");
const names = readdirSync(migrationsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

for (const name of names) {
  console.log(`prisma migrate resolve --applied "${name}"`);
  execSync(`npx prisma migrate resolve --applied "${name}"`, {
    stdio: "inherit",
    env: process.env,
    shell: true,
  });
}

console.log("\nBaseline complete. `prisma migrate deploy` will only run newer migrations.");
