import { prisma } from "@/lib/db";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wanted ads",
  description:
    "Post what reclaimed stock you need, or browse active wanted ads from buyers across the UK. Sellers and reclamation yards can respond with listings.",
};

export default async function WantedListPage() {
  const ads = await prisma.wantedAd.findMany({
    where: { status: "active" },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { category: true },
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <section className="relative overflow-hidden rounded-2xl border border-brand/25 bg-gradient-to-br from-brand-soft via-white to-sky-50/90 px-5 py-8 shadow-sm sm:px-8 sm:py-10">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand/10 blur-2xl"
          aria-hidden
        />
        <p className="text-xs font-semibold uppercase tracking-widest text-brand">Reclaimed marketplace</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">Wanted ads</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-700 sm:text-base">
          Buyers say exactly what they need — timber, ironmongery, doors, stone, and more. Sellers and yards see live
          wanted ads and can list matching stock with photos and a price. Posting a wanted ad helps the right people
          find you faster than browsing alone.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dashboard/wanted/new"
            className="inline-flex rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover"
          >
            Post a wanted ad
          </Link>
          <Link
            href="/search"
            className="inline-flex rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-800 hover:border-zinc-400 hover:bg-zinc-50"
          >
            Browse listings
          </Link>
        </div>
        <p className="mt-4 text-xs text-zinc-600">
          Posting requires a free account —{" "}
          <Link href="/auth/signin" className="font-medium text-brand hover:underline">
            sign in
          </Link>{" "}
          or{" "}
          <Link href="/auth/register" className="font-medium text-brand hover:underline">
            register
          </Link>
          .
        </p>
      </section>

      <h2 className="mt-10 text-lg font-semibold text-zinc-900">Active wanted ads</h2>
      <p className="mt-1 text-sm text-zinc-600">Newest first. Open an ad for full details.</p>

      {ads.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 px-5 py-10 text-center">
          <p className="text-sm font-medium text-zinc-800">No active wanted ads yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600">
            Be the first to ask the network for specific reclaimed materials — yards and sellers often have stock that
            never makes it to a public listing until someone asks.
          </p>
          <Link
            href="/dashboard/wanted/new"
            className="mt-5 inline-flex rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover"
          >
            Post the first wanted ad
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {ads.map((w) => (
            <li key={w.id}>
              <Link
                href={`/wanted/${w.id}`}
                className="block rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-brand/40"
              >
                <p className="font-medium text-zinc-900">{w.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-zinc-600">{w.description}</p>
                <p className="mt-2 text-xs text-zinc-500">
                  {w.category?.name ?? "Any category"}
                  {w.budgetMaxPence != null && ` · up to £${(w.budgetMaxPence / 100).toFixed(2)}`}
                  {w.postcode && ` · ${w.postcode}`}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
