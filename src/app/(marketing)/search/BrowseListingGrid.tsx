import Image from "next/image";
import Link from "next/link";
import { CONDITION_LABELS } from "@/lib/constants";
import { formatUkLocationLine } from "@/lib/postcode-uk";
import { formatMiles } from "@/lib/geo";
import { buyerGrossPenceFromSellerNetPence, sellerChargesVat, vatLabelSuffix } from "@/lib/vat-pricing";
import { parseStoredCarbonImpact } from "@/lib/carbon/stored-impact";
import { CarbonBadge } from "@/components/CarbonBadge";
import { BrowseListingPriceLine } from "@/components/currency/BrowseListingPriceLine";
import type { SearchListingRow } from "@/lib/listing-search";

function auctionCountdownLabel(endsAt: Date | null): string | null {
  if (!endsAt) return null;
  const ms = endsAt.getTime() - Date.now();
  if (ms <= 0) return "Ended";
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days >= 1) return `${days}d ${hours}h left`;
  if (hours >= 1) return `${hours}h ${minutes}m left`;
  return `${Math.max(1, minutes)}m left`;
}

export function BrowseListingGrid({
  listings,
  /** Default: grid only from `md` up (mobile uses swipe feed elsewhere). */
  visibility = "md-only",
  className,
}: {
  listings: SearchListingRow[];
  visibility?: "md-only" | "always";
  className?: string;
}) {
  const layoutClass =
    visibility === "always"
      ? "mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
      : "mt-6 hidden gap-4 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5";
  return (
    <ul className={[layoutClass, className].filter(Boolean).join(" ")}>
      {listings.map((l) => {
        const impact = parseStoredCarbonImpact(l);
        const auctionCountdown = l.listingKind === "auction" ? auctionCountdownLabel(l.auctionEndsAt) : null;
        const gridVat = sellerChargesVat({
          sellerRole: l.seller.role,
          vatRegistered: l.seller.sellerProfile?.vatRegistered,
        });
        const gridBuyerPence = buyerGrossPenceFromSellerNetPence(l.price, gridVat);
        const gridVatBit = vatLabelSuffix(gridVat);
        return (
          <li key={l.id}>
            <Link
              href={`/listings/${l.id}`}
              className="block overflow-hidden rounded-xl border border-zinc-200 bg-white transition-colors hover:border-brand/40"
            >
              <div className="relative aspect-square bg-zinc-200">
                {auctionCountdown ? (
                  <span className="absolute right-2 top-2 z-10 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                    {auctionCountdown}
                  </span>
                ) : null}
                {l.images[0] ? (
                  <Image
                    src={l.images[0]}
                    alt={l.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-zinc-400">No image</div>
                )}
              </div>
              <div className="p-3">
                <div className="mb-1 flex min-h-[18px] flex-wrap content-start items-start gap-1">
                  {l.listingKind === "auction" && (
                    <span className="rounded bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold uppercase text-brand">
                      Auction
                    </span>
                  )}
                  {l.listingKind === "sell" && l.freeToCollector && (
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-900">
                      Free
                    </span>
                  )}
                  {l.offersDelivery && (
                    <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-sky-900">
                      Delivers
                    </span>
                  )}
                  {l.distanceMiles != null && (
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-700">
                      {formatMiles(l.distanceMiles)}
                    </span>
                  )}
                  {l.seller.sellerProfile?.salvoCodeMember ? (
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-900">
                      Salvo Code Member
                    </span>
                  ) : null}
                </div>
                <p className="truncate font-medium text-zinc-900">{l.title}</p>
                <BrowseListingPriceLine
                  listingKind={l.listingKind}
                  freeToCollector={l.freeToCollector}
                  buyerPenceGbp={gridBuyerPence}
                  vatSuffix={gridVatBit}
                  categoryName={l.category.name}
                  conditionExtra={l.condition ? ` · ${CONDITION_LABELS[l.condition]}` : ""}
                />
                {(() => {
                  const locLine = formatUkLocationLine({
                    postcodeLocality: l.postcodeLocality,
                    adminDistrict: l.adminDistrict,
                    region: l.region,
                    postcode: l.postcode,
                  });
                  return locLine ? <p className="mt-1 truncate text-xs text-zinc-500">{locLine}</p> : null;
                })()}
                {impact ? (
                  <div className="mt-2">
                    <CarbonBadge impact={impact} variant="compact" />
                  </div>
                ) : null}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
