import Link from "next/link";
import type { Metadata } from "next";
import { getYardAreaIndex } from "@/lib/yard-area-seo";
import { getSiteBaseUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Reclamation yards UK | Find a yard near you",
  description:
    "Search UK reclamation yards by postcode and radius, or browse yards by town and city. Salvage, reclaimed materials, and architectural salvage near you.",
};

export const revalidate = 1800;

export default async function ReclamationYardsHubPage() {
  const areas = await getYardAreaIndex();
  const base = getSiteBaseUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Reclamation yards UK",
    url: `${base}/reclamation-yards`,
    description:
      "Search UK reclamation yards by postcode and radius, or browse yards by town and city.",
    about: { "@type": "Service", name: "Reclamation yards near me" },
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
        Reclamation yards near you
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600 sm:text-base">
        Enter your postcode to see yard stock sorted by distance, or explore reclamation yards we list
        by area below.
      </p>

      <form
        action="/search"
        method="get"
        className="mt-8 rounded-xl border-2 border-brand bg-brand-soft/50 p-5 shadow-sm ring-1 ring-brand/15"
      >
        <input type="hidden" name="sellerType" value="reclamation_yard" />
        <p className="text-sm font-semibold text-zinc-900">Search by postcode</p>
        <p className="mt-1 text-xs text-zinc-700">
          Matches the marketplace “yards” view — ideal for local salvage and reclaimed stock.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[180px] flex-1">
            <label htmlFor="hub-postcode" className="mb-1 block text-xs font-semibold text-zinc-800">
              Your postcode
            </label>
            <input
              id="hub-postcode"
              name="postcode"
              type="text"
              placeholder="e.g. M1 1AE"
              className="w-full rounded-lg border-2 border-brand/40 bg-white px-3 py-2.5 text-sm font-medium text-zinc-900 placeholder:text-zinc-400"
            />
          </div>
          <div>
            <label htmlFor="hub-radius" className="mb-1 block text-xs font-semibold text-zinc-800">
              Radius
            </label>
            <select
              id="hub-radius"
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
            Find yards
          </button>
        </div>
      </form>

      <div className="mt-10">
        <h2 className="text-lg font-semibold text-zinc-900">Browse by area</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Pages update as yards join — each area lists reclamation yards with a public profile.
        </p>
        {areas.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">Area pages will appear when yards complete their profiles.</p>
        ) : (
          <ul className="mt-4 flex flex-wrap gap-2">
            {areas.map((a) => (
              <li key={a.slug}>
                <Link
                  href={`/reclamation-yards/${a.slug}`}
                  className="inline-flex rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-800 transition hover:border-brand/40 hover:bg-brand-soft/40"
                >
                  {a.label}
                  <span className="ml-1.5 text-zinc-500">({a.yardCount})</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-10 text-sm text-zinc-600">
        Prefer the full filter panel?{" "}
        <Link href="/reclamation-yards" className="font-medium text-brand hover:underline">
          Open browse yards
        </Link>
        .
      </p>
    </div>
  );
}
