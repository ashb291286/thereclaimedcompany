import Link from "next/link";
import Image from "next/image";
import { formatMiles } from "@/lib/geo";
import type { RelatedYardCard } from "@/lib/related-yards";

export function YardMaterialPillsSection({
  categories,
  yardPostcode,
}: {
  categories: { id: string; name: string; slug: string }[];
  yardPostcode: string;
}) {
  if (categories.length === 0) return null;
  return (
    <section aria-labelledby="materials-heading" className="mt-10">
      <h2 id="materials-heading" className="text-lg font-semibold text-zinc-900">
        Stock specialisms
      </h2>
      <p className="mt-1 text-sm text-zinc-500">Jump to marketplace search for this yard type and area.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/search?sellerType=reclamation_yard&category=${encodeURIComponent(c.slug)}&postcode=${encodeURIComponent(yardPostcode)}&radius=50`}
            className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 shadow-sm hover:border-brand/40 hover:text-brand"
          >
            {c.name}
          </Link>
        ))}
      </div>
    </section>
  );
}

export function YardRelatedYardsSection({ yards }: { yards: RelatedYardCard[] }) {
  if (yards.length === 0) return null;
  return (
    <section aria-labelledby="related-yards-heading" className="mt-12 border-t border-zinc-200 pt-10">
      <h2 id="related-yards-heading" className="text-lg font-semibold text-zinc-900">
        Other yards you may like
      </h2>
      <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
        {yards.map((y) => (
          <Link
            key={y.slug}
            href={`/yards/${y.slug}`}
            className="flex w-56 shrink-0 gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm hover:border-brand/40"
          >
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
              {y.logoUrl ? (
                <Image src={y.logoUrl} alt="" fill className="object-contain p-0.5" sizes="56px" />
              ) : (
                <div className="flex h-full items-center justify-center text-[10px] text-zinc-400">Yard</div>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium text-zinc-900">{y.displayTitle}</p>
              <p className="truncate text-xs text-zinc-500">{y.placeLine || y.postcode}</p>
              {y.distanceMiles != null ? (
                <p className="text-xs text-brand">{formatMiles(y.distanceMiles)} away</p>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
