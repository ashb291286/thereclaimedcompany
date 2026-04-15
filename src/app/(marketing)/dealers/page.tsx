import Link from "next/link";
import type { Metadata } from "next";
import { getDealerAreaIndex } from "@/lib/dealer-area-seo";

export const metadata: Metadata = {
  title: "Antiques dealers UK | Find a dealer near you",
  description:
    "Search UK antiques dealers by postcode and radius, or browse dealers by town and city.",
};

export const revalidate = 1800;

export default async function DealersHubPage() {
  const areas = await getDealerAreaIndex();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">Dealers near you</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600 sm:text-base">
        Enter your postcode to see antiques dealer listings sorted by distance, or explore dealer profiles
        by area below.
      </p>

      <form
        action="/search"
        method="get"
        className="mt-8 rounded-xl border-2 border-brand bg-brand-soft/50 p-5 shadow-sm ring-1 ring-brand/15"
      >
        <input type="hidden" name="sellerType" value="dealer" />
        <p className="text-sm font-semibold text-zinc-900">Search by postcode</p>
        <p className="mt-1 text-xs text-zinc-700">
          Matches the marketplace dealer view and sorts results by distance from your location.
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
              className="w-full rounded-lg border-2 border-brand/40 bg-white px-3 py-2.5 text-sm font-medium text-zinc-900 placeholder:text-zinc-400"
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
              className="rounded-lg border-2 border-brand/40 bg-white px-3 py-2.5 text-sm font-medium text-zinc-900"
            >
              <option value="10">10 mi</option>
              <option value="25">25 mi</option>
              <option value="50">50 mi</option>
              <option value="100">100 mi</option>
            </select>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover"
          >
            Find dealers
          </button>
        </div>
      </form>

      <div className="mt-10">
        <h2 className="text-lg font-semibold text-zinc-900">Browse by area</h2>
        <p className="mt-1 text-sm text-zinc-600">Area pages update as dealers complete their profiles.</p>
        {areas.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">Area pages will appear when dealers complete profiles.</p>
        ) : (
          <ul className="mt-4 flex flex-wrap gap-2">
            {areas.map((a) => (
              <li key={a.slug}>
                <Link
                  href={`/dealers/${a.slug}`}
                  className="inline-flex rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-800 transition hover:border-brand/40 hover:bg-brand-soft/40"
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
