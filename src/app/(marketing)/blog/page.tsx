import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Blog",
  description: "News, guides, and updates from Reclaimed Marketplace.",
};

export default async function BlogIndexPage() {
  const posts = await prisma.blogPost.findMany({
    where: { published: true },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: 50,
    select: { id: true, title: true, slug: true, excerpt: true, publishedAt: true, createdAt: true },
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">Blog</h1>
      <p className="mt-2 text-sm text-zinc-600">Updates, guides, and reclaimed marketplace insights.</p>

      {posts.length === 0 ? (
        <p className="mt-8 rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600">No posts yet.</p>
      ) : (
        <ul className="mt-8 space-y-3">
          {posts.map((p) => (
            <li key={p.id}>
              <Link
                href={`/blog/${p.slug}`}
                className="block rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-brand/40"
              >
                <p className="font-semibold text-zinc-900">{p.title}</p>
                {p.excerpt ? <p className="mt-1 line-clamp-2 text-sm text-zinc-600">{p.excerpt}</p> : null}
                <p className="mt-2 text-xs text-zinc-500">
                  {(p.publishedAt ?? p.createdAt).toISOString().slice(0, 10)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
