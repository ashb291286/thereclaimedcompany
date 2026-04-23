import Link from "next/link";
import type { Metadata } from "next";
import { getDealerAreaIndex } from "@/lib/dealer-area-seo";
import { getSiteBaseUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Antiques dealers UK | Find a dealer near you",
  description:
    "Search UK antiques dealers by postcode and radius, or browse dealers by town and city.",
};

export const revalidate = 1800;

export default async function DealersHubPage() {
  const areas = await getDealerAreaIndex();
  const base = getSiteBaseUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Antiques dealers UK",
    url: `${base}/dealers`,
    description:
      "Search UK antiques dealers by postcode and radius, or browse dealers by town and city.",
    about: { "@type": "Service", name: "Antiques dealers near me" },
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-900/80">Curated collections</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">Dealers near you</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-700 sm:text-base">
            Discover high-value antique and reclaimed pieces from specialist dealers. Search by postcode to browse
            dealer pieces by distance, or explore dealer profiles by area below.
          </p>
        </div>
        <div className="flex flex-col items-start">
          <Link
            href="/auth/register?sellerFlow=dealer"
            className="inline-flex rounded-lg bg-amber-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-950"
          >
            Add Your Gallery
          </Link>
          <p className="mt-2 text-xs font-medium text-zinc-600">
            showcase your unique edit of pieces
          </p>
        </div>
      </div>

      <form
        action="/search"
        method="get"
        className="mt-8 rounded-xl border border-amber-300/70 bg-gradient-to-br from-amber-50 via-white to-orange-50/50 p-5 shadow-sm ring-1 ring-amber-200/60"
      >
        <input type="hidden" name="sellerType" value="dealer" />
        <p className="text-sm font-semibold text-zinc-900">Search by postcode</p>
        <p className="mt-1 text-xs text-zinc-700">
          Opens the dealer browse experience with curated piece cards, sorted by distance from your location.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[180px] flex-1">
            <label htmlFor="dealer-hub-postcode" className="mb-1 block text-xs font-semibold text-zinc-800">
              Your postcode
            </label>
            <input
              id="dealer-hub-postcode"
              name="postcode"
              type="text"
              placeholder="e.g. M1 1AE"
              className="w-full rounded-lg border border-amber-300/80 bg-white px-3 py-2.5 text-sm font-medium text-zinc-900 placeholder:text-zinc-400"
            />
          </div>
          <div>
            <label htmlFor="dealer-hub-radius" className="mb-1 block text-xs font-semibold text-zinc-800">
              Radius
            </label>
            <select
              id="dealer-hub-radius"
              name="radius"
              defaultValue="50"
              className="rounded-lg border border-amber-300/80 bg-white px-3 py-2.5 text-sm font-medium text-zinc-900"
            >
              <option value="10">10 mi</option>
              <option value="25">25 mi</option>
              <option value="50">50 mi</option>
              <option value="100">100 mi</option>
            </select>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-amber-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-950"
          >
            Find dealers
          </button>
        </div>
      </form>

      <div className="mt-10">
        <h2 className="text-lg font-semibold text-zinc-900">Browse by area</h2>
        <p className="mt-1 text-sm text-zinc-600">Area pages update as dealers refine their public showcases.</p>
        {areas.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">Area pages will appear when dealers complete profiles.</p>
        ) : (
          <ul className="mt-4 flex flex-wrap gap-2">
            {areas.map((a) => (
              <li key={a.slug}>
                <Link
                  href={`/dealers/${a.slug}`}
                  className="inline-flex rounded-full border border-amber-200 bg-white px-3 py-1.5 text-sm text-zinc-800 transition hover:border-amber-500/60 hover:bg-amber-50"
                >
                  {a.label}
                  <span className="ml-1.5 text-zinc-500">({a.dealerCount})</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-10 text-sm text-zinc-600">
        Prefer the full filter panel?{" "}
        <Link href="/search?sellerType=dealer" className="font-medium text-brand hover:underline">
          Open browse dealers
        </Link>
        .
      </p>
    </div>
  );
}
