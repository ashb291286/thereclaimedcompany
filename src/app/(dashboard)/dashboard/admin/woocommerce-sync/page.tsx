import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { isCarbonAdmin } from "@/lib/admin";
import { isWooCommerceConfigured } from "@/lib/woocommerce-rest";
import {
  updateCategoryWooSyncAction,
  resyncWooCommerceListingsAction,
} from "@/lib/actions/woocommerce-admin";

export default async function AdminWooCommerceSyncPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; bulk?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  if (!isCarbonAdmin(session)) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950">
        You don&apos;t have access. Add your email to{" "}
        <code className="rounded bg-amber-100 px-1">ADMIN_EMAILS</code>.
      </div>
    );
  }

  const { ok, error, bulk } = await searchParams;
  const configured = isWooCommerceConfigured();

  const categories = await prisma.category.findMany({
    orderBy: [{ parentId: "asc" }, { name: "asc" }],
    include: { parent: { select: { name: true } } },
  });

  const syncedCount = await prisma.listing.count({
    where: { wooCommerceProductId: { not: null } },
  });

  return (
    <div>
      <p className="mb-4 text-sm text-zinc-600">
        Need a new browse category first?{" "}
        <Link href="/dashboard/admin/marketplace-categories" className="font-medium text-brand hover:underline">
          Add marketplace categories
        </Link>
        .
      </p>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">WooCommerce affiliate sync</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-600">
            For each marketplace category, you can turn on sync and set the{" "}
            <strong className="font-medium text-zinc-800">WooCommerce product category ID</strong> (numeric term
            id from WooCommerce). When a seller publishes an <strong className="font-medium text-zinc-800">active</strong>,{" "}
            <strong className="font-medium text-zinc-800">marketplace-visible</strong> listing in that category, we create
            or update an <strong className="font-medium text-zinc-800">external</strong> product on your shop that links
            buyers to the listing URL on this site (affiliate-style).
          </p>
        </div>
        <Link href="/dashboard" className="text-sm font-medium text-brand hover:underline">
          Dashboard
        </Link>
      </div>

      {!configured ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">WooCommerce API not configured</p>
          <p className="mt-1 text-amber-900/90">
            Set <code className="rounded bg-amber-100 px-1">WOOCOMMERCE_SITE_URL</code>,{" "}
            <code className="rounded bg-amber-100 px-1">WOOCOMMERCE_CONSUMER_KEY</code>, and{" "}
            <code className="rounded bg-amber-100 px-1">WOOCOMMERCE_CONSUMER_SECRET</code> (REST API keys from
            WooCommerce → Settings → Advanced → REST API). Sync will no-op until these are present.
          </p>
        </div>
      ) : (
        <p className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          API credentials detected. Listing URLs use <code className="rounded bg-emerald-100 px-1">NEXTAUTH_URL</code> /{" "}
          <code className="rounded bg-emerald-100 px-1">VERCEL_URL</code> via{" "}
          <code className="rounded bg-emerald-100 px-1">getSiteBaseUrl()</code> — ensure production URL is correct.
        </p>
      )}

      {ok ? (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Category mapping saved.
        </p>
      ) : null}
      {bulk != null ? (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Re-sync requested for {bulk} listing(s). Check WooCommerce and any{" "}
          <code className="rounded bg-emerald-100 px-1">wooCommerceLastError</code> fields if products are missing.
        </p>
      ) : null}
      {error ? (
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>
      ) : null}

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4">
        <p className="text-sm text-zinc-700">
          <span className="font-medium text-zinc-900">{syncedCount}</span> listing(s) currently have a WooCommerce
          product id stored.
        </p>
        <form action={resyncWooCommerceListingsAction}>
          <button
            type="submit"
            disabled={!configured}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Re-sync eligible listings
          </button>
        </form>
      </div>

      <ul className="space-y-3">
        {categories.map((c) => (
          <li key={c.id} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <form action={updateCategoryWooSyncAction} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <input type="hidden" name="categoryId" value={c.id} />
              <div className="min-w-0 flex-1 sm:max-w-md">
                <p className="text-xs font-medium text-zinc-500">Marketplace category</p>
                <p className="font-medium text-zinc-900">
                  {c.name}
                  {c.parent ? (
                    <span className="font-normal text-zinc-500"> · under {c.parent.name}</span>
                  ) : null}
                </p>
                <p className="text-xs text-zinc-400">{c.slug}</p>
              </div>
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  name="wooCommerceSyncEnabled"
                  defaultChecked={c.wooCommerceSyncEnabled}
                  className="rounded border-zinc-300"
                />
                Sync to WooCommerce
              </label>
              <label className="min-w-[200px] text-sm">
                <span className="text-zinc-600">WooCommerce category ID</span>
                <input
                  name="wooCommerceCategoryId"
                  type="number"
                  min={1}
                  step={1}
                  placeholder="e.g. 42"
                  defaultValue={c.wooCommerceCategoryId ?? ""}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2"
                />
              </label>
              <button
                type="submit"
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Save
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
