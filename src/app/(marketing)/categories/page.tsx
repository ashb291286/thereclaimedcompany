import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Browse by category | Reclaimed building materials",
  description:
    "Explore reclaimed bricks, timber, roof tiles, doors, and more — curated categories for salvage and reuse across the UK.",
};

export default async function CategoriesIndexPage() {
  const categories = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: { name: "asc" },
    select: { name: true, slug: true },
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <nav className="mb-6 text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-800">
          Home
        </Link>
        <span className="mx-2 text-zinc-300">/</span>
        <span className="font-medium text-zinc-700">Categories</span>
      </nav>
      <h1 className="text-2xl font-semibold text-zinc-900">Browse by category</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600">
        Each category page lists active marketplace items you can refine further with postcode, radius, and keywords
        from the main search.
      </p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {categories.map((c) => (
          <li key={c.slug}>
            <Link
              href={`/categories/${c.slug}`}
              className="block rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-900 shadow-sm transition hover:border-brand/40 hover:text-brand"
            >
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
