import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { isCarbonAdmin } from "@/lib/admin";
import {
  createMarketplaceCategoryAction,
  updateMarketplaceCategoryAction,
} from "@/lib/actions/category-admin";

export default async function AdminMarketplaceCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; updated?: string; error?: string }>;
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

  const { created, updated, error } = await searchParams;

  const categories = await prisma.category.findMany({
    orderBy: [{ parentId: "asc" }, { name: "asc" }],
    include: { parent: { select: { id: true, name: true } } },
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Marketplace categories</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-600">
            Add categories that appear when sellers list items. Optional parent creates a subcategory.
            URL slugs are generated from the name unless you override them. To map a category to WooCommerce
            affiliate products, use{" "}
            <Link href="/dashboard/admin/woocommerce-sync" className="font-medium text-brand hover:underline">
              WooCommerce sync
            </Link>{" "}
            or{" "}
            <Link href="/dashboard/admin/bulk-listings" className="font-medium text-brand hover:underline">
              bulk listing CSV (admin)
            </Link>
            .
          </p>
        </div>
        <Link href="/dashboard" className="text-sm font-medium text-brand hover:underline">
          Dashboard
        </Link>
      </div>

      {created ? (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Category created.
        </p>
      ) : null}
      {updated ? (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Category updated.
        </p>
      ) : null}
      {error ? (
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>
      ) : null}

      <section className="mb-10 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Add category</h2>
        <form action={createMarketplaceCategoryAction} className="mt-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="min-w-[200px] flex-1 text-sm">
            <span className="text-zinc-600">Display name</span>
            <input
              name="name"
              required
              maxLength={120}
              placeholder="e.g. Cast iron radiators"
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2"
            />
          </label>
          <label className="min-w-[180px] text-sm">
            <span className="text-zinc-600">Slug (optional)</span>
            <input
              name="slug"
              maxLength={96}
              placeholder="auto from name"
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 font-mono text-sm"
            />
          </label>
          <label className="min-w-[200px] text-sm">
            <span className="text-zinc-600">Parent (optional)</span>
            <select
              name="parentId"
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2"
              defaultValue=""
            >
              <option value="">— Top level —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.parent ? `${c.parent.name} › ${c.name}` : c.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Create category
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">All categories</h2>
        <ul className="mt-3 divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
          {categories.map((c) => (
            <li key={c.id} className="px-4 py-3 text-sm">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="font-medium text-zinc-900">{c.name}</span>
                <span className="font-mono text-xs text-zinc-400">{c.slug}</span>
              </div>
              <div className="mb-3 text-xs text-zinc-500">
                Parent: {c.parent ? c.parent.name : "Top level"} ·{" "}
                {c.wooCommerceSyncEnabled ? (
                  <span className="text-emerald-700">Woo sync · WC cat {c.wooCommerceCategoryId ?? "—"}</span>
                ) : (
                  <span>No WooCommerce sync</span>
                )}{" "}
              </div>
              <div>
                <form action={updateMarketplaceCategoryAction} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                  <input type="hidden" name="id" value={c.id} />
                  <label className="min-w-[180px] flex-1 text-sm">
                    <span className="text-zinc-600">Name</span>
                    <input
                      name="name"
                      required
                      maxLength={120}
                      defaultValue={c.name}
                      className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2"
                    />
                  </label>
                  <label className="min-w-[220px] text-sm">
                    <span className="text-zinc-600">Parent</span>
                    <select
                      name="parentId"
                      className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2"
                      defaultValue={c.parentId ?? ""}
                    >
                      <option value="">— Top level —</option>
                      {categories
                        .filter((opt) => opt.id !== c.id)
                        .map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.parent ? `${opt.parent.name} › ${opt.name}` : opt.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <button
                    type="submit"
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                  >
                    Save
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
