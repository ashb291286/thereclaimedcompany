import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Blog",
  description: "News, guides, and updates from Reclaimed Marketplace.",
};

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: rawQ } = await searchParams;
  const q = rawQ?.trim() ?? "";
  const posts = await prisma.blogPost.findMany({
    where: {
      published: true,
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { excerpt: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: 50,
    select: { id: true, title: true, slug: true, excerpt: true, featuredImageUrl: true, publishedAt: true, createdAt: true },
  });

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">Blog</h1>
      <p className="mt-2 text-sm text-zinc-600">Updates, guides, and reclaimed marketplace insights.</p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
        <aside className="lg:sticky lg:top-24">
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-zinc-900">Search posts</h2>
            <form action="/blog" className="mt-3 space-y-3">
              <div>
                <label htmlFor="blog-q" className="mb-1 block text-xs font-medium text-zinc-700">
                  Keyword
                </label>
                <input
                  id="blog-q"
                  name="q"
                  defaultValue={q}
                  placeholder="e.g. salvage, timber, guides"
                  className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
              >
                Search
              </button>
              <Link
                href="/blog"
                className="block w-full rounded-lg border border-zinc-300 px-4 py-2 text-center text-sm font-medium text-zinc-800 hover:bg-zinc-50"
              >
                Clear
              </Link>
            </form>
          </div>
        </aside>

        <section>
          <p className="text-sm text-zinc-500">{posts.length} post{posts.length === 1 ? "" : "s"} found</p>
          {posts.length === 0 ? (
            <p className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600">
              No posts matched your search.
            </p>
          ) : (
            <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {posts.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/blog/${p.slug}`}
                    className="block h-full overflow-hidden rounded-xl border border-zinc-200 bg-white transition hover:border-brand/40"
                  >
                    {p.featuredImageUrl ? (
                      <div className="relative aspect-[4/3] w-full bg-zinc-100">
                        <Image
                          src={p.featuredImageUrl}
                          alt={p.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                          unoptimized
                        />
                      </div>
                    ) : null}
                    <div className="p-4">
                      <p className="font-semibold text-zinc-900">{p.title}</p>
                      {p.excerpt ? <p className="mt-1 line-clamp-2 text-sm text-zinc-600">{p.excerpt}</p> : null}
                      <p className="mt-2 text-xs text-zinc-500">
                        {(p.publishedAt ?? p.createdAt).toISOString().slice(0, 10)}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
