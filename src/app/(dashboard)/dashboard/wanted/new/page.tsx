import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createWantedAd } from "@/lib/actions/wanted";

export default async function NewWantedPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const { error } = await searchParams;

  const categories = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <Link href="/dashboard/wanted" className="text-sm text-amber-700 hover:underline">
        ← Wanted ads
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-zinc-900">Post a wanted ad</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Sellers and reclamation yards with matching listings get an in-site notification so they can post an item with a price.
      </p>
      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
      <form action={createWantedAd} className="mt-8 max-w-xl space-y-4">
        <div>
          <label htmlFor="title" className="mb-1 block text-sm font-medium text-zinc-700">
            Title
          </label>
          <input
            id="title"
            name="title"
            required
            placeholder="e.g. Victorian encaustic tiles — blue & white"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="description" className="mb-1 block text-sm font-medium text-zinc-700">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={5}
            required
            placeholder="Sizes, quantity, era, condition, photos you’ve seen elsewhere…"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="categoryId" className="mb-1 block text-sm font-medium text-zinc-700">
            Category (optional — narrows who we notify)
          </label>
          <select id="categoryId" name="categoryId" className="w-full rounded-lg border border-zinc-300 px-3 py-2">
            <option value="">Any / not sure</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="budgetMax" className="mb-1 block text-sm font-medium text-zinc-700">
              Max budget (£, optional)
            </label>
            <input
              id="budgetMax"
              name="budgetMax"
              type="number"
              step="0.01"
              min="0"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="postcode" className="mb-1 block text-sm font-medium text-zinc-700">
              Postcode (optional)
            </label>
            <input
              id="postcode"
              name="postcode"
              type="text"
              placeholder="e.g. BS1"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2"
            />
          </div>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700"
        >
          Publish wanted ad
        </button>
      </form>
    </div>
  );
}
